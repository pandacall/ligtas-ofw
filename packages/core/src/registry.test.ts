import type { Agency } from "@ligtas-ofw/db";
import { normalizeAgencyName } from "@ligtas-ofw/db";
import { describe, expect, it } from "vitest";
import { checkAgency, LICENSE_STATUS_SEVERITY } from "./registry";

const NOW = new Date("2026-07-27T00:00:00.000Z");
const SYNCED_AT = new Date("2026-07-27T05:00:00.000Z");

function baseAgencyRow(overrides: Partial<Agency> = {}): Agency {
  const name = overrides.name ?? "XYZ International Placement Agency, Inc.";
  return {
    id: 1,
    name,
    normalizedName: normalizeAgencyName(name),
    classification: "Private Employment Agency",
    licenseStatus: "Valid License",
    licenseStatusDate: new Date("2024-01-15T00:00:00.000Z"),
    licenseExpirationDate: new Date("2030-01-01T00:00:00.000Z"),
    isValid: true,
    representative: "Maria Santos",
    address: "Unit 1, Test Building",
    municipalityProvince: "Makati",
    cityProvince: "Metro Manila",
    contactNumber: "(02) 8888-1234",
    email: "info@example.ph",
    dataAsOf: new Date("2026-07-14T05:00:00.000Z"),
    ...overrides,
  };
}

describe("checkAgency — verdict-cases.md registry cases", () => {
  it("R3: exact-normalized name match on a Valid License agency => VERIFIED, evidence names the match", () => {
    const agency = baseAgencyRow();
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "VERIFIED" });
    if (result.kind === "matched") {
      expect(result.reasons[0]).toContain(agency.name);
    }
  });

  it("R6: unmatched name => HIGH_RISK not_found, reason names the sync date", () => {
    const result = checkAgency("Totally Unknown Agency", { agencies: [baseAgencyRow()], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "not_found", verdict: "HIGH_RISK" });
    expect(result.reasons[0]).toContain("not found");
    expect(result.reasons[0]).toContain("2026-07-27");
  });

  it("R7: status Suspended (disciplinary) with a status date => HIGH_RISK, reason names the date", () => {
    const agency = baseAgencyRow({
      licenseStatus: "Suspended",
      licenseStatusDate: new Date("2026-05-01T00:00:00.000Z"),
    });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "HIGH_RISK" });
    if (result.kind === "matched") {
      expect(result.reasons.some((r) => r.includes("Suspended") && r.includes("2026-05-01"))).toBe(true);
    }
  });

  it("R8: status Cancelled => HIGH_RISK", () => {
    const agency = baseAgencyRow({ licenseStatus: "Cancelled" });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "HIGH_RISK" });
  });

  it("R9: status Forever Banned => HIGH_RISK", () => {
    const agency = baseAgencyRow({ licenseStatus: "Forever Banned", licenseExpirationDate: null });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "HIGH_RISK" });
  });

  it("R10: expiration date in the past => HIGH_RISK, even when status still says Valid License (data lag)", () => {
    const agency = baseAgencyRow({ licenseExpirationDate: new Date("2026-06-01T00:00:00.000Z") });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "HIGH_RISK" });
    if (result.kind === "matched") {
      expect(result.reasons.some((r) => r.includes("expired"))).toBe(true);
    }
  });

  it("R11: expiring within 60 days => CAUTION", () => {
    const agency = baseAgencyRow({ licenseExpirationDate: new Date("2026-08-20T00:00:00.000Z") }); // 24 days out
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "CAUTION" });
    if (result.kind === "matched") {
      expect(result.reasons.some((r) => r.includes("expires soon"))).toBe(true);
    }
  });

  it("expiration beyond the 60-day window does not trigger CAUTION", () => {
    const agency = baseAgencyRow({ licenseExpirationDate: new Date("2026-12-01T00:00:00.000Z") });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "VERIFIED" });
  });
});

describe("checkAgency — exact-normalized matching", () => {
  it("matches despite case/punctuation differences (normalization, not fuzzy)", () => {
    const agency = baseAgencyRow();
    const result = checkAgency(
      "xyz international placement agency inc",
      { agencies: [agency], syncedAt: SYNCED_AT },
      NOW,
    );
    expect(result).toMatchObject({ kind: "matched", verdict: "VERIFIED" });
  });

  it("exact match wins even when another agency is also fuzzy-plausible", () => {
    const exact = baseAgencyRow();
    const fuzzyDistraction = baseAgencyRow({ name: "XYZ Intl Placement Agency" });
    const result = checkAgency(
      exact.name,
      { agencies: [exact, fuzzyDistraction], syncedAt: SYNCED_AT },
      NOW,
    );
    expect(result).toMatchObject({ kind: "matched", verdict: "VERIFIED" });
    if (result.kind === "matched") {
      expect(result.agency.name).toBe(exact.name);
    }
  });
});

describe("checkAgency — fuzzy matching (issue #4, pg_trgm-modeled trigram similarity)", () => {
  it("R4: a close abbreviation (sim >= 0.55) auto-matches and names the canonical agency", () => {
    const agency = baseAgencyRow();
    const result = checkAgency("XYZ Intl Placement", { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "VERIFIED" });
    if (result.kind === "matched") {
      expect(result.reasons[0]).toContain("matched to:");
      expect(result.reasons[0]).toContain(agency.name);
    }
  });

  it("R5: a sparser partial name (0.4 <= sim < 0.55) returns an ambiguous did-you-mean, no auto-match", () => {
    const agency = baseAgencyRow();
    const result = checkAgency("XYZ Placement", { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "ambiguous", verdict: "CAUTION" });
    if (result.kind === "ambiguous") {
      expect(result.candidates.map((c) => c.name)).toContain(agency.name);
    }
  });

  it("R6: an unrelated name (sim < 0.4) still returns not_found, not a did-you-mean", () => {
    const agency = baseAgencyRow();
    const result = checkAgency("Totally Unknown Agency", { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "not_found", verdict: "HIGH_RISK" });
  });

  it("R16: two branch offices both scoring >= 0.55 are shown together, never auto-picked", () => {
    const makati = baseAgencyRow({ name: "ABC Manpower Services - Makati Branch" });
    const cebu = baseAgencyRow({ name: "ABC Manpower Services - Cebu Branch" });
    const result = checkAgency(
      "ABC Manpower Services",
      { agencies: [makati, cebu], syncedAt: SYNCED_AT },
      NOW,
    );
    expect(result).toMatchObject({ kind: "ambiguous", verdict: "CAUTION" });
    if (result.kind === "ambiguous") {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates.map((c) => c.name).sort()).toEqual([cebu.name, makati.name].sort());
    }
  });

  it("caps the did-you-mean list at the top 3 candidates by similarity", () => {
    // All five score in [0.4, 0.55) against "Star Manpower" — none reach the 0.55 auto-match
    // bar, so this exercises the did-you-mean cap rather than the R16 ambiguous-strong-matches path.
    const agencies = [
      baseAgencyRow({ name: "Star Manpower and General Services Corporation" }),
      baseAgencyRow({ name: "Starlight Manpower Resources Incorporated" }),
      baseAgencyRow({ name: "All Star Manpower Solutions Company" }),
      baseAgencyRow({ name: "Star Fleet Manpower Overseas Corporation" }),
      baseAgencyRow({ name: "Northern Star Manpower Development Inc" }),
    ];
    const result = checkAgency("Star Manpower", { agencies, syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "ambiguous", verdict: "CAUTION" });
    if (result.kind === "ambiguous") {
      expect(result.candidates.length).toBe(3);
    }
  });
});

describe("License Status severity table", () => {
  it("Suspended (Document Processing) is administrative => CAUTION, distinct from disciplinary Suspended", () => {
    const agency = baseAgencyRow({ licenseStatus: "Suspended (Document Processing)" });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "CAUTION" });
  });

  it("an unrecognized status defaults to CAUTION, never VERIFIED", () => {
    const agency = baseAgencyRow({ licenseStatus: "Some Brand New Status" });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "CAUTION" });
    if (result.kind === "matched") {
      expect(result.reasons.some((r) => r.includes("unrecognized"))).toBe(true);
    }
  });

  it("no entry other than 'Valid License' ever maps to VERIFIED", () => {
    for (const [status, verdict] of Object.entries(LICENSE_STATUS_SEVERITY)) {
      if (status !== "Valid License") {
        expect(verdict).not.toBe("VERIFIED");
      }
    }
  });
});

describe("is_valid is never the verdict source", () => {
  it("Valid License + is_valid=false still verdicts VERIFIED", () => {
    const agency = baseAgencyRow({ isValid: false });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "VERIFIED" });
  });

  it("Cancelled + is_valid=true still verdicts HIGH_RISK", () => {
    const agency = baseAgencyRow({ licenseStatus: "Cancelled", isValid: true });
    const result = checkAgency(agency.name, { agencies: [agency], syncedAt: SYNCED_AT }, NOW);
    expect(result).toMatchObject({ kind: "matched", verdict: "HIGH_RISK" });
  });
});
