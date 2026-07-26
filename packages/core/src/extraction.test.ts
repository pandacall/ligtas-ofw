import { describe, expect, it } from "vitest";
import {
  Extraction,
  RedFlag,
  filterUnverifiedFlags,
  licenseFormatIsValid,
  normalizeLicenseNumber,
} from "./extraction";

describe("Extraction schema", () => {
  it("accepts a well-formed extraction", () => {
    const result = Extraction.safeParse({
      is_job_post: true,
      agency_name: null,
      license_no_claimed: null,
      recruiter_is_individual: true,
      position: "factory worker",
      destination_country: "Japan",
      salary_raw: "¥300,000/month",
      fees: [{ label: "processing fee", amount_raw: "₱15,000" }],
      contact_channels: ["facebook", "messenger"],
      office_address_given: false,
      visa_type_mentioned: null,
      urgency_phrases: ["Slots limited!!"],
      red_flags: [{ flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a malformed extraction", () => {
    const result = Extraction.safeParse({
      is_job_post: true,
      agency_name: null,
      license_no_claimed: null,
      recruiter_is_individual: true,
      position: null,
      destination_country: null,
      salary_raw: null,
      fees: [],
      contact_channels: ["carrier_pigeon"],
      office_address_given: false,
      visa_type_mentioned: null,
      urgency_phrases: [],
      red_flags: [],
    });

    expect(result.success).toBe(false);
  });

  it("has exactly 40 RedFlag members", () => {
    expect(RedFlag.options).toHaveLength(40);
  });
});

describe("license format validation", () => {
  it("accepts a well-formed DMW license (R1)", () => {
    expect(licenseFormatIsValid("DMW-072-LB-09262023-UL")).toBe(true);
  });

  it("normalizes a messy license before format-checking (R2)", () => {
    expect(normalizeLicenseNumber("dmw 072 lb 09262023 ul")).toBe("DMW-072-LB-09262023-UL");
    expect(licenseFormatIsValid("dmw 072 lb 09262023 ul")).toBe(true);
  });

  it("accepts a well-formed POEA license", () => {
    expect(licenseFormatIsValid("POEA-123-SB-010124-R")).toBe(true);
  });

  it("rejects a fake-format license (scam-04)", () => {
    expect(licenseFormatIsValid("DMW-2026-ABC-99999-XYZ")).toBe(false);
  });
});

describe("filterUnverifiedFlags", () => {
  const sourceText = "Processing fee lang na ₱15,000 para sa medical at training.";

  it("keeps a flag whose evidence_quote is a substring of the source", () => {
    const kept = filterUnverifiedFlags(
      [{ flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" }],
      sourceText,
    );
    expect(kept).toHaveLength(1);
  });

  it("drops a flag whose evidence_quote is fabricated", () => {
    const kept = filterUnverifiedFlags(
      [{ flag: "upfront_fee", evidence_quote: "Pay ₱50,000 upfront immediately" }],
      sourceText,
    );
    expect(kept).toHaveLength(0);
  });

  it("matches across whitespace differences (newline vs space)", () => {
    const kept = filterUnverifiedFlags(
      [{ flag: "upfront_fee", evidence_quote: "Processing fee\nlang na ₱15,000" }],
      sourceText,
    );
    expect(kept).toHaveLength(1);
  });
});
