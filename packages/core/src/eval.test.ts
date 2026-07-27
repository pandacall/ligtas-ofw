import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Extraction } from "./extraction";
import type { ExtractorClient, ExtractorMessage } from "./scan";
import type { EvalFixture, EvalFixtureFile } from "./eval";
import { flattenFixtures, runFixtureEval } from "./eval";

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

// Queues a sequence of responses (a plain value to resolve with, or an Error instance
// to throw) so tests can exercise the first-call/retry/second-call sequence explicitly.
function fakeExtractor(responses: Array<unknown | Error>): ExtractorClient & { calls: ExtractorMessage[][] } {
  const calls: ExtractorMessage[][] = [];
  const client = (async (messages: ExtractorMessage[]) => {
    calls.push(messages);
    const response = responses[calls.length - 1];
    if (response instanceof Error) throw response;
    return response;
  }) as ExtractorClient & { calls: ExtractorMessage[][] };
  client.calls = calls;
  return client;
}

// Queues one canned extraction per fixture, matched by call order (fixtures are graded
// sequentially by runFixtureEval, so order lines up with the order fixtures are passed in).
function sequencedExtractor(responses: Array<unknown | Error>): ExtractorClient {
  let call = 0;
  return async () => {
    const response = responses[call];
    call += 1;
    if (response instanceof Error) throw response;
    return response;
  };
}

function fixture(id: string, text: string, expect: EvalFixture["expect"]): EvalFixture {
  return { id, text, expect };
}

describe("flattenFixtures", () => {
  it("concatenates scam and legit fixtures", () => {
    const file: EvalFixtureFile = {
      _readme: "readme",
      scam: [fixture("scam-01", "text a", { red_flags: [], verdict: "HIGH_RISK" })],
      legit: [fixture("legit-01", "text b", { red_flags: [], verdict: "VERIFIED" })],
    };
    expect(flattenFixtures(file)).toEqual([file.scam[0], file.legit[0]]);
  });
});

describe("runFixtureEval — verdict gate", () => {
  it("scores a perfect run as 100% and passes the gate, across HIGH_RISK/CAUTION/VERIFIED/NOT_A_JOB_POST", async () => {
    const fixtures = [
      fixture("f-high-risk", "Processing fee lang na ₱15,000 para sa medical.", {
        red_flags: ["upfront_fee"],
        verdict: "HIGH_RISK",
      }),
      fixture("f-caution", "May konting delay sa processing, sabi ng recruiter sa Messenger.", {
        red_flags: ["chat_only_interview"],
        verdict: "CAUTION",
      }),
      fixture("f-verified", "Household Service Worker for Saudi Arabia, zero placement fee.", {
        red_flags: [],
        verdict: "VERIFIED",
      }),
      fixture("f-not-a-job-post", "PSA: verify your agency on the DMW website before applying.", {
        red_flags: [],
        verdict: "NOT_A_JOB_POST",
      }),
    ];
    const extractor = sequencedExtractor([
      baseExtraction({
        red_flags: [{ flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" }],
      }),
      baseExtraction({
        red_flags: [{ flag: "chat_only_interview", evidence_quote: "sa Messenger" }],
      }),
      baseExtraction({}),
      baseExtraction({ is_job_post: false }),
    ]);

    const report = await runFixtureEval(fixtures, extractor);

    expect(report.accuracy).toBe(1);
    expect(report.passed).toBe(true);
    expect(report.correct).toBe(report.total);
    expect(report.grades.map((g) => g.actualVerdict)).toEqual(["HIGH_RISK", "CAUTION", "VERIFIED", "NOT_A_JOB_POST"]);
  });

  it("grades a fixture UNANALYZABLE when extraction fails twice, and it never counts as a match", async () => {
    const fixtures = [fixture("f-unanalyzable", "some post text", { red_flags: [], verdict: "HIGH_RISK" })];
    const extractor = fakeExtractor([{ not_even_close: true }, { still_wrong: true }]);

    const report = await runFixtureEval(fixtures, extractor);

    expect(report.grades[0]?.actualVerdict).toBe("UNANALYZABLE");
    expect(report.grades[0]?.verdictMatch).toBe(false);
    expect(report.accuracy).toBe(0);
    expect(report.passed).toBe(false);
  });

  it("the 90% gate is exact: 18/20 passes, 17/20 fails", async () => {
    const fixtures: EvalFixture[] = Array.from({ length: 20 }, (_, i) =>
      fixture(`f-${i}`, `job post text number ${i}`, { red_flags: [], verdict: "VERIFIED" }),
    );

    const responses18 = fixtures.map((_, i) => (i < 18 ? baseExtraction({}) : baseExtraction({ is_job_post: false })));
    const report18 = await runFixtureEval(fixtures, sequencedExtractor(responses18));
    expect(report18.accuracy).toBe(0.9);
    expect(report18.passed).toBe(true);

    const responses17 = fixtures.map((_, i) => (i < 17 ? baseExtraction({}) : baseExtraction({ is_job_post: false })));
    const report17 = await runFixtureEval(fixtures, sequencedExtractor(responses17));
    expect(report17.accuracy).toBe(0.85);
    expect(report17.passed).toBe(false);
  });
});

describe("runFixtureEval — diagnostics are reported but never gate", () => {
  it("computes flag precision/recall and evidence-substring violations without affecting the verdict gate", async () => {
    const fixtures = [
      // A false-positive flag with real (unfiltered) evidence hurts precision; a second
      // flag with fabricated evidence gets dropped by the guard and counts as a violation.
      fixture(
        "f-extra-flags",
        "Processing fee lang na ₱15,000 para sa medical. Kailangan din ng insider connection daw para mabilis makuha slot.",
        { red_flags: ["upfront_fee"], verdict: "HIGH_RISK" },
      ),
      // Omits one expected flag: hurts recall, but the verdict is still HIGH_RISK via the other critical flag.
      fixture("f-missing-flag", "Tourist visa muna kayo, tapos i-convert na lang po pagdating. Fake certificate offer din.", {
        red_flags: ["tourist_visa_deployment", "fake_certificate_offer"],
        verdict: "HIGH_RISK",
      }),
      // Perfect control case (single WARNING flag => CAUTION, per the severity table).
      fixture("f-perfect", "No experience needed, walang required credentials, libre lahat.", {
        red_flags: ["no_credentials_needed_claim"],
        verdict: "CAUTION",
      }),
    ];
    const extractor = sequencedExtractor([
      baseExtraction({
        red_flags: [
          { flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" },
          { flag: "insider_connection_claim", evidence_quote: "Kailangan din ng insider connection daw" },
          { flag: "salary_anomaly", evidence_quote: "this evidence quote is not in the source text at all" },
        ],
      }),
      baseExtraction({
        red_flags: [{ flag: "tourist_visa_deployment", evidence_quote: "Tourist visa muna kayo" }],
      }),
      baseExtraction({
        red_flags: [{ flag: "no_credentials_needed_claim", evidence_quote: "walang required credentials" }],
      }),
    ]);

    const report = await runFixtureEval(fixtures, extractor);

    expect(report.accuracy).toBe(1);
    expect(report.passed).toBe(true);
    expect(report.diagnostics.flagPrecision).toBeLessThan(1);
    expect(report.diagnostics.flagRecall).toBeLessThan(1);
    expect(report.diagnostics.totalEvidenceViolations).toBeGreaterThanOrEqual(1);
  });

  it("reports field mismatches per-grade and lowers fieldAccuracy without affecting the gate", async () => {
    const fixtures = [
      fixture("f-field-mismatch", "Factory workers for Japan, walang required credentials.", {
        position: "factory worker",
        destination_country: "Japan",
        red_flags: ["no_credentials_needed_claim"],
        verdict: "CAUTION",
      }),
    ];
    const extractor = sequencedExtractor([
      baseExtraction({
        position: "welder", // wrong on purpose
        destination_country: "Japan",
        red_flags: [{ flag: "no_credentials_needed_claim", evidence_quote: "walang required credentials" }],
      }),
    ]);

    const report = await runFixtureEval(fixtures, extractor);

    expect(report.passed).toBe(true);
    expect(report.grades[0]?.fieldMismatches).toContain("position");
    expect(report.grades[0]?.fieldMismatches).not.toContain("destination_country");
    expect(report.diagnostics.fieldAccuracy).toBeLessThan(1);
  });
});

describe("real fixture file — shape sanity (no extractor call)", () => {
  const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

  it("has 20 fixtures (15 scam + 5 legit) each with a well-formed expect block", () => {
    const raw = readFileSync(path.join(REPO_ROOT, "starter/fixtures-posts.json"), "utf-8");
    const file = JSON.parse(raw) as EvalFixtureFile;

    expect(file.scam).toHaveLength(15);
    expect(file.legit).toHaveLength(5);

    const fixtures = flattenFixtures(file);
    expect(fixtures).toHaveLength(20);

    const validVerdicts = new Set(["HIGH_RISK", "CAUTION", "VERIFIED", "NOT_A_JOB_POST"]);
    for (const f of fixtures) {
      expect(f.id.length).toBeGreaterThan(0);
      expect(f.text.length).toBeGreaterThan(0);
      expect(validVerdicts.has(f.expect.verdict)).toBe(true);
      expect(Array.isArray(f.expect.red_flags)).toBe(true);
    }
  });
});
