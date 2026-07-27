/**
 * scanPost: the Core entry point for the job-post scan. Wires an injected Extractor
 * client through the Zod retry/degrade safety net (ADR-0002/0003), the evidence-substring
 * anti-hallucination guard, scorePost, and checkAgency, then combines via worst-of.
 * The Extractor client itself (the actual HTTP call) is injected — this file has zero
 * fetch/HTTP — see scripts/check-core-boundary.ts.
 */
import { EXTRACTION_SYSTEM_PROMPT, Extraction, filterUnverifiedFlags, licenseFormatIsValid } from "./extraction";
import type { PostVerdictResult, Verdict } from "./verdict";
import { combineVerdict, scorePost } from "./verdict";
import type { RegistryState, RegistryVerdictResult } from "./registry";
import { checkAgency } from "./registry";

export type ExtractorMessage = { role: "system" | "user"; content: string };
export type ExtractorClient = (messages: ExtractorMessage[]) => Promise<unknown>;

export type ScanResult =
  | { kind: "not_a_job_post" }
  | { kind: "unanalyzable" }
  // Quota protection (issue #11): produced by the Surface calling checkAndConsumeQuota
  // (quota.ts) before ever invoking scanPost — scanPost itself never returns these.
  | { kind: "quota_exhausted" }
  | { kind: "rate_limited" }
  | {
      kind: "scored";
      verdict: Verdict;
      post: Extract<PostVerdictResult, { kind: "scored" }>;
      // Present only when the Extraction named an agency (a registry lookup ran).
      registry?: RegistryVerdictResult;
      // Present only when a license number was claimed AND its format is valid — a valid
      // format never counts toward VERIFIED (trivially forgeable), so the Surface must show
      // it with the deflationary neutral copy, never as reassurance (verdict-cases.md Copy
      // rules). An invalid-format claim instead surfaces via the invalid_license_format flag
      // in post.flags, so it needs no separate field here.
      validFormatLicenseClaim?: string;
    };

type ExtractCallResult =
  | { ok: true; value: Extraction }
  | { ok: false; cause: "network"; error: string }
  | { ok: false; cause: "validation"; error: string };

async function callExtractor(extractor: ExtractorClient, messages: ExtractorMessage[]): Promise<ExtractCallResult> {
  let raw: unknown;
  try {
    raw = await extractor(messages);
  } catch (err) {
    return { ok: false, cause: "network", error: err instanceof Error ? err.message : String(err) };
  }
  const parsed = Extraction.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return { ok: false, cause: "validation", error: parsed.error.message };
}

function retryMessageFor(failure: Extract<ExtractCallResult, { ok: false }>): ExtractorMessage {
  const content =
    failure.cause === "validation"
      ? `Your previous response failed schema validation: ${failure.error}. Return corrected JSON matching the schema exactly.`
      : `Your previous request failed: ${failure.error}. Please try again and return JSON matching the schema exactly.`;
  return { role: "user", content };
}

export async function runExtractor(text: string, extractor: ExtractorClient): Promise<Extraction | null> {
  const messages: ExtractorMessage[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    { role: "user", content: text },
  ];

  const first = await callExtractor(extractor, messages);
  if (first.ok) return first.value;

  // Retry once with the error appended (Zod parse failure or a thrown/network error) —
  // never a third attempt, and never a guessed verdict if this also fails.
  const retryMessages: ExtractorMessage[] = [...messages, retryMessageFor(first)];

  const second = await callExtractor(extractor, retryMessages);
  return second.ok ? second.value : null;
}

export async function scanPost(
  text: string,
  deps: { extractor: ExtractorClient; registryState: RegistryState; now?: Date },
): Promise<ScanResult> {
  const extraction = await runExtractor(text, deps.extractor);
  if (extraction === null) {
    return { kind: "unanalyzable" };
  }

  const filteredExtraction: Extraction = {
    ...extraction,
    red_flags: filterUnverifiedFlags(extraction.red_flags, text),
  };

  const postResult = scorePost(filteredExtraction);
  if (postResult.kind !== "scored") {
    return postResult;
  }

  const validFormatLicenseClaim =
    filteredExtraction.license_no_claimed && licenseFormatIsValid(filteredExtraction.license_no_claimed)
      ? filteredExtraction.license_no_claimed
      : undefined;

  if (!filteredExtraction.agency_name) {
    return { kind: "scored", verdict: postResult.verdict, post: postResult, validFormatLicenseClaim };
  }

  const registryResult = checkAgency(filteredExtraction.agency_name, deps.registryState, deps.now);
  const verdict = combineVerdict(registryResult.verdict, postResult.verdict);

  return { kind: "scored", verdict, post: postResult, registry: registryResult, validFormatLicenseClaim };
}
