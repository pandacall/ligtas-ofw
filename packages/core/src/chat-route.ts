/**
 * The Router: schema, prompt, and guards for Bantatay's LLM routing call (ADR-0005).
 *
 * The Router is a CLASSIFIER, not an author. Given a turn it cannot resolve deterministically,
 * it returns an intent, an optional agency name to look up, and a list of Advisor KB ids —
 * never facts of its own. This is what makes a free-tier model safe here: it cannot invent a
 * hotline number or a fee rule because the only free text it produces is a short conversational
 * lead-in, and that lead-in is forbidden from containing digits.
 *
 * Note this deliberately does NOT use native tool calling. ADR-0004 records free-tier
 * flakiness, and free-tier tool calling is unreliable; `response_format: json_schema` is the
 * same mechanism extraction already runs at 95% eval accuracy. Same trade, same safety net
 * (validate → retry once → degrade), as scan.ts.
 */
import { z } from "zod";
import { ADVISOR_KB, resolveKbIds, type KbEntry } from "./advisor-kb";

/** What the turn is asking for. Mirrors the branches handleTurn (chat.ts) can execute. */
export const ChatIntent = z.enum([
  /** Look up a named agency in the registry. */
  "agency_check",
  /** Run the job-post scan over text the user pasted. */
  "scan_post",
  /** Answer from the Advisor KB. */
  "advice",
  /** Nothing this product can help with — redirect rather than improvise. */
  "out_of_scope",
]);
export type ChatIntent = z.infer<typeof ChatIntent>;

export const ChatRoute = z.object({
  intent: ChatIntent,
  /** The agency name to look up, when intent is agency_check. Null otherwise. */
  agency_name: z.string().nullable(),
  /** Advisor KB entry ids, most relevant first. Empty unless intent is advice. */
  kb_ids: z.array(z.string()),
  /**
   * A short conversational lead-in, rendered ABOVE the deterministic card — never in place
   * of one. Must carry no facts; see MAX_REPLY_LENGTH and the no-digits guard below.
   */
  reply: z.string(),
});
export type ChatRoute = z.infer<typeof ChatRoute>;

/** Injected the same way scan.ts injects ExtractorClient — core stays HTTP-free. */
export type RouterMessage = { role: "system" | "user"; content: string };
export type RouterClient = (messages: RouterMessage[]) => Promise<unknown>;

export const MAX_REPLY_LENGTH = 200;

/**
 * Fallback lead-ins used whenever the model's own `reply` is rejected. Keyed by intent so a
 * stripped reply still reads as a sentence rather than a blank line.
 */
export const FALLBACK_REPLY: Record<ChatIntent, string> = {
  agency_check: "Hayaan mong i-check ko ito sa kopya namin ng listahan ng DMW.",
  scan_post: "Titingnan ko ang post na ito para sa mga senyales ng illegal recruitment.",
  advice: "Narito ang nahanap ko tungkol diyan.",
  out_of_scope:
    "Pasensya na, ang kaya ko lang tulungan ay ang pag-check ng recruitment agency at pagsuri ng job post. " +
    "Kung tungkol ito sa illegal recruitment, tumawag sa DMW Hotline 1348.",
};

const KB_INDEX = ADVISOR_KB.map((entry) => `- ${entry.id}: ${entry.topic}`).join("\n");

export const ROUTER_SYSTEM_PROMPT = `You are the router for LigtasOFW, a Philippine tool that checks recruitment agencies against the DMW licensed-agency registry and scans overseas job posts for illegal-recruitment red flags. The assistant persona is "Bantatay". Users write in Taglish (mixed Tagalog/English).

Your ONLY job is to classify the user's message and select supporting material. You do NOT answer questions yourself and you do NOT judge whether an agency or a post is legitimate — a deterministic rules engine does that after you.

Choose exactly one intent:
- "agency_check": the user names a recruitment agency and wants to know if it is licensed. Put the agency name in agency_name. Strip only the surrounding question ("legit ba yung", "kumusta ang", "po"), then copy the name itself EXACTLY as the user typed it — every word, number, and punctuation mark. Many real DMW-registered agencies begin with digits (for example "1010 EPHESIANS HUMAN RESOURCES INC"); dropping a leading number turns an exact registry match into a failed one. Do not tidy, expand, abbreviate, or reorder the name.
- "scan_post": the user has pasted, or is asking you to look at, the text of a job advertisement.
- "advice": the user is asking a general question about overseas work, recruitment rules, fees, visas, scams, or what to do after being scammed. Put the most relevant Advisor KB ids in kb_ids, most relevant first, at most 2.
- "out_of_scope": anything else (small talk, unrelated topics).

Advisor KB ids you may cite — use these EXACTLY, never invent one:
${KB_INDEX}

Rules for "reply":
- It is a SHORT conversational lead-in shown above the real answer. One sentence, at most ${MAX_REPLY_LENGTH} characters.
- It must contain NO DIGITS. Never write a hotline number, a peso amount, a fee cap, a date, or a license number. Every real number comes from the knowledge base or from the rules engine, never from you.
- Never state or imply a verdict. Do not say an agency is legitimate, licensed, safe, fake, or a scam. Do not say a post is safe or dangerous. You have not checked anything — the engine has not run yet.
- Write in the same language mix the user used.

Set agency_name to null and kb_ids to [] when they do not apply. Return JSON matching the provided schema exactly.`;

/** A route that has passed every guard, with kb_ids already resolved to real entries. */
export type SafeRoute = {
  intent: ChatIntent;
  agencyName: string | null;
  kbEntries: KbEntry[];
  reply: string;
};

const DIGIT = /\d/;

/**
 * The no-digits rule (ADR-0005). Every number a user might act on — 1348, a peso fee cap, a
 * license number, a sync date — must come from a KB entry's hand-written text or from a
 * deterministic card. A digit in model-authored prose means it made one up, so the whole
 * reply is discarded rather than partially trusted.
 */
export function replyIsSafe(reply: string): boolean {
  const trimmed = reply.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_REPLY_LENGTH && !DIGIT.test(trimmed);
}

/**
 * Normalizes a validated ChatRoute into something the Surface can render, dropping anything
 * the model got wrong instead of failing the turn:
 *   - an unsafe `reply` degrades to the canned FALLBACK_REPLY for that intent
 *   - hallucinated kb_ids are dropped (resolveKbIds)
 *   - an advice turn left with no resolvable entries becomes out_of_scope, because advice
 *     with nothing to cite is exactly the fabrication this design exists to prevent
 *   - an agency_check with no usable name becomes out_of_scope rather than a blank lookup
 */
export function toSafeRoute(route: ChatRoute): SafeRoute {
  const agencyName = route.agency_name?.trim() ? route.agency_name.trim() : null;
  const kbEntries = resolveKbIds(route.kb_ids);

  let intent = route.intent;
  if (intent === "advice" && kbEntries.length === 0) {
    intent = "out_of_scope";
  }
  if (intent === "agency_check" && agencyName === null) {
    intent = "out_of_scope";
  }

  const reply = replyIsSafe(route.reply) && intent === route.intent ? route.reply.trim() : FALLBACK_REPLY[intent];

  return {
    intent,
    agencyName: intent === "agency_check" ? agencyName : null,
    kbEntries: intent === "advice" ? kbEntries : [],
    reply,
  };
}
