/**
 * Quota protection (issue #11): a per-IP sliding-window rate limit and a global daily
 * budget, both derived from the same event log (one row per consumed LLM attempt)
 * via an injected QuotaStore — no LLM/network/live DB here, matching scan.ts's ExtractorClient
 * injection style. The real Postgres-backed store lives in quota-store.ts.
 *
 * The two LLM roles are metered independently (ADR-0005): a vision extraction ('scan') and a
 * text routing call ('chat') cost wildly different amounts, and exhausting one must not
 * disable the other — the chat Surface's deterministic paths stay usable after the routing
 * budget is gone, and the Agency check never needed a model at all.
 */

/** Which LLM role a consumed event belongs to. */
export type QuotaKind = "scan" | "chat";

export type QuotaScope = { ip?: string; kind?: QuotaKind };

export type QuotaConfig = {
  dailyBudget: number;
  perIpLimit: number;
  perIpWindowMs: number;
};

export type QuotaStore = {
  countSince(scope: QuotaScope, since: Date, now: Date): Promise<number>;
  record(ip: string, now: Date, kind: QuotaKind): Promise<void>;
};

export type QuotaCheckResult = { kind: "ok" } | { kind: "rate_limited" } | { kind: "quota_exhausted" };

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function checkAndConsumeQuota(
  store: QuotaStore,
  config: QuotaConfig,
  ip: string,
  now: Date,
  kind: QuotaKind = "scan",
): Promise<QuotaCheckResult> {
  const dailyCount = await store.countSince({ kind }, startOfUtcDay(now), now);
  if (dailyCount >= config.dailyBudget) {
    return { kind: "quota_exhausted" };
  }

  const ipCount = await store.countSince({ ip, kind }, new Date(now.getTime() - config.perIpWindowMs), now);
  if (ipCount >= config.perIpLimit) {
    return { kind: "rate_limited" };
  }

  await store.record(ip, now, kind);
  return { kind: "ok" };
}
