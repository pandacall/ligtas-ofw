import type { RegistryVerdictResult, ScanResult } from "@ligtas-ofw/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScanResultCard } from "./ScanResultCard";

const SYNCED_AT = new Date("2026-07-27T05:00:00.000Z");

function verifiedAgencyRegistry(): RegistryVerdictResult {
  return {
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
}

describe("ScanResultCard — escape-hatch states", () => {
  it("P6 (not_a_job_post): renders an info message, no verdict banner, footer still present", () => {
    const result: ScanResult = { kind: "not_a_job_post" };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).not.toContain("VERIFIED");
    expect(html).not.toContain("CAUTION");
    expect(html).not.toContain("HIGH_RISK");
    expect(html).toContain("hindi mukhang job post");
    expect(html).toContain("2026-07-27");
  });

  it("P7 (unanalyzable): renders manual DMW search links, no verdict banner, footer still present", () => {
    const result: ScanResult = { kind: "unanalyzable" };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).not.toContain("VERIFIED");
    expect(html).not.toContain("CAUTION");
    expect(html).not.toContain("HIGH_RISK");
    expect(html).toContain("Hindi namin na-analyze");
    expect(html).toContain("https://dmw.gov.ph");
    expect(html).toContain("2026-07-27");
  });

  it("quota_exhausted (issue #11): renders the daily-budget copy, manual DMW search links, no verdict banner", () => {
    const result: ScanResult = { kind: "quota_exhausted" };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).not.toContain("VERIFIED");
    expect(html).not.toContain("CAUTION");
    expect(html).not.toContain("HIGH_RISK");
    expect(html).toContain("subukan ulit bukas");
    expect(html).toContain("https://dmw.gov.ph");
    expect(html).toContain("2026-07-27");
  });

  it("rate_limited (issue #11): renders the per-IP throttle copy, distinct from quota_exhausted, no verdict banner", () => {
    const result: ScanResult = { kind: "rate_limited" };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).not.toContain("VERIFIED");
    expect(html).not.toContain("CAUTION");
    expect(html).not.toContain("HIGH_RISK");
    expect(html).not.toContain("subukan ulit bukas");
    expect(html).toContain("sandaling maghintay");
    expect(html).toContain("2026-07-27");
  });
});

describe("ScanResultCard — scored results", () => {
  it("VERIFIED, no agency name extracted: no registry section, no report block", () => {
    const result: ScanResult = {
      kind: "scored",
      verdict: "VERIFIED",
      post: { kind: "scored", verdict: "VERIFIED", flags: [], reasons: [] },
    };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).toContain("VERIFIED");
    expect(html).toContain("Walang nakitang red flag");
    expect(html).not.toContain("Paano mag-report");
    expect(html).not.toContain("DMW registry");
  });

  it("P3 (scam-15 impersonation): registry VERIFIED + post HIGH_RISK => banner shows HIGH_RISK, report block, per-flag Taglish copy with evidence", () => {
    const result: ScanResult = {
      kind: "scored",
      verdict: "HIGH_RISK",
      post: {
        kind: "scored",
        verdict: "HIGH_RISK",
        flags: [
          { flag: "page_hijack_pattern", tier: "CRITICAL", evidence: "bagong Facebook page po ito, yung luma ay na-hack" },
        ],
        reasons: ["page_hijack_pattern: bagong Facebook page po ito, yung luma ay na-hack"],
      },
      registry: verifiedAgencyRegistry(),
    };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).toContain("HIGH_RISK");
    expect(html).toContain("Paano mag-report");
    expect(html).toContain("bagong Facebook page po ito, yung luma ay na-hack");
    // The registry section still shows VERIFIED even though the combined verdict is HIGH_RISK.
    expect(html).toContain("XYZ International Placement Agency, Inc.");
    expect(html).toContain("Valid License");
  });

  it("R1/R2-style: a valid-format claimed license renders the deflationary neutral copy, never as reassurance", () => {
    const result: ScanResult = {
      kind: "scored",
      verdict: "VERIFIED",
      post: { kind: "scored", verdict: "VERIFIED", flags: [], reasons: [] },
      validFormatLicenseClaim: "DMW-072-LB-09262023-UL",
    };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={SYNCED_AT} />);
    expect(html).toContain("checks the format only");
    expect(html).toContain("hindi ito kumpirmasyon");
    expect(html).toContain("DMW-072-LB-09262023-UL");
  });

  it("uses the registry match's syncedAt/dataAsOf for the footer when a registry lookup ran", () => {
    const result: ScanResult = {
      kind: "scored",
      verdict: "VERIFIED",
      post: { kind: "scored", verdict: "VERIFIED", flags: [], reasons: [] },
      registry: verifiedAgencyRegistry(),
    };
    const html = renderToStaticMarkup(<ScanResultCard result={result} syncedAt={new Date("2020-01-01T00:00:00.000Z")} />);
    expect(html).toContain("2026-07-14"); // agency dataAsOf
    expect(html).toContain("2026-07-27"); // registry syncedAt, not the (wrong) fallback
    expect(html).not.toContain("2020-01-01");
  });
});
