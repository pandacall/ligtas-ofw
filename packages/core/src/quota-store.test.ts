import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectTestDb, createDbClient, recordScanEvent, resetScanQuotaEvents, SKIP_INTEGRATION } from "@ligtas-ofw/db";
import { createPostgresQuotaStore } from "./quota-store";

// Skip/fail asymmetry (unset -> skip locally, must fail in CI) lives in @ligtas-ofw/db's test-support.ts.
describe.skipIf(SKIP_INTEGRATION)("createPostgresQuotaStore (integration)", () => {
  let db: ReturnType<typeof createDbClient>;

  beforeAll(async () => {
    db = await connectTestDb();
  });

  afterAll(async () => {
    await db?.$client.end();
  });

  beforeEach(async () => {
    await resetScanQuotaEvents(db);
  });

  it("record() inserts a row that countSince() then reports back", async () => {
    const store = createPostgresQuotaStore(db);
    const now = new Date("2026-07-27T12:00:00.000Z");

    expect(await store.countSince({}, new Date("2026-07-27T00:00:00.000Z"), now)).toBe(0);

    await store.record("1.2.3.4", now, "scan");

    expect(await store.countSince({}, new Date("2026-07-27T00:00:00.000Z"), now)).toBe(1);
  });

  it("countSince() scopes by ip when provided", async () => {
    const store = createPostgresQuotaStore(db);
    const now = new Date("2026-07-27T12:00:00.000Z");

    await store.record("1.2.3.4", now, "scan");
    await store.record("5.6.7.8", now, "scan");

    expect(await store.countSince({ ip: "1.2.3.4" }, new Date("2026-07-27T00:00:00.000Z"), now)).toBe(1);
    expect(await store.countSince({}, new Date("2026-07-27T00:00:00.000Z"), now)).toBe(2);
  });

  // ADR-0005: the two LLM roles share this table but must never share a budget.
  it("countSince() scopes by kind, keeping the scan and chat budgets separate", async () => {
    const store = createPostgresQuotaStore(db);
    const now = new Date("2026-07-27T12:00:00.000Z");
    const since = new Date("2026-07-27T00:00:00.000Z");

    await store.record("1.2.3.4", now, "scan");
    await store.record("1.2.3.4", now, "chat");
    await store.record("1.2.3.4", now, "chat");

    expect(await store.countSince({ kind: "scan" }, since, now)).toBe(1);
    expect(await store.countSince({ kind: "chat" }, since, now)).toBe(2);
    expect(await store.countSince({ ip: "1.2.3.4", kind: "chat" }, since, now)).toBe(2);
    // An unscoped count still sees everything, as it did before the column existed.
    expect(await store.countSince({}, since, now)).toBe(3);
  });

  it("recordScanEvent() defaults to the scan kind, matching the column default", async () => {
    const store = createPostgresQuotaStore(db);
    const now = new Date("2026-07-27T12:00:00.000Z");
    const since = new Date("2026-07-27T00:00:00.000Z");

    await recordScanEvent(db, "1.2.3.4", now);

    expect(await store.countSince({ kind: "scan" }, since, now)).toBe(1);
  });

  it("countSince() excludes events outside the [since, now] window", async () => {
    const store = createPostgresQuotaStore(db);
    await recordScanEvent(db, "1.2.3.4", new Date("2026-07-27T11:00:00.000Z")); // outside window
    await recordScanEvent(db, "1.2.3.4", new Date("2026-07-27T11:55:00.000Z")); // inside window

    const count = await store.countSince(
      { ip: "1.2.3.4" },
      new Date("2026-07-27T11:50:00.000Z"),
      new Date("2026-07-27T12:00:00.000Z"),
    );
    expect(count).toBe(1);
  });
});
