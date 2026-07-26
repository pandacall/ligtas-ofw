import { describe, expect, it } from "vitest";
import { normalizeAgencyName } from "./normalize";

describe("normalizeAgencyName", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeAgencyName("  XYZ   International  ")).toBe("xyz international");
  });

  it("strips punctuation (R3: 'XYZ International Placement Agency, Inc.')", () => {
    expect(normalizeAgencyName("XYZ International Placement Agency, Inc.")).toBe(
      "xyz international placement agency inc",
    );
  });

  it("strips backticks and other symbols seen in real DMW data", () => {
    expect(normalizeAgencyName("101 MOJO INT`L. CORPORATION")).toBe("101 mojo int l corporation");
  });

  it("is stable under repeated normalization (idempotent)", () => {
    const once = normalizeAgencyName("ABC Recruitment Corp.");
    expect(normalizeAgencyName(once)).toBe(once);
  });
});
