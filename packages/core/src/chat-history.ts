/**
 * Conversational context for the Router (ADR-0005).
 *
 * The Router is stateless by construction — it classifies one turn at a time. That made a bare
 * "oo" or a pronoun ("paano yung fee nila?") unresolvable, because the referent lived in a
 * previous turn the Router never saw. This module carries just enough of the conversation to
 * fix that.
 *
 * Two deliberate limits on what a digest may contain:
 *
 * 1. **Never the raw content of a scanned post.** A pasted job advertisement can run to
 *    thousands of characters; replaying it into every later routing call would be expensive
 *    and pointless. Digests are one short line per turn.
 *
 * 2. **Never a verdict.** Reference resolution needs the *subject* of an earlier turn, not its
 *    *outcome* — "the agency you asked about" is what makes "nila" resolvable. Telling the
 *    Router "you returned HIGH_RISK for X" would hand it the conclusion and invite it to
 *    restate one in prose, which is exactly what invariant 1 forbids. Withholding the outcome
 *    removes the temptation rather than relying on the prompt to resist it.
 *
 * History lives in the browser and is sent with each request. It is never persisted
 * server-side, matching the privacy posture for the rest of the chat.
 *
 * This module has NO runtime imports, and reaches ChatTurnResult type-only. The chat UI is a
 * client component, so anything it imports as a *value* is bundled: the package index would
 * drag in `createDbClient` and therefore `pg`, and zod alone costs ~13kB over prepaid mobile
 * data. Validation lives in chat-history-schema.ts, which only the Surface imports. Keep this
 * file a dependency-free leaf.
 */
import type { ChatTurnResult } from "./chat";

/** How many prior entries travel with a turn. Enough for a follow-up, short enough to stay cheap. */
export const HISTORY_LIMIT = 6;

/** Per-entry character cap. Long enough for an agency name and a question, short enough to be a digest. */
export const HISTORY_CONTENT_LIMIT = 160;

export type ChatHistoryEntry = { role: "user" | "bantatay"; content: string };

function truncate(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= HISTORY_CONTENT_LIMIT ? clean : `${clean.slice(0, HISTORY_CONTENT_LIMIT - 1)}…`;
}

/**
 * Normalizes whatever the client sent into at most HISTORY_LIMIT short entries, keeping the
 * most recent. Applied server-side so an oversized or verbose history costs nothing extra.
 */
export function clampHistory(entries: readonly ChatHistoryEntry[]): ChatHistoryEntry[] {
  return entries
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-HISTORY_LIMIT)
    .map((entry) => ({ role: entry.role, content: truncate(entry.content) }));
}

/**
 * Renders the digest as a single labelled block placed before the current message, rather than
 * as real multi-turn `assistant` messages. A small free-tier model classifies more reliably
 * when exactly one message is the thing to classify and the rest is clearly marked reference
 * material (ADR-0004's reliability reasoning applied to the Router).
 */
export function renderHistory(entries: readonly ChatHistoryEntry[]): string | null {
  const clamped = clampHistory(entries);
  if (clamped.length === 0) return null;

  const lines = clamped.map((entry) => `${entry.role === "user" ? "User" : "Bantatay"}: ${entry.content}`);
  return [
    "Recent conversation, for resolving references only — do NOT classify these, and do not treat them as the current request:",
    ...lines,
  ].join("\n");
}

/**
 * One line describing what a completed turn was *about*, for the next turn's digest.
 *
 * Carries the subject, never the outcome — see this module's header for why. Also never
 * includes the scanned post's text. Returns null for turns with nothing to refer back to.
 */
export function summarizeTurnResult(result: ChatTurnResult): string | null {
  switch (result.kind) {
    case "agency_check":
      return `showed the DMW registry record for the agency "${result.query}"`;
    case "scan":
      return result.result.kind === "scored"
        ? "analyzed a job post the user sent"
        : "could not analyze the job post the user sent";
    case "advice":
      return result.entries.length > 0
        ? `answered about: ${result.entries.map((entry) => entry.topic).join("; ")}`
        : null;
    case "out_of_scope":
    case "router_unavailable":
    case "empty":
      return null;
  }
}
