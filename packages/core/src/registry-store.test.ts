import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  agencies,
  connectTestDb,
  createDbClient,
  jobOrders,
  normalizeAgencyName,
  SKIP_INTEGRATION,
  syncMetadata,
} from "@ligtas-ofw/db";
import { checkAgency } from "./registry";
import { loadDbRegistryState } from "./registry-store";

// Skip/fail asymmetry (unset -> skip locally, must fail in CI) lives in @ligtas-ofw/db's test-support.ts.
describe.skipIf(SKIP_INTEGRATION)("loadDbRegistryState (integration)", () => {
  let db: ReturnType<typeof createDbClient>;

  beforeAll(async () => {
    db = await connectTestDb();
  });

  afterAll(async () => {
    await db?.$client.end();
  });

  beforeEach(async () => {
    await db.delete(jobOrders);
    await db.delete(agencies);
    await db.delete(syncMetadata);
  });

  it("loads agencies, job orders, and the latest sync timestamp from Postgres", async () => {
    const syncedAt = new Date("2026-08-03T02:26:00.000Z");
    const agencyName = "101 MOJO INT`L. CORPORATION";

    await db.insert(agencies).values({
      name: agencyName,
      normalizedName: normalizeAgencyName(agencyName),
      classification: "Private Employment Agency",
      licenseStatus: "Valid License",
      licenseStatusDate: new Date("2025-11-11T00:00:00.000Z"),
      licenseExpirationDate: new Date("2031-10-03T00:00:00.000Z"),
      isValid: true,
      representative: "JAMES TAN ONG LOPEZ",
      address: "UNIT 103-203, MALATE",
      municipalityProvince: "MALATE",
      cityProvince: "MANILA",
      contactNumber: "(02) 86818959",
      email: "101mojorecruit@gmail.com",
      dataAsOf: new Date("2026-07-14T05:00:00.250Z"),
    });
    await db.insert(jobOrders).values({
      agencyName,
      principal: "NAKAMOTO GUMI CO",
      jobsite: "JAPAN",
      position: "WELDING",
      balance: 15,
      dateApproved: new Date("2031-03-26T00:00:00.000Z"),
      accreditationClass: "Regular Accreditation",
      dataAsOf: new Date("2026-07-14T04:00:04.053Z"),
    });
    await db.insert(syncMetadata).values([
      { source: "agencies", lastSyncedAt: syncedAt, rowCount: 1, status: "success" },
      { source: "job_orders", lastSyncedAt: syncedAt, rowCount: 1, status: "success" },
    ]);

    const state = await loadDbRegistryState(db);

    expect(state.agencies).toHaveLength(1);
    expect(state.agencies[0]?.name).toBe(agencyName);
    expect(state.jobOrders).toHaveLength(1);
    expect(state.jobOrders[0]?.jobsite).toBe("JAPAN");
    expect(state.syncedAt).toEqual(syncedAt);

    // End-to-end: the loaded state plugs straight into the existing pure verdict logic.
    const result = checkAgency(agencyName, state, new Date("2026-08-03T12:00:00.000Z"));
    expect(result.kind).toBe("matched");
  });
});
