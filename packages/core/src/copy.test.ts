import { describe, expect, it } from "vitest";
import { RedFlag } from "./extraction";
import { DERIVED_FLAGS } from "./verdict";
import { FLAG_COPY, LICENSE_FORMAT_NEUTRAL_COPY, NOT_A_JOB_POST_COPY, UNANALYZABLE_COPY, VERDICT_BANNER } from "./copy";

describe("FLAG_COPY table", () => {
  it("covers every RedFlag enum member exactly once", () => {
    for (const flag of RedFlag.options) {
      expect(FLAG_COPY[flag]).toBeDefined();
    }
  });

  it("covers both derived flags", () => {
    for (const flag of DERIVED_FLAGS) {
      expect(FLAG_COPY[flag]).toBeDefined();
    }
  });

  it("has exactly 42 entries (40 RedFlag + 2 Derived Flags)", () => {
    expect(Object.keys(FLAG_COPY)).toHaveLength(42);
  });

  it("every template names the evidence it was given", () => {
    const evidenceMarker = "UNIQUE_EVIDENCE_MARKER_12345";
    for (const flag of [...RedFlag.options, ...DERIVED_FLAGS] as (keyof typeof FLAG_COPY)[]) {
      expect(FLAG_COPY[flag](evidenceMarker)).toContain(evidenceMarker);
    }
  });

  it("upfront_fee names the fee and the before-signed-job-order rule (copy-rules worked example)", () => {
    const template = FLAG_COPY.upfront_fee;
    const copy = template('Processing fee lang na ₱15,000 para sa medical at training.');
    expect(copy).toContain("₱15,000");
    expect(copy).toMatch(/bago ang pirmadong job order/);
  });
});

describe("VERDICT_BANNER", () => {
  it("covers all three verdict severities", () => {
    expect(VERDICT_BANNER.VERIFIED).toBeTruthy();
    expect(VERDICT_BANNER.CAUTION).toBeTruthy();
    expect(VERDICT_BANNER.HIGH_RISK).toBeTruthy();
  });
});

describe("Escape-hatch and license-format copy", () => {
  it("NOT_A_JOB_POST_COPY and UNANALYZABLE_COPY are non-empty and distinct", () => {
    expect(NOT_A_JOB_POST_COPY.length).toBeGreaterThan(0);
    expect(UNANALYZABLE_COPY.length).toBeGreaterThan(0);
    expect(NOT_A_JOB_POST_COPY).not.toBe(UNANALYZABLE_COPY);
  });

  it("a valid-format license claim is never presented as reassurance (verdict-cases.md Copy rules)", () => {
    expect(LICENSE_FORMAT_NEUTRAL_COPY).toMatch(/checks the format only/);
    expect(LICENSE_FORMAT_NEUTRAL_COPY).toMatch(/hindi ito kumpirmasyon/);
  });
});
