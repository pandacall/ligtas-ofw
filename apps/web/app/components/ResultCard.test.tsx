import type { RegistryVerdictResult } from "@ligtas-ofw/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultCard } from "./ResultCard";

const SYNCED_AT = new Date("2026-07-27T05:00:00.000Z");

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
