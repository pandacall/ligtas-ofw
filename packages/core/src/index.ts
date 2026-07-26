// registry.ts (agency/job-order lookups) lands here in a later ticket.
// Zero Next.js/HTTP imports are allowed in this directory — see
// scripts/check-core-boundary.ts, which enforces this mechanically.
import { DB_PLACEHOLDER } from "@ligtas-ofw/db";

export const CORE_PLACEHOLDER = `core:${DB_PLACEHOLDER}`;

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
export { FLAG_SEVERITY, scorePost, combineVerdict } from "./verdict";
