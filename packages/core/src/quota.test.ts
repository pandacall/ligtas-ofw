import { describe, expect, it } from "vitest";
import type { QuotaConfig, QuotaKind, QuotaStore } from "./quota";
import { checkAndConsumeQuota } from "./quota";

const CONFIG: QuotaConfig = { dailyBudget: 50, perIpLimit: 5, perIpWindowMs: 10 * 60_000 };

type FakeEvent = { ip: string; createdAt: Date; kind?: QuotaKind };

// In-memory fake store: records events as {ip, kind, createdAt} and answers countSince by
// filtering that list — no real clock or DB, matching scan.test.ts's fakeExtractor style.
// Seed events default to 'scan', mirroring the column default in packages/db's schema.
function fakeStore(seed: FakeEvent[] = []): QuotaStore & { events: FakeEvent[] } {
  const events: FakeEvent[] = seed.map((event) => ({ kind: "scan", ...event }));
  return {
    events,
    async countSince(scope, since, now) {
      return events.filter(
        (e) =>
          e.createdAt >= since &&
          e.createdAt <= now &&
          (scope.ip === undefined || e.ip === scope.ip) &&
          (scope.kind === undefined || e.kind === scope.kind),
      ).length;
    },
    async record(ip, now, kind) {
      events.push({ ip, createdAt: now, kind });
    },
  };
}

describe("checkAndConsumeQuota", () => {
  it("allows and records a scan when both the daily budget and per-IP limit have room", async () => {
    const store = fakeStore();
    const now = new Date("2026-07-27T12:00:00.000Z");
    const result = await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(result).toEqual({ kind: "ok" });
    expect(store.events).toEqual([{ ip: "1.2.3.4", createdAt: now, kind: "scan" }]);
  });

  it("returns quota_exhausted once the daily budget is spent, and does not record", async () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const seed = Array.from({ length: 50 }, (_, i) => ({
      ip: `9.9.9.${i}`,
      createdAt: new Date("2026-07-27T00:00:01.000Z"),
    }));
    const store = fakeStore(seed);
    const result = await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(result).toEqual({ kind: "quota_exhausted" });
    expect(store.events).toHaveLength(50);
  });

  it("returns rate_limited when this IP is at its per-IP window limit but the daily budget has room", async () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const seed = Array.from({ length: 5 }, () => ({
      ip: "1.2.3.4",
      createdAt: new Date("2026-07-27T11:55:00.000Z"), // 5 minutes ago — inside the 10-minute window
    }));
    const store = fakeStore(seed);
    const result = await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(result).toEqual({ kind: "rate_limited" });
    expect(store.events).toHaveLength(5);
  });

  it("does not rate_limit a different IP even when the first IP is at its window limit", async () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const seed = Array.from({ length: 5 }, () => ({
      ip: "1.2.3.4",
      createdAt: new Date("2026-07-27T11:55:00.000Z"),
    }));
    const store = fakeStore(seed);
    const result = await checkAndConsumeQuota(store, CONFIG, "5.6.7.8", now);
    expect(result).toEqual({ kind: "ok" });
    expect(store.events).toHaveLength(6);
  });

  it("a per-IP event outside the sliding window no longer counts against the limit", async () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const seed = Array.from({ length: 5 }, () => ({
      ip: "1.2.3.4",
      createdAt: new Date("2026-07-27T11:00:00.000Z"), // 60 minutes ago — outside the 10-minute window
    }));
    const store = fakeStore(seed);
    const result = await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(result).toEqual({ kind: "ok" });
  });

  it("prioritizes quota_exhausted over rate_limited when both would trigger", async () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const dailySeed = Array.from({ length: 50 }, (_, i) => ({
      ip: `9.9.9.${i}`,
      createdAt: new Date("2026-07-27T00:00:01.000Z"),
    }));
    const ipSeed = Array.from({ length: 5 }, () => ({
      ip: "1.2.3.4",
      createdAt: new Date("2026-07-27T11:55:00.000Z"),
    }));
    const store = fakeStore([...dailySeed, ...ipSeed]);
    const result = await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(result).toEqual({ kind: "quota_exhausted" });
  });

  it("resets the daily budget at UTC midnight — yesterday's events don't count toward today", async () => {
    const now = new Date("2026-07-27T00:30:00.000Z");
    const seed = Array.from({ length: 50 }, (_, i) => ({
      ip: `9.9.9.${i}`,
      createdAt: new Date("2026-07-26T23:00:00.000Z"), // yesterday (UTC)
    }));
    const store = fakeStore(seed);
    const result = await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(result).toEqual({ kind: "ok" });
  });

  it("defaults to the scan kind, so pre-chat callers are unchanged", async () => {
    const store = fakeStore();
    const now = new Date("2026-07-27T12:00:00.000Z");
    await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now);
    expect(store.events[0]?.kind).toBe("scan");
  });
});

// ADR-0005: vision extraction and text routing are metered independently. The point is that
// exhausting the cheap budget must not disable the expensive one, or vice versa.
describe("checkAndConsumeQuota — scan and chat budgets are independent", () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  const earlierToday = new Date("2026-07-27T00:00:01.000Z");

  it("an exhausted scan budget leaves the chat budget usable", async () => {
    const store = fakeStore(
      Array.from({ length: 50 }, (_, i) => ({ ip: `9.9.9.${i}`, createdAt: earlierToday, kind: "scan" as const })),
    );

    expect(await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "scan")).toEqual({ kind: "quota_exhausted" });
    expect(await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "chat")).toEqual({ kind: "ok" });
  });

  it("an exhausted chat budget leaves the scan budget usable", async () => {
    const store = fakeStore(
      Array.from({ length: 50 }, (_, i) => ({ ip: `9.9.9.${i}`, createdAt: earlierToday, kind: "chat" as const })),
    );

    expect(await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "chat")).toEqual({ kind: "quota_exhausted" });
    expect(await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "scan")).toEqual({ kind: "ok" });
  });

  it("rate-limits per IP per kind, so heavy chatting does not throttle a scan", async () => {
    const store = fakeStore(
      Array.from({ length: 5 }, () => ({
        ip: "1.2.3.4",
        createdAt: new Date("2026-07-27T11:55:00.000Z"),
        kind: "chat" as const,
      })),
    );

    expect(await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "chat")).toEqual({ kind: "rate_limited" });
    expect(await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "scan")).toEqual({ kind: "ok" });
  });

  it("records the kind it consumed", async () => {
    const store = fakeStore();
    await checkAndConsumeQuota(store, CONFIG, "1.2.3.4", now, "chat");
    expect(store.events).toEqual([{ ip: "1.2.3.4", createdAt: now, kind: "chat" }]);
  });
});
