/**
 * Query functions backing the quota-protection store (issue #11). Kept here — not in
 * packages/core — so Core never builds raw Drizzle queries directly; it only calls these
 * high-level functions, the same relationship registry.ts already has with this package.
 */
import { and, count, eq, gte, lte } from "drizzle-orm";
import type { createDbClient } from "./client";
import { scanQuotaEvents } from "./schema";

type Db = ReturnType<typeof createDbClient>;

export async function countScanEvents(
  db: Db,
  scope: { ip?: string },
  since: Date,
  now: Date,
): Promise<number> {
  const conditions = [gte(scanQuotaEvents.createdAt, since), lte(scanQuotaEvents.createdAt, now)];
  if (scope.ip !== undefined) {
    conditions.push(eq(scanQuotaEvents.ip, scope.ip));
  }
  const rows = await db
    .select({ value: count() })
    .from(scanQuotaEvents)
    .where(and(...conditions));
  return Number(rows[0]?.value ?? 0);
}

export async function recordScanEvent(db: Db, ip: string, now: Date): Promise<void> {
  await db.insert(scanQuotaEvents).values({ ip, createdAt: now });
}

// Test-only: clears the table between integration-test cases (quota-store.test.ts).
export async function resetScanQuotaEvents(db: Db): Promise<void> {
  await db.delete(scanQuotaEvents);
}
