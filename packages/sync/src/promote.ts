/**
 * Full-replace promotion (issue #6, DATA-SOURCES.md "Sync strategy"): a fresh pull is
 * loaded into staging tables first (slow — ~15-20 min for both endpoints, so it runs
 * outside any transaction and never locks live tables), then a single short transaction
 * checks the row-count tripwire and truncate+copies staging into live. A crash or thrown
 * error anywhere in that transaction rolls back, leaving last night's live data untouched
 * — "stale-but-stamped" is designed behavior, half-empty is not.
 */
import { sql } from "drizzle-orm";
import { agenciesStaging, createDbClient, jobOrdersStaging, syncMetadata } from "@ligtas-ofw/db";
import type { Agency, JobOrder } from "@ligtas-ofw/db";
import { SyncError } from "./errors";

type Db = ReturnType<typeof createDbClient>;

export type RegistryPull = {
  agencies: Agency[];
  jobOrders: JobOrder[];
  syncedAt: Date;
};

// >10% drop in agency count aborts the swap (DATA-SOURCES.md "Row-count tripwire") — guards
// against a half-broken API mass-flagging legit agencies as unregistered.
const TRIPWIRE_DROP_RATIO = 0.1;
const INSERT_CHUNK_SIZE = 500;

export function isTripwireTriggered(liveCount: number, stagedCount: number): boolean {
  if (liveCount === 0) return false; // nothing to protect yet — first-ever sync
  return stagedCount < liveCount * (1 - TRIPWIRE_DROP_RATIO);
}

async function insertAgenciesStaging(db: Db, rows: Agency[]): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE).map(({ id: _id, ...row }) => row);
    await db.insert(agenciesStaging).values(chunk);
  }
}

async function insertJobOrdersStaging(db: Db, rows: JobOrder[]): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE).map(({ id: _id, ...row }) => row);
    await db.insert(jobOrdersStaging).values(chunk);
  }
}

type Executor = Pick<Db, "execute">;

async function rowCount(executor: Executor, table: "agencies" | "agencies_staging"): Promise<number> {
  const result = await executor.execute<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM ${sql.raw(table)}`);
  return result.rows[0]?.count ?? 0;
}

/**
 * Stages a full pull into `*_staging` tables, then promotes it to live in one transaction.
 * Throws `SyncError("tripwire", ...)` (transaction rolled back, live untouched) if the
 * staged agency count is more than 10% below the live count.
 */
export async function stageAndPromote(db: Db, pull: RegistryPull): Promise<{ agencyCount: number; jobOrderCount: number }> {
  await db.execute(sql`TRUNCATE agencies_staging`);
  await db.execute(sql`TRUNCATE job_orders_staging`);
  await insertAgenciesStaging(db, pull.agencies);
  await insertJobOrdersStaging(db, pull.jobOrders);

  return db.transaction(async (tx) => {
    const liveCount = await rowCount(tx, "agencies");
    const stagedCount = await rowCount(tx, "agencies_staging");

    if (isTripwireTriggered(liveCount, stagedCount)) {
      throw new SyncError(
        "tripwire",
        `staged agency count (${stagedCount}) is more than 10% below the live count (${liveCount}) — aborting swap`,
      );
    }

    await tx.execute(sql`TRUNCATE agencies`);
    await tx.execute(sql`
      INSERT INTO agencies (name, normalized_name, classification, license_status, license_status_date,
        license_expiration_date, is_valid, representative, address, municipality_province, city_province,
        contact_number, email, data_as_of)
      SELECT name, normalized_name, classification, license_status, license_status_date,
        license_expiration_date, is_valid, representative, address, municipality_province, city_province,
        contact_number, email, data_as_of
      FROM agencies_staging
    `);
    await tx.execute(sql`TRUNCATE agencies_staging`);

    await tx.execute(sql`TRUNCATE job_orders`);
    await tx.execute(sql`
      INSERT INTO job_orders (agency_name, principal, jobsite, position, balance, date_approved,
        accreditation_class, data_as_of)
      SELECT agency_name, principal, jobsite, position, balance, date_approved, accreditation_class, data_as_of
      FROM job_orders_staging
    `);
    await tx.execute(sql`TRUNCATE job_orders_staging`);

    await tx.insert(syncMetadata).values([
      { source: "agencies", lastSyncedAt: pull.syncedAt, rowCount: stagedCount, status: "success" },
      { source: "job_orders", lastSyncedAt: pull.syncedAt, rowCount: pull.jobOrders.length, status: "success" },
    ]);

    return { agencyCount: stagedCount, jobOrderCount: pull.jobOrders.length };
  });
}
