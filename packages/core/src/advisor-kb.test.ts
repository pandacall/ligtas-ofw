import { describe, expect, it } from "vitest";
import { ADVISOR_KB, kbEntryById, matchKbEntries, resolveKbIds } from "./advisor-kb";

describe("ADVISOR_KB integrity", () => {
  it("has unique ids", () => {
    const ids = ADVISOR_KB.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The whole point of the corpus: the model selects entries, it never authors them, and
  // every rendered claim must be checkable by the user (ADR-0005).
  it("every entry has a non-empty answer and a verifiable source URL", () => {
    for (const entry of ADVISOR_KB) {
      expect(entry.answer.trim().length, `${entry.id} answer`).toBeGreaterThan(0);
      expect(entry.topic.trim().length, `${entry.id} topic`).toBeGreaterThan(0);
      expect(entry.source, `${entry.id} source`).toMatch(/^https:\/\//);
    }
  });

  it("every entry has at least one keyword, all lowercase", () => {
    for (const entry of ADVISOR_KB) {
      expect(entry.keywords.length, `${entry.id} keywords`).toBeGreaterThan(0);
      for (const keyword of entry.keywords) {
        expect(keyword, `${entry.id} keyword "${keyword}"`).toBe(keyword.toLowerCase());
      }
    }
  });

  it("covers the domain rules the verdict engine scores against (CLAUDE.md)", () => {
    const ids = new Set(ADVISOR_KB.map((entry) => entry.id));
    for (const required of [
      "placement-fee-cap",
      "hsw-seafarer-no-fee",
      "no-fee-before-job-order",
      "korea-e9-eps-only",
      "tourist-visa-deployment",
      "trafficking-corridor",
      "license-format",
    ]) {
      expect(ids.has(required), `missing KB entry: ${required}`).toBe(true);
    }
  });

  it("covers the after-the-fact help paths (report, complain, hotlines, already abroad)", () => {
    const ids = new Set(ADVISOR_KB.map((entry) => entry.id));
    for (const required of ["na-scam-ano-gagawin", "file-complaint", "hotlines", "already-abroad-in-trouble"]) {
      expect(ids.has(required), `missing KB entry: ${required}`).toBe(true);
    }
  });

  it("the HSW/seafarer entry states zero fee, not a reduced fee", () => {
    const entry = kbEntryById("hsw-seafarer-no-fee");
    expect(entry?.answer).toMatch(/WALANG placement fee/);
  });

  it("the license-format entry refuses to treat a well-formed number as proof", () => {
    const entry = kbEntryById("license-format");
    expect(entry?.answer).toMatch(/HINDI patunay/);
  });

  it("the self-description entry carries the not-affiliated-with-DMW disclaimer", () => {
    const entry = kbEntryById("what-is-ligtasofw");
    expect(entry?.answer).toMatch(/hindi opisyal/);
    expect(entry?.answer).toMatch(/walang kaugnayan sa DMW/);
  });
});

describe("resolveKbIds", () => {
  it("resolves known ids in the given order", () => {
    const resolved = resolveKbIds(["hotlines", "placement-fee-cap"]);
    expect(resolved.map((entry) => entry.id)).toEqual(["hotlines", "placement-fee-cap"]);
  });

  // A hallucinated id must resolve to nothing rather than to invented advice.
  it("drops ids that do not exist", () => {
    const resolved = resolveKbIds(["placement-fee-cap", "totally-made-up-entry"]);
    expect(resolved.map((entry) => entry.id)).toEqual(["placement-fee-cap"]);
  });

  it("collapses duplicates to the first occurrence", () => {
    const resolved = resolveKbIds(["hotlines", "hotlines"]);
    expect(resolved).toHaveLength(1);
  });

  it("returns an empty array when nothing resolves", () => {
    expect(resolveKbIds(["nope", "also-nope"])).toEqual([]);
  });
});

describe("matchKbEntries (zero-LLM fast path)", () => {
  it.each([
    ["magkano ang legal na placement fee?", "placement-fee-cap"],
    ["HSW po ako, may bayad ba?", "hsw-seafarer-no-fee"],
    ["may alok sa akin na Korea E-9 factory work", "korea-e9-eps-only"],
    ["sabi tourist visa muna tapos convert later", "tourist-visa-deployment"],
    ["papunta raw ako Cambodia, customer service", "trafficking-corridor"],
    ["na-scam na ako, ano gagawin ko?", "na-scam-ano-gagawin"],
    ["ano ang hotline ng DMW?", "hotlines"],
    ["sino ka ba?", "what-is-ligtasofw"],
  ])("routes %j to %s", (question, expectedId) => {
    const matches = matchKbEntries(question);
    expect(matches.map((entry) => entry.id)).toContain(expectedId);
  });

  it("is case-insensitive", () => {
    expect(matchKbEntries("MAGKANO ANG PLACEMENT FEE").map((e) => e.id)).toContain("placement-fee-cap");
  });

  it("returns nothing for text with no keyword hit, so the turn falls through to the Router", () => {
    expect(matchKbEntries("kumusta ka ngayong umaga")).toEqual([]);
  });

  it("ranks the entry with more keyword hits first", () => {
    const matches = matchKbEntries("cambodia scam farm crypto job");
    expect(matches[0]?.id).toBe("trafficking-corridor");
  });

  it("respects the limit", () => {
    expect(matchKbEntries("placement fee hotline lisensya na-scam", 2)).toHaveLength(2);
  });
});
