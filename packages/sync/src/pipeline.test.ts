/**
 * End-to-end integration test: recorded Phase 0 fixtures stubbed as the DMW API, run
 * through fetchAllPages -> map -> stageAndPromote into a real Postgres. This is the one
 * test that exercises the whole pipeline together against a test Postgres with the
 * recorded fixtures as the stubbed API (issue #6's acceptance criterion) — dmw-client.test.ts
 * and map.test.ts already cover those two stages in isolation without a DB.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agencies, createDbClient, jobOrders } from "@ligtas-ofw/db";
import type { RawJobOrder } from "@ligtas-ofw/db";
import { fetchAllPages } from "./dmw-client";
import type { DmwRawAgencyRecord } from "./map";
import { mapAgencies, mapJobOrders } from "./map";
import { stageAndPromote } from "./promote";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readFixture(name: string): { meta: { lastPage: number }; data: unknown[] } {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, "starter/phase0-findings", name), "utf-8"));
}

const RECORDED_AGENCIES = readFixture(
  "https___master_api_dmw_gov_ph_api_v1_public_licensed_agencies_page_1.json",
);
const RECORDED_JOB_ORDERS = readFixture(
  "https___master_api_dmw_gov_ph_api_v1_public_approved_job_orders_page_1.json",
);

function singlePageFetchImpl(recorded: { meta: { lastPage: number }; data: unknown[] }): typeof fetch {
  const singlePage = { ...recorded, meta: { ...recorded.meta, lastPage: 1 } };
  return (async () => new Response(JSON.stringify(singlePage))) as unknown as typeof fetch;
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const isCI = Boolean(process.env.CI);

describe.skipIf(!testDatabaseUrl && !isCI)("sync pipeline (recorded fixtures -> real Postgres)", () => {
  let db: ReturnType<typeof createDbClient>;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error(
        "TEST_DATABASE_URL is required to run packages/sync's integration tests. Run `npm run test:db:up` " +
          "and set TEST_DATABASE_URL (see .env.example) locally, or ensure CI provisions it.",
      );
    }
    db = createDbClient(testDatabaseUrl);
    await migrate(db, { migrationsFolder: path.join(REPO_ROOT, "packages/db/migrations") });
    await db.execute(sql`TRUNCATE agencies, job_orders, sync_metadata, agencies_staging, job_orders_staging`);
  });

  afterAll(async () => {
    await db?.$client.end();
  });

  it("pulls, maps, and promotes the recorded fixtures into live tables", async () => {
    const rawAgencies = await fetchAllPages<DmwRawAgencyRecord>(
      "licensed-agencies",
      "test-key",
      singlePageFetchImpl(RECORDED_AGENCIES),
      0,
    );
    const rawJobOrders = await fetchAllPages<RawJobOrder>(
      "approved-job-orders",
      "test-key",
      singlePageFetchImpl(RECORDED_JOB_ORDERS),
      0,
    );

    const syncedAt = new Date("2026-07-27T05:00:00.000Z");
    const result = await stageAndPromote(db, {
      agencies: mapAgencies(rawAgencies, syncedAt.toISOString()),
      jobOrders: mapJobOrders(rawJobOrders, syncedAt.toISOString()),
      syncedAt,
    });

    expect(result.agencyCount).toBe(RECORDED_AGENCIES.data.length);
    expect(result.jobOrderCount).toBe(RECORDED_JOB_ORDERS.data.length);

    const liveAgency = await db.select().from(agencies).where(eq(agencies.name, "101 MOJO INT`L. CORPORATION"));
    expect(liveAgency).toHaveLength(1);
    expect(liveAgency[0]?.email).toBe("101mojorecruit@gmail.com/101mojo.dh@gmail.com");
    expect(liveAgency[0]?.licenseStatus).toBe("Valid License");

    const liveJobOrder = await db.select().from(jobOrders).where(eq(jobOrders.agencyName, "STUDIO 85 PROMOTIONS INC"));
    expect(liveJobOrder).toHaveLength(1);
    expect(liveJobOrder[0]?.jobsite).toBe("JAPAN");
    expect(liveJobOrder[0]?.balance).toBe(15);
  });
});
