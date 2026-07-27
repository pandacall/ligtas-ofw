// Zero Next.js/HTTP imports are allowed in this directory — see
// scripts/check-core-boundary.ts, which enforces this mechanically.

export {
  Extraction,
  RedFlag,
  EXTRACTION_SYSTEM_PROMPT,
  normalizeLicenseNumber,
  licenseFormatIsValid,
  filterUnverifiedFlags,
} from "./extraction";
export type {
  Verdict,
  FlagTier,
  DerivedFlag,
  ScoredFlag,
  PostVerdictResult,
} from "./verdict";
export { FLAG_SEVERITY, scorePost, combineVerdict, worstVerdict } from "./verdict";
export type { RegistryState, RegistryVerdictResult, ClaimedJobOrder } from "./registry";
export { checkAgency, loadFixtureRegistryState, LICENSE_STATUS_SEVERITY } from "./registry";
export { formatDate } from "./format";
export type { JobOrder } from "@ligtas-ofw/db";
// Re-exported so apps/web (which depends on core only, never on @ligtas-ofw/db directly)
// can construct the real db client to wire into createPostgresQuotaStore.
export { createDbClient } from "@ligtas-ofw/db";
export type { ExtractorClient, ExtractorMessage, ScanResult } from "./scan";
export { scanPost, runExtractor } from "./scan";
export type { QuotaConfig, QuotaStore, QuotaCheckResult } from "./quota";
export { checkAndConsumeQuota } from "./quota";
export { createPostgresQuotaStore } from "./quota-store";
export {
  FLAG_COPY,
  VERDICT_BANNER,
  NOT_A_JOB_POST_COPY,
  UNANALYZABLE_COPY,
  LICENSE_FORMAT_NEUTRAL_COPY,
  QUOTA_EXHAUSTED_COPY,
  RATE_LIMITED_COPY,
} from "./copy";
export type { FlagCopyTemplate } from "./copy";
export type {
  EvalVerdict,
  EvalFixture,
  EvalFixtureExpect,
  EvalFixtureFile,
  FixtureGrade,
  EvalReport,
} from "./eval";
export { flattenFixtures, runFixtureEval } from "./eval";
