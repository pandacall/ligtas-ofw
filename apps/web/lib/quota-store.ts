/**
 * Quota protection wiring (issue #11). apps/web depends on @ligtas-ofw/core only (never
 * @ligtas-ofw/db directly) — createDbClient is re-exported through core for exactly this.
 * getQuotaStore() is a lazily-initialized module singleton (unlike extractor-client.ts's
 * eager one) since createDbClient() opens a real Postgres connection pool.
 */
import type { QuotaConfig, QuotaStore } from "@ligtas-ofw/core";
import { createDbClient, createPostgresQuotaStore } from "@ligtas-ofw/core";

const DEFAULT_DAILY_BUDGET = 50; // matches the free-tier ceiling noted in the parent spec (#1)
const DEFAULT_RATE_LIMIT_MAX = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 10;

// Text routing is far cheaper than a vision extraction, so it gets a much larger allowance
// (ADR-0005). Most chat turns never spend from it at all — the deterministic pre-router
// resolves chips, pasted posts, and keyword-matched questions with zero LLM calls.
const DEFAULT_CHAT_DAILY_BUDGET = 500;
const DEFAULT_CHAT_RATE_LIMIT_MAX = 30;
const DEFAULT_CHAT_RATE_LIMIT_WINDOW_MINUTES = 10;

export function readQuotaConfig(): QuotaConfig {
  return {
    dailyBudget: Number(process.env.SCAN_DAILY_BUDGET ?? DEFAULT_DAILY_BUDGET),
    perIpLimit: Number(process.env.SCAN_RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT_MAX),
    perIpWindowMs: Number(process.env.SCAN_RATE_LIMIT_WINDOW_MINUTES ?? DEFAULT_RATE_LIMIT_WINDOW_MINUTES) * 60_000,
  };
}

export function readChatQuotaConfig(): QuotaConfig {
  return {
    dailyBudget: Number(process.env.CHAT_DAILY_BUDGET ?? DEFAULT_CHAT_DAILY_BUDGET),
    perIpLimit: Number(process.env.CHAT_RATE_LIMIT_MAX ?? DEFAULT_CHAT_RATE_LIMIT_MAX),
    perIpWindowMs:
      Number(process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES ?? DEFAULT_CHAT_RATE_LIMIT_WINDOW_MINUTES) * 60_000,
  };
}

let quotaStore: QuotaStore | undefined;

export function getQuotaStore(): QuotaStore {
  if (!quotaStore) {
    quotaStore = createPostgresQuotaStore(createDbClient());
  }
  return quotaStore;
}
