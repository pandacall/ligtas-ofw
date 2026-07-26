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
export type { RegistryState, RegistryVerdictResult } from "./registry";
export { checkAgency, loadFixtureRegistryState, formatDate, LICENSE_STATUS_SEVERITY } from "./registry";
