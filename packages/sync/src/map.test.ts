import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapAgencies, mapJobOrders } from "./map";
import type { DmwRawAgencyRecord } from "./map";
import type { RawJobOrder } from "@ligtas-ofw/db";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RECORDED_AGENCIES_PAGE_1 = JSON.parse(
  readFileSync(
    path.join(
      REPO_ROOT,
      "starter/phase0-findings/https___master_api_dmw_gov_ph_api_v1_public_licensed_agencies_page_1.json",
    ),
    "utf-8",
  ),
);

describe("mapAgencies", () => {
  it("renames the real API's `eMail` field to `email`", () => {
    const records: DmwRawAgencyRecord[] = RECORDED_AGENCIES_PAGE_1.data;
    const first = records[0];
    if (!first) throw new Error("expected at least one recorded agency");
    expect(first.eMail).toBeDefined();
    expect((first as unknown as { email?: unknown }).email).toBeUndefined();

    const rows = mapAgencies(records, "2026-07-27T05:00:00.000Z");

    expect(rows[0]?.email).toBe(first.eMail);
  });

  it("computes normalizedName and coerces dates, matching toAgencyRows", () => {
    const records: DmwRawAgencyRecord[] = RECORDED_AGENCIES_PAGE_1.data;
    const rows = mapAgencies(records, "2026-07-27T05:00:00.000Z");

    const first = rows[0];
    expect(first?.name).toBe("101 MOJO INT`L. CORPORATION");
    expect(first?.normalizedName).toBe("101 mojo int l corporation");
    expect(first?.licenseExpirationDate).toBeInstanceOf(Date);
    expect(first?.dataAsOf).toBeInstanceOf(Date);
  });

  it("assigns sequential synthetic ids", () => {
    const records: DmwRawAgencyRecord[] = RECORDED_AGENCIES_PAGE_1.data;
    const rows = mapAgencies(records, "2026-07-27T05:00:00.000Z");

    expect(rows[0]?.id).toBe(1);
    expect(rows[1]?.id).toBe(2);
  });
});

describe("mapJobOrders", () => {
  const rawJobOrder: RawJobOrder = {
    agency: "STUDIO 85 PROMOTIONS INC",
    principal: "NAKAMOTO GUMI CO",
    jobsite: "JAPAN",
    position: "WELDING",
    balance: "15",
    date_approved: "2031-03-26T00:00:00.000Z",
    accreditation_class: "Regular Accreditation",
    data_as_of: "2026-07-14T04:00:04.053Z",
  };

  it("passes fields through unchanged, coercing balance to a number", () => {
    const rows = mapJobOrders([rawJobOrder], "2026-07-27T05:00:00.000Z");

    expect(rows[0]?.agencyName).toBe("STUDIO 85 PROMOTIONS INC");
    expect(rows[0]?.balance).toBe(15);
    expect(typeof rows[0]?.balance).toBe("number");
    expect(rows[0]?.dateApproved).toBeInstanceOf(Date);
  });
});
