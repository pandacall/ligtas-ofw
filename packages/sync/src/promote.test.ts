import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { agencies, createDbClient, jobOrders, syncMetadata } from "@ligtas-ofw/db";
import type { Agency, JobOrder } from "@ligtas-ofw/db";
import { isTripwireTriggered, stageAndPromote } from "./promote";
import { SyncError } from "./errors";

describe("isTripwireTriggered", () => {
  it("does not trigger on a first-ever sync (live count 0)", () => {
    expect(isTripwireTriggered(0, 5)).toBe(false);
  });

  it("does not trigger within the 10% drop tolerance", () => {
    expect(isTripwireTriggered(100, 91)).toBe(false);
    expect(isTripwireTriggered(100, 90)).toBe(false);
  });

  it("triggers when the staged count drops more than 10% below live", () => {
    expect(isTripwireTriggered(100, 89)).toBe(true);
    expect(isTripwireTriggered(100, 0)).toBe(true);
  });
});

const MIGRATIONS_FOLDER = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const isCI = Boolean(process.env.CI);

// Required in CI (see docker-compose.yml + .github/workflows/ci.yml); locally, skip rather
// than fail if a developer hasn't run `npm run test:db:up`.
describe.skipIf(!testDatabaseUrl && !isCI)("stageAndPromote (integration)", () => {
  let db: ReturnType<typeof createDbClient>;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error(
        "TEST_DATABASE_URL is required to run packages/sync's integration tests. Run `npm run test:db:up` " +
          "and set TEST_DATABASE_URL (see .env.example) locally, or ensure CI provisions it.",
      );
    }
    db = createDbClient(testDatabaseUrl);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  });

  afterAll(async () => {
    await db?.$client.end();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE agencies, job_orders, sync_metadata, agencies_staging, job_orders_staging`);
  });

  function makeAgency(id: number, overrides: Partial<Agency> = {}): Agency {
    return {
      id,
      name: `Agency ${id}`,
      normalizedName: `agency ${id}`,
      classification: "Private Employment Agency",
      licenseStatus: "Valid License",
      licenseStatusDate: null,
      licenseExpirationDate: null,
      isValid: true,
      representative: null,
      address: null,
      municipalityProvince: null,
      cityProvince: null,
      contactNumber: null,
      email: null,
      dataAsOf: new Date("2026-07-27T00:00:00.000Z"),
      ...overrides,
    };
  }

  function makeJobOrder(id: number, overrides: Partial<JobOrder> = {}): JobOrder {
    return {
      id,
      agencyName: `Agency ${id}`,
      principal: "Some Principal",
      jobsite: "JAPAN",
      position: "WELDER",
      balance: 1,
      dateApproved: null,
      accreditationClass: "Regular Accreditation",
      dataAsOf: new Date("2026-07-27T00:00:00.000Z"),
      ...overrides,
    };
  }

  async function seedLive(agencyRows: Agency[], jobOrderRows: JobOrder[] = []): Promise<void> {
    if (agencyRows.length > 0) {
      await db.insert(agencies).values(agencyRows.map(({ id: _id, ...row }) => row));
    }
    if (jobOrderRows.length > 0) {
      await db.insert(jobOrders).values(jobOrderRows.map(({ id: _id, ...row }) => row));
    }
  }

  it("replaces live rows with the staged pull and records success metadata", async () => {
    await seedLive([makeAgency(1, { name: "Old Agency" })]);

    const newAgencies = [makeAgency(1, { name: "New Agency A" }), makeAgency(2, { name: "New Agency B" })];
    const newJobOrders = [makeJobOrder(1)];

    const result = await stageAndPromote(db, {
      agencies: newAgencies,
      jobOrders: newJobOrders,
      syncedAt: new Date("2026-07-27T05:00:00.000Z"),
    });

    expect(result).toEqual({ agencyCount: 2, jobOrderCount: 1 });

    const liveAgencies = await db.select().from(agencies);
    expect(liveAgencies.map((a) => a.name).sort()).toEqual(["New Agency A", "New Agency B"]);

    const liveJobOrders = await db.select().from(jobOrders);
    expect(liveJobOrders).toHaveLength(1);

    const metadata = await db.select().from(syncMetadata);
    expect(metadata).toHaveLength(2);
    expect(metadata.find((m) => m.source === "agencies")).toMatchObject({ rowCount: 2, status: "success" });
    expect(metadata.find((m) => m.source === "job_orders")).toMatchObject({ rowCount: 1, status: "success" });

    const staging = await db.execute(sql`SELECT COUNT(*)::int AS count FROM agencies_staging`);
    expect(staging.rows[0]?.count).toBe(0);
  });

  it("aborts the swap and leaves live data untouched when the tripwire trips", async () => {
    const liveAgencies = Array.from({ length: 10 }, (_, i) => makeAgency(i + 1));
    await seedLive(liveAgencies);

    // 8 of 10 is a 20% drop — over the 10% tripwire threshold.
    const staleAgencies = liveAgencies.slice(0, 8);

    await expect(
      stageAndPromote(db, { agencies: staleAgencies, jobOrders: [], syncedAt: new Date() }),
    ).rejects.toBeInstanceOf(SyncError);

    const stillLive = await db.select().from(agencies);
    expect(stillLive).toHaveLength(10);
    expect(stillLive.map((a) => a.name).sort()).toEqual(liveAgencies.map((a) => a.name).sort());

    const metadata = await db.select().from(syncMetadata);
    expect(metadata).toHaveLength(0);
  });
});
