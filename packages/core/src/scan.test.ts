import { describe, expect, it } from "vitest";
import type { Extraction } from "./extraction";
import type { ExtractorClient, ExtractorMessage } from "./scan";
import { scanPost } from "./scan";
import { loadFixtureRegistryState } from "./registry";

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

const XYZ_AGENCY_NAME = "XYZ International Placement Agency, Inc.";

describe("scanPost — verdict-cases.md P1-P7", () => {
  it("P1 (scam-01): a single critical flag, no agency name => HIGH_RISK, no registry lookup", async () => {
    const extractor = fakeExtractor([
      baseExtraction({
        position: "factory worker",
        red_flags: [{ flag: "upfront_fee", evidence_quote: "Processing fee lang na ₱15,000" }],
      }),
    ]);
    const result = await scanPost("Processing fee lang na ₱15,000 para sa medical.", {
      extractor,
      registryState: loadFixtureRegistryState(),
    });
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
    if (result.kind === "scored") {
      expect(result.registry).toBeUndefined();
    }
  });

  it("P2 (scam-03): trafficking corridor destination alone => HIGH_RISK", async () => {
    const text = "Customer Service Representatives for CAMBODIA. Basic English lang.";
    const extractor = fakeExtractor([
      baseExtraction({
        red_flags: [{ flag: "trafficking_corridor_destination", evidence_quote: "Customer Service Representatives for CAMBODIA" }],
      }),
    ]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
  });

  it("P3 (scam-15 impersonation): registry VERIFIED + post HIGH_RISK => combined HIGH_RISK (worst-of), demoable end-to-end", async () => {
    const text =
      "OFFICIAL POST from XYZ International Placement Agency, Inc. — hiring nurses for UK. " +
      "Note: bagong Facebook page po ito, yung luma ay na-hack. Wag na po tumawag sa landline.";
    const extractor = fakeExtractor([
      baseExtraction({
        agency_name: XYZ_AGENCY_NAME,
        position: "nurse",
        destination_country: "UK",
        red_flags: [
          { flag: "page_hijack_pattern", evidence_quote: "bagong Facebook page po ito, yung luma ay na-hack" },
          { flag: "avoid_official_contact_instruction", evidence_quote: "Wag na po tumawag sa landline" },
        ],
      }),
    ]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState(), now: new Date("2026-07-27T00:00:00.000Z") });
    expect(result).toMatchObject({ kind: "scored", verdict: "HIGH_RISK" });
    if (result.kind === "scored") {
      expect(result.registry).toBeDefined();
      expect(result.registry?.verdict).toBe("VERIFIED");
      expect(result.post.verdict).toBe("HIGH_RISK");
    }
  });

  it("P4 (legit-01): no red flags, agency name present + VERIFIED registry => combined VERIFIED", async () => {
    const text = "JOB ORDER: Household Service Workers for Saudi Arabia. Zero placement fee po.";
    const extractor = fakeExtractor([baseExtraction({ agency_name: XYZ_AGENCY_NAME, position: "household service worker" })]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState(), now: new Date("2026-07-27T00:00:00.000Z") });
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
  });

  it("P5 (legit-04): 'URGENT' alone, no other flags, no agency name => VERIFIED", async () => {
    const text = "URGENT: 10 welders (6G) for Bahrain, BD 220/month. Final interview with employer.";
    const extractor = fakeExtractor([baseExtraction({ position: "welder", destination_country: "Bahrain" })]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
  });

  it("R1/R2-style: a valid-format claimed license surfaces as validFormatLicenseClaim, never as a flag or a VERIFIED boost", async () => {
    const text = "XYZ International Placement Agency, Inc., DMW License No. DMW-072-LB-09262023-UL.";
    const extractor = fakeExtractor([baseExtraction({ license_no_claimed: "DMW-072-LB-09262023-UL" })]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED", validFormatLicenseClaim: "DMW-072-LB-09262023-UL" });
    if (result.kind === "scored") {
      expect(result.post.flags).toHaveLength(0);
    }
  });

  it("P6 (legit-05): not a job post => not_a_job_post, no registry lookup", async () => {
    const text = "PSA sa mga kababayan: bago mag-apply abroad, i-verify muna ang agency sa DMW website.";
    const extractor = fakeExtractor([baseExtraction({ is_job_post: false, agency_name: null })]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toEqual({ kind: "not_a_job_post" });
  });

  it("P7: extraction schema parse fails twice => unanalyzable", async () => {
    const extractor = fakeExtractor([{ not_even_close_to_the_schema: true }, { still_wrong: true }]);
    const result = await scanPost("some post text", { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toEqual({ kind: "unanalyzable" });
    expect(extractor.calls).toHaveLength(2);
    // The retry message must append the Zod error so the model can self-correct.
    const retryMessage = extractor.calls[1]?.at(-1);
    expect(retryMessage?.role).toBe("user");
    expect(retryMessage?.content).toMatch(/schema/i);
  });

  it("P7 variant: the extractor throws (network/auth failure) twice => unanalyzable, retry wording doesn't claim a schema failure", async () => {
    const extractor = fakeExtractor([new Error("401 Unauthorized"), new Error("401 Unauthorized")]);
    const result = await scanPost("some post text", { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toEqual({ kind: "unanalyzable" });
    expect(extractor.calls).toHaveLength(2);
    const retryMessage = extractor.calls[1]?.at(-1);
    expect(retryMessage?.content).toContain("401 Unauthorized");
    expect(retryMessage?.content).not.toMatch(/schema validation/i);
  });

  it("P7 variant: first call fails, retry succeeds => scored result (retry actually recovers)", async () => {
    const extractor = fakeExtractor([
      { garbage: true },
      baseExtraction({ position: "welder" }),
    ]);
    const result = await scanPost("some post text", { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
    expect(extractor.calls).toHaveLength(2);
  });
});

describe("scanPost — evidence-substring guard is wired in", () => {
  it("drops a red flag whose evidence_quote is not a substring of the input text before scoring", async () => {
    const text = "Legit post with no fees mentioned anywhere.";
    const extractor = fakeExtractor([
      baseExtraction({
        red_flags: [{ flag: "upfront_fee", evidence_quote: "Pay ₱50,000 upfront immediately" }],
      }),
    ]);
    const result = await scanPost(text, { extractor, registryState: loadFixtureRegistryState() });
    expect(result).toMatchObject({ kind: "scored", verdict: "VERIFIED" });
    if (result.kind === "scored") {
      expect(result.post.flags).toHaveLength(0);
    }
  });
});
