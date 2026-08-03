/**
 * Query functions backing the live registry (issues #6/#12). Kept here — not in
 * packages/core — so Core never builds raw Drizzle queries directly, the same
 * relationship quota.ts already has with this package.
 */
import { desc } from "drizzle-orm";
import type { createDbClient } from "./client";
import { agencies, jobOrders, syncMetadata } from "./schema";
import type { Agency, JobOrder } from "./schema";

type Db = ReturnType<typeof createDbClient>;

export async function getAllAgencies(db: Db): Promise<Agency[]> {
  return db.select().from(agencies);
}

export async function getAllJobOrders(db: Db): Promise<JobOrder[]> {
  return db.select().from(jobOrders);
}

// Both sources are written with the same timestamp in one sync run (packages/sync/src/promote.ts)
// — take the most recent regardless of source so a partial write can never return a stale stamp.
export async function getLatestSyncedAt(db: Db): Promise<Date | null> {
  const rows = await db
    .select({ lastSyncedAt: syncMetadata.lastSyncedAt })
    .from(syncMetadata)
    .orderBy(desc(syncMetadata.lastSyncedAt))
    .limit(1);
  return rows[0]?.lastSyncedAt ?? null;
}
