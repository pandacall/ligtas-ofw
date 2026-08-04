import type { JobOrder, RegistryVerdictResult } from "@ligtas-ofw/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultCard } from "./ResultCard";

const SYNCED_AT = new Date("2026-07-27T05:00:00.000Z");

function baseAgency() {
  return {
    id: 1,
    name: "XYZ International Placement Agency, Inc.",
    normalizedName: "xyz international placement agency inc",
    classification: "Private Employment Agency",
    licenseStatus: "Valid License",
    licenseStatusDate: new Date("2024-01-15T00:00:00.000Z"),
    licenseExpirationDate: new Date("2030-01-15T00:00:00.000Z"),
    isValid: true,
    representative: "Maria Santos",
    address: "Unit 501, ABC Business Center",
    municipalityProvince: "Makati",
    cityProvince: "Metro Manila",
    contactNumber: "(02) 8888-1234",
    email: "info@example.ph",
    dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
  };
}

function baseJobOrder(overrides: Partial<JobOrder> = {}): JobOrder {
  return {
    id: 1,
    agencyName: "XYZ International Placement Agency, Inc.",
    principal: "Nakamoto Marine Co",
    jobsite: "Japan",
    position: "Welder",
    balance: 12,
    dateApproved: new Date("2026-03-01T00:00:00.000Z"),
    accreditationClass: "Regular Accreditation",
    dataAsOf: new Date("2026-07-14T04:00:00.000Z"),
    ...overrides,
  };
}

describe("ResultCard", () => {
  it("R6-style not_found: renders HIGH_RISK and the report block, no agency details", () => {
    const result: RegistryVerdictResult = {
      kind: "not_found",
      verdict: "HIGH_RISK",
      reasons: ['"Totally Unknown Agency" not found in DMW list as of 2026-07-27'],
      syncedAt: SYNCED_AT,
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("HIGH_RISK");
    expect(html).toContain("not found in DMW list");
    expect(html).toContain("Paano mag-report");
    expect(html).not.toContain("License Status");
  });

  it("matched + VERIFIED: renders agency details and status, no report block", () => {
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: ["matched exact name: XYZ International Placement Agency, Inc."],
      syncedAt: SYNCED_AT,
      jobOrders: [],
      agency: {
        id: 1,
        name: "XYZ International Placement Agency, Inc.",
        normalizedName: "xyz international placement agency inc",
        classification: "Private Employment Agency",
        licenseStatus: "Valid License",
        licenseStatusDate: new Date("2024-01-15T00:00:00.000Z"),
        licenseExpirationDate: new Date("2030-01-15T00:00:00.000Z"),
        isValid: true,
        representative: "Maria Santos",
        address: "Unit 501, ABC Business Center",
        municipalityProvince: "Makati",
        cityProvince: "Metro Manila",
        contactNumber: "(02) 8888-1234",
        email: "info@example.ph",
        dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
      },
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("VERIFIED");
    expect(html).toContain("Valid License");
    expect(html).toContain("Unit 501, ABC Business Center");
    expect(html).not.toContain("Paano mag-report");
  });

  it("R4-style fuzzy auto-match: renders 'matched to: <canonical>' and full agency details", () => {
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: ["matched to: XYZ International Placement Agency, Inc."],
      syncedAt: SYNCED_AT,
      jobOrders: [],
      agency: {
        id: 1,
        name: "XYZ International Placement Agency, Inc.",
        normalizedName: "xyz international placement agency inc",
        classification: "Private Employment Agency",
        licenseStatus: "Valid License",
        licenseStatusDate: new Date("2024-01-15T00:00:00.000Z"),
        licenseExpirationDate: new Date("2030-01-15T00:00:00.000Z"),
        isValid: true,
        representative: "Maria Santos",
        address: "Unit 501, ABC Business Center",
        municipalityProvince: "Makati",
        cityProvince: "Metro Manila",
        contactNumber: "(02) 8888-1234",
        email: "info@example.ph",
        dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
      },
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("VERIFIED");
    expect(html).toContain("matched to: XYZ International Placement Agency, Inc.");
    expect(html).toContain("Valid License");
    expect(html).not.toContain("Paano mag-report");
  });

  it("R5/R16-style ambiguous: renders CAUTION, both candidates, no license details, no report block", () => {
    const result: RegistryVerdictResult = {
      kind: "ambiguous",
      verdict: "CAUTION",
      reasons: ['multiple close matches for "ABC Manpower Services" — did you mean one of these?'],
      syncedAt: SYNCED_AT,
      candidates: [
        {
          id: 1,
          name: "ABC Manpower Services - Makati Branch",
          normalizedName: "abc manpower services makati branch",
          classification: "Private Employment Agency",
          licenseStatus: "Valid License",
          licenseStatusDate: new Date("2024-01-15T00:00:00.000Z"),
          licenseExpirationDate: new Date("2030-01-15T00:00:00.000Z"),
          isValid: true,
          representative: null,
          address: null,
          municipalityProvince: null,
          cityProvince: null,
          contactNumber: null,
          email: null,
          dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
        },
        {
          id: 2,
          name: "ABC Manpower Services - Cebu Branch",
          normalizedName: "abc manpower services cebu branch",
          classification: "Private Employment Agency",
          licenseStatus: "Valid License",
          licenseStatusDate: new Date("2024-01-15T00:00:00.000Z"),
          licenseExpirationDate: new Date("2030-01-15T00:00:00.000Z"),
          isValid: true,
          representative: null,
          address: null,
          municipalityProvince: null,
          cityProvince: null,
          contactNumber: null,
          email: null,
          dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
        },
      ],
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("CAUTION");
    expect(html).toContain("ABC Manpower Services - Makati Branch");
    expect(html).toContain("ABC Manpower Services - Cebu Branch");
    expect(html).toContain("did you mean");
    expect(html).not.toContain("License Status");
    expect(html).not.toContain("Paano mag-report");
  });

  it("matched + HIGH_RISK (e.g. R8 Cancelled): shows the report block", () => {
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "HIGH_RISK",
      reasons: ["matched exact name: Golden Gate Manpower Corp", 'license status "Cancelled" since 2026-02-10'],
      syncedAt: SYNCED_AT,
      jobOrders: [],
      agency: {
        id: 4,
        name: "Golden Gate Manpower Corp",
        normalizedName: "golden gate manpower corp",
        classification: "Private Employment Agency",
        licenseStatus: "Cancelled",
        licenseStatusDate: new Date("2026-02-10T00:00:00.000Z"),
        licenseExpirationDate: new Date("2029-01-01T00:00:00.000Z"),
        isValid: true,
        representative: null,
        address: null,
        municipalityProvince: null,
        cityProvince: null,
        contactNumber: null,
        email: null,
        dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
      },
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("HIGH_RISK");
    expect(html).toContain("Cancelled");
    expect(html).toContain("Paano mag-report");
  });
});

describe("ResultCard — Job Orders (issue #5)", () => {
  it("lists each Job Order's position, jobsite, and principal", () => {
    const jobOrder = baseJobOrder();
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: ["matched exact name: XYZ International Placement Agency, Inc."],
      syncedAt: SYNCED_AT,
      jobOrders: [jobOrder],
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("Welder");
    expect(html).toContain("Japan");
    expect(html).toContain("Nakamoto Marine Co");
  });

  it("renders 'no approved Job Orders on file' when the list is empty and no claim was supplied", () => {
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: ["matched exact name: XYZ International Placement Agency, Inc."],
      syncedAt: SYNCED_AT,
      jobOrders: [],
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("Walang aprubadong Job Order sa listahan");
  });

  it("R12-style claim match: renders the confirming reason and marks the matched row", () => {
    const jobOrder = baseJobOrder();
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: [
        "matched exact name: XYZ International Placement Agency, Inc.",
        "approved job order on file: Welder in Japan (principal: Nakamoto Marine Co)",
      ],
      syncedAt: SYNCED_AT,
      jobOrders: [jobOrder],
      claimedMatch: jobOrder,
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("VERIFIED");
    expect(html).toContain("approved job order on file: Welder in Japan");
    expect(html).toContain("tugma sa sinabi mo");
  });

  // Found on production: 1010 EPHESIANS carries 369 job orders and the registry's largest agency
  // carries 2,816. Rendering them all produced a card roughly 460,000px tall.
  it("caps a long Job Order list and states the real total instead of truncating silently", () => {
    const jobOrders = Array.from({ length: 369 }, (_, i) => baseJobOrder({ id: i + 1, position: `Welder ${i + 1}` }));
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: ["matched exact name: XYZ International Placement Agency, Inc."],
      syncedAt: SYNCED_AT,
      jobOrders,
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);

    expect(html).toContain("Welder 1");
    expect(html).toContain("Welder 8");
    expect(html).not.toContain("Welder 9");
    // The total is stated, and the rest is reachable on the official site.
    expect(html).toContain("8 sa 369");
    expect(html).toContain("At 361 pang iba");
  });

  it("never truncates away the row the user actually asked about", () => {
    const claimed = baseJobOrder({ id: 999, position: "Caregiver", jobsite: "Canada" });
    const jobOrders = [
      ...Array.from({ length: 40 }, (_, i) => baseJobOrder({ id: i + 1, position: `Welder ${i + 1}` })),
      claimed,
    ];
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "VERIFIED",
      reasons: ["matched exact name: XYZ International Placement Agency, Inc."],
      syncedAt: SYNCED_AT,
      jobOrders,
      claimedMatch: claimed,
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);

    // Last in the raw list, but it is the one row the query was about.
    expect(html).toContain("Caregiver");
    expect(html).toContain("tugma sa sinabi mo");
  });

  it("R13-style claim miss: rows exist but none match => CAUTION copy naming the destination", () => {
    const jobOrder = baseJobOrder({ jobsite: "Saudi Arabia", position: "Domestic Worker" });
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "CAUTION",
      reasons: [
        "matched exact name: XYZ International Placement Agency, Inc.",
        "no approved job order for Japan on file",
      ],
      syncedAt: SYNCED_AT,
      jobOrders: [jobOrder],
      claimedMatch: null,
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("CAUTION");
    expect(html).toContain("no approved job order for Japan on file");
    expect(html).not.toContain("tugma sa sinabi mo");
  });

  it("R14-style empty registry + claim: renders the 'data may lag' CAUTION copy", () => {
    const result: RegistryVerdictResult = {
      kind: "matched",
      verdict: "CAUTION",
      reasons: [
        "matched exact name: XYZ International Placement Agency, Inc.",
        "no job orders on file — data may lag; verify",
      ],
      syncedAt: SYNCED_AT,
      jobOrders: [],
      claimedMatch: null,
      agency: baseAgency(),
    };
    const html = renderToStaticMarkup(<ResultCard result={result} />);
    expect(html).toContain("CAUTION");
    expect(html).toContain("data may lag");
    expect(html).toContain("Walang aprubadong Job Order sa listahan");
    // Never HIGH_RISK for a missing Job Order match.
    expect(html).not.toContain("HIGH_RISK");
  });
});
