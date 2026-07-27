/**
 * LLM eval harness (CLAUDE.md "measure first" / ADR-0003, issue #10): grades the real
 * Extractor + real verdict engine against starter/fixtures-posts.json. Per that file's
 * _readme, the gate compares the pre-registry Post Verdict only — registry lookup is a
 * separate layer — so this never touches scanPost/checkAgency, just runExtractor +
 * filterUnverifiedFlags + scorePost, the same building blocks scanPost composes.
 */
import type { Extraction, RedFlag } from "./extraction";
import { filterUnverifiedFlags } from "./extraction";
import type { ExtractorClient } from "./scan";
import { runExtractor } from "./scan";
import { scorePost, type Verdict } from "./verdict";

const PASS_THRESHOLD = 0.9;

export type EvalVerdict = Verdict | "NOT_A_JOB_POST" | "UNANALYZABLE";

export type EvalFixtureExpect = {
  agency_name?: string;
  license_no_claimed?: string;
  position?: string;
  destination_country?: string;
  salary?: string;
  fees_mentioned?: boolean;
  visa_type_mentioned?: string;
  red_flags: string[];
  verdict: Exclude<EvalVerdict, "UNANALYZABLE">;
  note?: string;
};

export type EvalFixture = { id: string; text: string; expect: EvalFixtureExpect };
export type EvalFixtureFile = { _readme: string; scam: EvalFixture[]; legit: EvalFixture[] };

export function flattenFixtures(file: EvalFixtureFile): EvalFixture[] {
  return [...file.scam, ...file.legit];
}

export type FixtureGrade = {
  id: string;
  expectedVerdict: EvalVerdict;
  actualVerdict: EvalVerdict;
  verdictMatch: boolean;
  observedFlags: RedFlag[];
  expectedFlags: string[];
  evidenceViolations: number;
  fieldMismatches: string[];
};

export type EvalReport = {
  total: number;
  correct: number;
  accuracy: number;
  passed: boolean;
  grades: FixtureGrade[];
  diagnostics: {
    flagPrecision: number;
    flagRecall: number;
    totalEvidenceViolations: number;
    fieldAccuracy: number;
  };
};

// Fields directly comparable between EvalFixtureExpect and Extraction (same name on both).
const DIRECT_FIELDS = ["agency_name", "license_no_claimed", "position", "destination_country", "visa_type_mentioned"] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fieldMatches(expected: string, actual: string | null): boolean {
  if (actual === null) return false;
  const e = normalize(expected);
  const a = normalize(actual);
  return e === a || a.includes(e) || e.includes(a);
}

// Names of every expect.* field this harness can diagnose, present only when the fixture
// defines it — the single source of truth for both "how many fields are comparable"
// (runFixtureEval's fieldAccuracy denominator) and "which ones mismatched" (compareFields).
function comparableFieldNames(expect: EvalFixtureExpect): string[] {
  const names: string[] = [...DIRECT_FIELDS.filter((field) => expect[field] !== undefined)];
  if (expect.salary !== undefined) names.push("salary");
  if (expect.fees_mentioned !== undefined) names.push("fees_mentioned");
  return names;
}

function compareFields(expect: EvalFixtureExpect, extraction: Extraction): string[] {
  return comparableFieldNames(expect).filter((name) => {
    if (name === "salary") return !fieldMatches(expect.salary as string, extraction.salary_raw);
    if (name === "fees_mentioned") {
      // (precedence note: `extraction.fees.length > 0` evaluates before the `!==` comparison)
      return expect.fees_mentioned !== extraction.fees.length > 0;
    }
    const key = name as (typeof DIRECT_FIELDS)[number];
    return !fieldMatches(expect[key] as string, extraction[key]);
  });
}

async function gradeFixture(fixture: EvalFixture, extractor: ExtractorClient): Promise<FixtureGrade> {
  const expectedVerdict = fixture.expect.verdict;
  const extraction = await runExtractor({ kind: "text", text: fixture.text }, extractor);

  if (extraction === null) {
    return {
      id: fixture.id,
      expectedVerdict,
      actualVerdict: "UNANALYZABLE",
      verdictMatch: false,
      observedFlags: [],
      expectedFlags: fixture.expect.red_flags,
      evidenceViolations: 0,
      // No extraction to compare against — every comparable field counts as a miss,
      // not a silent match (fieldAccuracy should degrade here too, same as verdictMatch).
      fieldMismatches: comparableFieldNames(fixture.expect),
    };
  }

  const filteredFlags = filterUnverifiedFlags(extraction.red_flags, fixture.text);
  const evidenceViolations = extraction.red_flags.length - filteredFlags.length;
  const filtered: Extraction = { ...extraction, red_flags: filteredFlags };

  const postResult = scorePost(filtered);
  // scorePost never actually returns "unanalyzable" (that kind exists only because
  // PostVerdictResult is shared with the future extractor-retry wrapper — see verdict.ts),
  // but the type union requires handling it to narrow to `.verdict`.
  const actualVerdict: EvalVerdict =
    postResult.kind === "not_a_job_post"
      ? "NOT_A_JOB_POST"
      : postResult.kind === "unanalyzable"
        ? "UNANALYZABLE"
        : postResult.verdict;

  return {
    id: fixture.id,
    expectedVerdict,
    actualVerdict,
    verdictMatch: actualVerdict === expectedVerdict,
    observedFlags: filteredFlags.map((f) => f.flag),
    expectedFlags: fixture.expect.red_flags,
    evidenceViolations,
    fieldMismatches: compareFields(fixture.expect, filtered),
  };
}

export async function runFixtureEval(fixtures: EvalFixture[], extractor: ExtractorClient): Promise<EvalReport> {
  const grades: FixtureGrade[] = [];
  // Sequential, not Promise.all: keeps free-tier request pacing predictable (ADR-0003's
  // 20 req/min limit) and per-fixture ordering deterministic for reporting.
  for (const fixture of fixtures) {
    grades.push(await gradeFixture(fixture, extractor));
  }

  const total = grades.length;
  const correct = grades.filter((g) => g.verdictMatch).length;
  const accuracy = total === 0 ? 1 : correct / total;

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let totalEvidenceViolations = 0;
  let comparableFields = 0;
  let mismatchedFields = 0;

  for (const grade of grades) {
    const observed = new Set(grade.observedFlags as string[]);
    const expected = new Set(grade.expectedFlags);
    for (const flag of observed) {
      if (expected.has(flag)) tp += 1;
      else fp += 1;
    }
    for (const flag of expected) {
      if (!observed.has(flag)) fn += 1;
    }
    totalEvidenceViolations += grade.evidenceViolations;
    mismatchedFields += grade.fieldMismatches.length;
  }

  for (const fixture of fixtures) {
    comparableFields += comparableFieldNames(fixture.expect).length;
  }

  return {
    total,
    correct,
    accuracy,
    passed: accuracy >= PASS_THRESHOLD,
    grades,
    diagnostics: {
      flagPrecision: tp + fp === 0 ? 1 : tp / (tp + fp),
      flagRecall: tp + fn === 0 ? 1 : tp / (tp + fn),
      totalEvidenceViolations,
      fieldAccuracy: comparableFields === 0 ? 1 : 1 - mismatchedFields / comparableFields,
    },
  };
}
