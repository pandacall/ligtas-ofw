/**
 * handleTurn: the Core entry point for a Bantatay chat turn (ADR-0005).
 *
 * Wires the deterministic pre-router (router.ts), the Router LLM's retry/degrade safety net,
 * the Advisor KB, and the two existing engines — checkAgency and scanPost — into a single
 * renderable result. Everything HTTP is injected, exactly as scan.ts does it; this file has
 * no fetch (scripts/check-core-boundary.ts enforces that).
 *
 * The invariant this file is responsible for: a verdict only ever reaches the user by way of
 * checkAgency or scanPost. The Router picks a branch and writes a lead-in sentence; it never
 * decides an outcome, and its lead-in is guarded to carry no numbers (chat-route.ts).
 */
import type { KbEntry } from "./advisor-kb";
import {
  ChatRoute,
  FALLBACK_REPLY,
  ROUTER_SYSTEM_PROMPT,
  toSafeRoute,
  type RouterClient,
  type RouterMessage,
} from "./chat-route";
import { ROUTER_UNAVAILABLE_COPY } from "./copy";
import type { QuotaCheckResult } from "./quota";
import { checkAgency, type RegistryState, type RegistryVerdictResult } from "./registry";
import { routeTurn, type ChatTurnInput, type QuickAction } from "./router";
import { scanPost, type ExtractorClient, type ScanInput, type ScanResult } from "./scan";

export type { ChatTurnInput, QuickAction };

/**
 * Budget consumers are injected rather than called directly so the Surface keeps ownership of
 * quota policy (as scan/actions.ts already does), while Core decides WHICH budget a given
 * turn should draw from: vision extraction and text routing are metered separately because
 * they cost wildly different amounts.
 */
export type ChatTurnDeps = {
  router: RouterClient;
  extractor: ExtractorClient;
  registryState: RegistryState;
  consumeScanBudget: () => Promise<QuotaCheckResult>;
  consumeChatBudget: () => Promise<QuotaCheckResult>;
  now?: Date;
};

export type ChatTurnResult =
  /** Nothing actionable was sent — the Surface should not render a Bantatay message at all. */
  | { kind: "empty" }
  | { kind: "advice"; reply: string; entries: KbEntry[] }
  | { kind: "out_of_scope"; reply: string }
  | { kind: "agency_check"; reply: string; query: string; registry: RegistryVerdictResult }
  | { kind: "scan"; reply: string; result: ScanResult }
  /**
   * The chat routing budget is spent, or the Router failed twice. Deliberately distinct from
   * ScanResult's quota_exhausted: the deterministic paths still work, so the Surface points
   * the user at the chips rather than at tomorrow.
   */
  | { kind: "router_unavailable"; reply: string };

type RouterCallResult = { ok: true; value: ChatRoute } | { ok: false; error: string };

async function callRouter(router: RouterClient, messages: RouterMessage[]): Promise<RouterCallResult> {
  let raw: unknown;
  try {
    raw = await router(messages);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const parsed = ChatRoute.safeParse(raw);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: parsed.error.message };
}

/**
 * Retry once with the error appended, then give up — the same shape as runExtractor, and for
 * the same reason: a third attempt costs budget we do not have, and a guessed route is worse
 * than an honest "I did not understand that."
 */
export async function runRouter(text: string, router: RouterClient): Promise<ChatRoute | null> {
  const messages: RouterMessage[] = [
    { role: "system", content: ROUTER_SYSTEM_PROMPT },
    { role: "user", content: text },
  ];

  const first = await callRouter(router, messages);
  if (first.ok) return first.value;

  const second = await callRouter(router, [
    ...messages,
    {
      role: "user",
      content: `Your previous response was rejected: ${first.error}. Return corrected JSON matching the schema exactly.`,
    },
  ]);
  return second.ok ? second.value : null;
}

function scanInputFor(input: ChatTurnInput): ScanInput | null {
  if (input.imageDataUrl) {
    return { kind: "image", dataUrl: input.imageDataUrl };
  }
  const text = input.text?.trim();
  return text ? { kind: "text", text } : null;
}

/** Runs the scan behind its own budget; an exhausted budget never reaches the provider. */
async function runScan(input: ChatTurnInput, reply: string, deps: ChatTurnDeps): Promise<ChatTurnResult> {
  const scanInput = scanInputFor(input);
  if (!scanInput) {
    return { kind: "empty" };
  }

  const quota = await deps.consumeScanBudget();
  if (quota.kind !== "ok") {
    return { kind: "scan", reply, result: { kind: quota.kind } };
  }

  const result = await scanPost(scanInput, {
    extractor: deps.extractor,
    registryState: deps.registryState,
    now: deps.now,
  });
  return { kind: "scan", reply, result };
}

/** The registry lookup costs no LLM call, so it needs no budget check. */
function runAgencyCheck(query: string, reply: string, deps: ChatTurnDeps): ChatTurnResult {
  return {
    kind: "agency_check",
    reply,
    query,
    registry: checkAgency(query, deps.registryState, deps.now),
  };
}

export async function handleTurn(input: ChatTurnInput, deps: ChatTurnDeps): Promise<ChatTurnResult> {
  const decision = routeTurn(input);

  switch (decision.kind) {
    case "empty":
      return { kind: "empty" };

    case "advice":
      return { kind: "advice", reply: "", entries: decision.kbEntries };

    case "agency_check":
      return runAgencyCheck(decision.query, "", deps);

    case "scan_post":
      return runScan(input, "", deps);

    case "needs_router":
      break;
  }

  // Only genuinely ambiguous turns get this far, and only these spend a routing call.
  const chatQuota = await deps.consumeChatBudget();
  if (chatQuota.kind !== "ok") {
    return { kind: "router_unavailable", reply: ROUTER_UNAVAILABLE_COPY };
  }

  const route = await runRouter(input.text ?? "", deps.router);
  if (route === null) {
    return { kind: "router_unavailable", reply: ROUTER_UNAVAILABLE_COPY };
  }

  const safe = toSafeRoute(route);

  switch (safe.intent) {
    case "agency_check":
      // toSafeRoute already downgrades a nameless agency_check to out_of_scope; this keeps
      // the type honest rather than asserting that.
      return safe.agencyName
        ? runAgencyCheck(safe.agencyName, safe.reply, deps)
        : { kind: "out_of_scope", reply: FALLBACK_REPLY.out_of_scope };

    case "scan_post":
      return runScan(input, safe.reply, deps);

    case "advice":
      return { kind: "advice", reply: safe.reply, entries: safe.kbEntries };

    case "out_of_scope":
      return { kind: "out_of_scope", reply: safe.reply };
  }
}
