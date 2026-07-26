// extraction.ts (Extraction schema + prompt), verdict.ts (verdict engine), and
// registry.ts (agency/job-order lookups) land here in later tickets.
// Zero Next.js/HTTP imports are allowed in this directory — see
// scripts/check-core-boundary.ts, which enforces this mechanically.
import { DB_PLACEHOLDER } from "@ligtas-ofw/db";

export const CORE_PLACEHOLDER = `core:${DB_PLACEHOLDER}`;
