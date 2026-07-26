import { describe, expect, it } from "vitest";
import { trigramSimilarity } from "./similarity";

const CANONICAL = "XYZ International Placement Agency, Inc.";

describe("trigramSimilarity", () => {
  it("is 1 for identical strings (modulo normalization)", () => {
    expect(trigramSimilarity(CANONICAL, CANONICAL)).toBe(1);
    expect(trigramSimilarity("xyz international placement agency inc", CANONICAL)).toBe(1);
  });

  it("is symmetric", () => {
    expect(trigramSimilarity("XYZ Intl Placement", CANONICAL)).toBe(trigramSimilarity(CANONICAL, "XYZ Intl Placement"));
  });

  it("is 0 when either input normalizes to empty", () => {
    expect(trigramSimilarity("", CANONICAL)).toBe(0);
    expect(trigramSimilarity("   ", CANONICAL)).toBe(0);
  });

  // Calibration against starter/verdict-cases.md — these three land in the fuzzy-matching
  // buckets issue #4 requires: R4 auto-matches (>=0.55), R5 is a "did you mean" (>=0.4, <0.55),
  // R6 is not-found (<0.4). Dice was chosen over raw Jaccard/pg_trgm's literal formula because
  // Jaccard under-scores a short abbreviated query against a long canonical name (0.425 for R4,
  // below the 0.55 auto-match bar).
  it("R4: a short abbreviation of the canonical name scores >= 0.55 (auto-match bucket)", () => {
    expect(trigramSimilarity("XYZ Intl Placement", CANONICAL)).toBeGreaterThanOrEqual(0.55);
  });

  it("R5: a sparser partial name scores between 0.4 and 0.55 (did-you-mean bucket)", () => {
    const sim = trigramSimilarity("XYZ Placement", CANONICAL);
    expect(sim).toBeGreaterThanOrEqual(0.4);
    expect(sim).toBeLessThan(0.55);
  });

  it("R6: an unrelated name scores below 0.4 (not-found bucket)", () => {
    expect(trigramSimilarity("Totally Unknown Agency", CANONICAL)).toBeLessThan(0.4);
  });
});
