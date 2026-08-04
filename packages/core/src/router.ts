/**
 * routeTurn: the deterministic pre-router (ADR-0005).
 *
 * Pure, synchronous, zero LLM calls. It resolves the turns whose intent is obvious from
 * structure alone — a tapped chip, an attached screenshot, a wall of pasted text, an explicit
 * keyword hit — and only falls through to the Router LLM when the intent genuinely needs
 * reading. That fall-through rate is what makes the free tier viable: the global LLM budget
 * is small (see quota.ts), so a chat that spent a call on every turn would exhaust it in
 * minutes.
 */
import { matchKbEntries, resolveKbIds, type KbEntry } from "./advisor-kb";
import type { ChatHistoryEntry } from "./chat-history";

/**
 * A chip the user tapped. Chips carry their intent explicitly, so they never cost an LLM
 * call — which also makes them the working escape hatch when the chat budget is spent
 * (chat.ts's router_unavailable path points the user back here).
 */
export type QuickAction = "scan_post" | "check_agency" | "hotlines" | "what_to_do_if_scammed" | "about";

const QUICK_ACTION_KB: Partial<Record<QuickAction, string>> = {
  hotlines: "hotlines",
  what_to_do_if_scammed: "na-scam-ano-gagawin",
  about: "what-is-ligtasofw",
};

export type ChatTurnInput = {
  text?: string;
  /** A base64 data URL, already validated by the Surface. Always means a scan. */
  imageDataUrl?: string;
  action?: QuickAction;
  /**
   * A digest of recent turns, used only to resolve references in an ambiguous turn ("oo",
   * "paano yung fee nila?"). routeTurn ignores it — the deterministic paths never need it, and
   * a turn resolved here costs no Router call regardless of how much history came with it.
   */
  history?: readonly ChatHistoryEntry[];
};

export type RouteDecision =
  | { kind: "scan_post" }
  | { kind: "agency_check"; query: string }
  | { kind: "advice"; kbEntries: KbEntry[] }
  | { kind: "empty" }
  /** Intent needs reading — spend one Router call. */
  | { kind: "needs_router" };

/**
 * Text at or above this length is treated as a pasted job post rather than a question.
 * Calibrated against starter/fixtures-posts.json, whose shortest post is comfortably above
 * this while a long-winded question stays below it. A question that overshoots still gets a
 * useful answer — the Extractor returns not_a_job_post, which is an honest response.
 */
export const SCAN_TEXT_CHARS = 220;

/**
 * Structural signals that text is an advertisement rather than a question, used to catch
 * short posts that fall under SCAN_TEXT_CHARS. Requires two independent hits so an ordinary
 * question mentioning one of these words doesn't get scanned.
 */
const JOB_POST_MARKERS = [
  /\bhiring\b/i,
  /\bwe are looking for\b/i,
  /\bapply now\b/i,
  /\bdirect hire\b/i,
  /\bno placement fee\b/i,
  /\bsalary\b/i,
  /\bsahod\b/i,
  /\bqualifications?\b/i,
  /\brequirements?\b/i,
  /\bjob (?:order|offer|vacancy)\b/i,
  /\burgent(?:ly)? (?:hiring|needed)\b/i,
  /\binterested\b.*\bpm\b/i,
  /\bwalk[- ]?in\b/i,
];

function looksLikeJobPost(text: string): boolean {
  if (text.length >= SCAN_TEXT_CHARS) return true;
  const hits = JOB_POST_MARKERS.filter((marker) => marker.test(text)).length;
  return hits >= 2;
}

export function routeTurn(input: ChatTurnInput): RouteDecision {
  // A screenshot is always a deliberate act and always means "read this post" (the same
  // reasoning as scan/actions.ts's image-wins-over-text rule, issue #9).
  if (input.imageDataUrl) {
    return { kind: "scan_post" };
  }

  if (input.action) {
    // Both content chips need text; alone they carry no subject, so the turn resolves once
    // the user actually types something.
    if (input.action === "scan_post") {
      return input.text?.trim() ? { kind: "scan_post" } : { kind: "empty" };
    }
    if (input.action === "check_agency") {
      const query = input.text?.trim();
      return query ? { kind: "agency_check", query } : { kind: "empty" };
    }
    // The rest map to a known KB id, so resolve it directly rather than by keyword.
    const kbId = QUICK_ACTION_KB[input.action];
    return { kind: "advice", kbEntries: kbId ? resolveKbIds([kbId]) : [] };
  }

  const text = input.text?.trim();
  if (!text) {
    return { kind: "empty" };
  }

  if (looksLikeJobPost(text)) {
    return { kind: "scan_post" };
  }

  const kbEntries = matchKbEntries(text);
  if (kbEntries.length > 0) {
    return { kind: "advice", kbEntries };
  }

  return { kind: "needs_router" };
}
