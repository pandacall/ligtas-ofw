import { describe, expect, it } from "vitest";
import type { Extraction } from "./extraction";
import { RedFlag } from "./extraction";
import { DERIVED_FLAGS, FLAG_SEVERITY, combineVerdict, scorePost, type Verdict } from "./verdict";

function baseExtraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    is_job_post: true,
    agency_name: null,
    license_no_claimed: null,
    recruiter_is_individual: false,
    position: null,
    destination_country: null,
    salary_raw: null,
    fees: [],
    contact_channels: [],
    office_address_given: false,
    visa_type_mentioned: null,
    urgency_phrases: [],
    red_flags: [],
    ...overrides,
  };
}

describe("FLAG_SEVERITY table", () => {
  it("covers every RedFlag enum member exactly once", () => {
    for (const flag of RedFlag.options) {
      expect(FLAG_SEVERITY[flag]).toBeDefined();
    }
  });

  it("covers both derived flags", () => {
    for (const flag of DERIVED_FLAGS) {
      expect(FLAG_SEVERITY[flag]).toBeDefined();
    }
  });

  it("has the expected tier counts (16 enum-critical + 2 derived = 18, 21 warning, 3 info)", () => {
    const allFlags = [...RedFlag.options, ...DERIVED_FLAGS];
    const counts = { CRITICAL: 0, WARNING: 0, INFO: 0 };
    for (const flag of allFlags) {
      counts[FLAG_SEVERITY[flag as keyof typeof FLAG_SEVERITY]]++;
    }
    expect(counts).toEqual({ CRITICAL: 18, WARNING: 21, INFO: 3 });
  });
});

describe("scorePost — verdict-cases.md P1-P7", () => {
  it("P1 (scam-01): a single critical flag => HIGH_RISK", () => {
    const result = scorePost(
      baseExtraction({
        position: "factory worker",
        red_flags: [{ flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" }],
      }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
  });

  it("P2 (scam-03): trafficking corridor destination alone => HIGH_RISK", () => {
    const result = scorePost(
      baseExtraction({
        red_flags: [
          { flag: "trafficking_corridor_destination", evidence_quote: "Customer Service Representatives for CAMBODIA" },
        ],
      }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
  });

  it("P3 (scam-15 impersonation): critical + warning => HIGH_RISK, and worst-of beats a VERIFIED registry", () => {
    const result = scorePost(
      baseExtraction({
        agency_name: "XYZ International Placement Agency, Inc.",
        red_flags: [
          { flag: "page_hijack_pattern", evidence_quote: "this page was recently renamed" },
          { flag: "informal_payment_channel", evidence_quote: "send via GCash" },
        ],
      }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
    if (result.kind === "scored") {
      expect(combineVerdict("VERIFIED", result.verdict)).toBe("HIGH_RISK");
    }
  });

  it("P4/P5 (legit-01, legit-04): no red flags => VERIFIED, falls through combineVerdict unchanged", () => {
    const result = scorePost(baseExtraction());
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
    if (result.kind === "scored") {
      expect(combineVerdict("VERIFIED", result.verdict)).toBe("VERIFIED");
    }
  });

  it("P6 (legit-05): not a job post => not_a_job_post, no verdict", () => {
    const result = scorePost(baseExtraction({ is_job_post: false }));
    expect(result).toEqual({ kind: "not_a_job_post" });
  });

  // P7 (extraction schema parse fails twice => UNANALYZABLE) has no Extraction to
  // inject — parsing fails before an Extraction object exists. The `unanalyzable`
  // variant of PostVerdictResult models the state for the future extractor-retry
  // wrapper (#8) to return; scorePost itself never produces it, so there's nothing
  // to exercise here yet.
});

describe("scorePost — warning threshold table", () => {
  it("0 warnings => VERIFIED", () => {
    const result = scorePost(baseExtraction());
    expect(result).toMatchObject({ verdict: "VERIFIED" });
  });

  it("1 warning => CAUTION", () => {
    const result = scorePost(
      baseExtraction({ red_flags: [{ flag: "urgency_pressure", evidence_quote: "Slots limited!!" }] }),
    );
    expect(result).toMatchObject({ verdict: "CAUTION" });
  });

  it("2 warnings => HIGH_RISK", () => {
    const result = scorePost(
      baseExtraction({
        red_flags: [
          { flag: "urgency_pressure", evidence_quote: "Slots limited!!" },
          { flag: "no_agency_identified", evidence_quote: "DM na for reservation" },
        ],
      }),
    );
    expect(result).toMatchObject({ verdict: "HIGH_RISK" });
  });
});

describe("scorePost — Info flags surface but never score", () => {
  it("Info-only flags keep the verdict VERIFIED but still appear in flags[]", () => {
    const result = scorePost(
      baseExtraction({
        red_flags: [
          { flag: "social_proof_flood", evidence_quote: "may group chat kami ng mga successful applicants" },
          { flag: "testimonial_bait", evidence_quote: "ako po ay nakapag-abroad na" },
        ],
      }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
    if (result.kind === "scored") {
      expect(result.flags).toHaveLength(2);
      expect(result.flags.every((f) => f.tier === "INFO")).toBe(true);
    }
  });
});

describe("scorePost — license format integration", () => {
  it("an invalid-format claimed license drives HIGH_RISK on its own (scam-04)", () => {
    const result = scorePost(
      baseExtraction({
        license_no_claimed: "DMW-2026-ABC-99999-XYZ",
        red_flags: [{ flag: "invalid_license_format", evidence_quote: "License No. DMW-2026-ABC-99999-XYZ" }],
      }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
    if (result.kind === "scored") {
      expect(result.flags.filter((f) => f.flag === "invalid_license_format")).toHaveLength(1);
    }
  });

  it("a valid-format claimed license does not block VERIFIED and is not counted as a flag", () => {
    const result = scorePost(baseExtraction({ license_no_claimed: "DMW-072-LB-09262023-UL" }));
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
    if (result.kind === "scored") {
      expect(result.flags).toHaveLength(0);
    }
  });
});

describe("scorePost — Derived Flags", () => {
  it("fee_for_hsw_or_seafarer: fee + HSW-keyword position => present", () => {
    const result = scorePost(
      baseExtraction({ position: "domestic worker", fees: [{ label: "processing fee", amount_raw: "₱5,000" }] }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "fee_for_hsw_or_seafarer")).toBe(true);
    }
  });

  it("fee_for_hsw_or_seafarer: fee + unrelated position => absent", () => {
    const result = scorePost(
      baseExtraction({ position: "welder", fees: [{ label: "processing fee", amount_raw: "₱5,000" }] }),
    );
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "fee_for_hsw_or_seafarer")).toBe(false);
    }
  });

  it("fee_for_hsw_or_seafarer: HSW position with no fee => absent", () => {
    const result = scorePost(baseExtraction({ position: "seafarer" }));
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "fee_for_hsw_or_seafarer")).toBe(false);
    }
  });

  it("private_agency_korea_e9: agency + Korea + factory-keyword position => present", () => {
    const result = scorePost(
      baseExtraction({
        agency_name: "ABC International Manpower Services",
        destination_country: "South Korea",
        position: "factory worker",
      }),
    );
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "private_agency_korea_e9")).toBe(true);
    }
  });

  it("private_agency_korea_e9: individual recruiter + Korea + factory-keyword position => present", () => {
    const result = scorePost(
      baseExtraction({
        recruiter_is_individual: true,
        destination_country: "South Korea",
        position: "factory worker",
      }),
    );
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "private_agency_korea_e9")).toBe(true);
    }
  });

  it("private_agency_korea_e9: no agency/recruiter present => absent (agency-presence gate)", () => {
    const result = scorePost(baseExtraction({ destination_country: "South Korea", position: "factory worker" }));
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "private_agency_korea_e9")).toBe(false);
    }
  });

  it("private_agency_korea_e9: agency + Korea + unrelated position => absent", () => {
    const result = scorePost(
      baseExtraction({ agency_name: "ABC Agency", destination_country: "South Korea", position: "caregiver" }),
    );
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "private_agency_korea_e9")).toBe(false);
    }
  });

  it("private_agency_korea_e9: agency + non-Korea destination + factory keyword => absent", () => {
    const result = scorePost(
      baseExtraction({ agency_name: "ABC Agency", destination_country: "Poland", position: "factory worker" }),
    );
    if (result.kind === "scored") {
      expect(result.flags.some((f) => f.flag === "private_agency_korea_e9")).toBe(false);
    }
  });
});

describe("scorePost — reasons[] names evidence", () => {
  it("reasons is non-empty and includes the evidence quote when verdict is CAUTION/HIGH_RISK", () => {
    const result = scorePost(
      baseExtraction({ red_flags: [{ flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" }] }),
    );
    if (result.kind === "scored") {
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain("Processing fee lang na ₱15,000");
    }
  });
});

describe("combineVerdict — worst-of severity", () => {
  const severities: Verdict[] = ["VERIFIED", "CAUTION", "HIGH_RISK"];

  it("resolves every registry x post combination to the max severity", () => {
    for (const registry of severities) {
      for (const post of severities) {
        const expected = severities[Math.max(severities.indexOf(registry), severities.indexOf(post))];
        expect(combineVerdict(registry, post)).toBe(expected);
      }
    }
  });
});
