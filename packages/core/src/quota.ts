/**
 * Quota protection (issue #11): a per-IP sliding-window rate limit and a global daily
 * scan budget, both derived from the same event log (one row per consumed scan attempt)
 * via an injected QuotaStore — no LLM/network/live DB here, matching scan.ts's ExtractorClient
 * injection style. The real Postgres-backed store lives in quota-store.ts.
 */

export type QuotaConfig = {
  dailyBudget: number;
  perIpLimit: number;
  perIpWindowMs: number;
};

export type QuotaStore = {
  countSince(scope: { ip?: string }, since: Date, now: Date): Promise<number>;
  record(ip: string, now: Date): Promise<void>;
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
): Promise<QuotaCheckResult> {
  const dailyCount = await store.countSince({}, startOfUtcDay(now), now);
  if (dailyCount >= config.dailyBudget) {
    return { kind: "quota_exhausted" };
  }

  const ipCount = await store.countSince({ ip }, new Date(now.getTime() - config.perIpWindowMs), now);
  if (ipCount >= config.perIpLimit) {
    return { kind: "rate_limited" };
  }

  await store.record(ip, now);
  return { kind: "ok" };
}
