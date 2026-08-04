/**
 * Registry Verdict: exact-normalized name lookup (ADR-0001) + License Status + expiry.
 * Computed independently of the Post Verdict — see verdict.ts's combineVerdict/worstVerdict
 * for how the two are combined (worst-of).
 */
import type { Agency, JobOrder } from "@ligtas-ofw/db";
import {
  loadRegistrySnapshot,
  normalizeAgencyName,
  toAgencyRows,
  toJobOrderRows,
  trigramSimilarity,
} from "@ligtas-ofw/db";
import type { Verdict } from "./verdict";
import { worstVerdict } from "./verdict";
import { formatDate } from "./format";

export type RegistryState = {
  agencies: Agency[];
  jobOrders: JobOrder[];
  syncedAt: Date;
};

// A user-supplied destination/position to confirm against the agency's Job Orders
// (issue #5). Both fields are required together — a partial claim isn't scored.
export type ClaimedJobOrder = { destination: string; position: string };

export type RegistryVerdictResult =
  | { kind: "not_found"; verdict: "HIGH_RISK"; reasons: string[]; syncedAt: Date }
  | { kind: "ambiguous"; verdict: "CAUTION"; reasons: string[]; candidates: Agency[]; syncedAt: Date }
  | {
      kind: "matched";
      verdict: Verdict;
      reasons: string[];
      agency: Agency;
      // Always populated (possibly empty) so a Surface can list them (Story 7).
      jobOrders: JobOrder[];
      // undefined: no claim supplied. null: claim supplied, no match. JobOrder: matched.
      claimedMatch?: JobOrder | null;
      syncedAt: Date;
    };

// Fuzzy-match thresholds (data, not code) — starter/verdict-cases.md R4/R5/R6/R16, decided
// 2026-07-27. Trigram similarity modeled on pg_trgm; see @ligtas-ofw/db's trigramSimilarity —
// it deliberately uses a Dice coefficient rather than pg_trgm's literal Jaccard formula (see
// that module's docstring for why). These two numbers were calibrated against that Dice
// formula, not against real pg_trgm. checkAgency() still scores in-app against the full
// table rather than issuing a live SQL `similarity()` query — swapping to that (and
// re-validating R4/R5/R6/R16 against the live Jaccard-based scores, which will likely
// differ) is tracked separately in issue #24.
const FUZZY_MATCH_THRESHOLD = 0.55; // >= this: auto-match, "matched to: <canonical>"
const FUZZY_SUGGEST_THRESHOLD = 0.4; // >= this (but below the match threshold): did-you-mean
const DID_YOU_MEAN_LIMIT = 3;

// License Status -> severity (data, not code) — packages/sync/DATA-SOURCES.md, decided
// 2026-07-14. Any status not listed here defaults to CAUTION, never VERIFIED (see
// licenseStatusSeverity below) — an unrecognized status is a reason to be careful, not
// a reason to trust.
export const LICENSE_STATUS_SEVERITY: Record<string, Verdict> = {
  "Valid License": "VERIFIED", // subject to the expiry check in computeExpirySeverity
  "Valid License - Provisional": "CAUTION",
  // "Suspended" (disciplinary, verdict-cases.md R7) is distinct from the real observed
  // "Suspended (Document Processing)" (administrative — may be a renewal in progress).
  Suspended: "HIGH_RISK",
  "Suspended (Document Processing)": "CAUTION",
  Inactive: "CAUTION",
  Expired: "HIGH_RISK",
  Cancelled: "HIGH_RISK",
  "Forever Banned": "HIGH_RISK",
  Delisted: "HIGH_RISK",
  "Denied Renewal": "HIGH_RISK",
  "Ceased Operations": "HIGH_RISK",
};

const UNKNOWN_STATUS_VERDICT: Verdict = "CAUTION";

function licenseStatusSeverity(status: string): Verdict {
  return LICENSE_STATUS_SEVERITY[status] ?? UNKNOWN_STATUS_VERDICT;
}

const EXPIRY_WARNING_WINDOW_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function computeExpirySeverity(agency: Agency, now: Date): { verdict: Verdict; reason: string } | null {
  const expiration = agency.licenseExpirationDate;
  if (!expiration) return null;

  const daysUntilExpiration = (expiration.getTime() - now.getTime()) / MS_PER_DAY;
  if (daysUntilExpiration < 0) {
    return { verdict: "HIGH_RISK", reason: `license expired ${formatDate(expiration)}` };
  }
  if (daysUntilExpiration <= EXPIRY_WARNING_WINDOW_DAYS) {
    return { verdict: "CAUTION", reason: `expires soon (${formatDate(expiration)})` };
  }
  return null;
}

function statusReason(agency: Agency): string {
  if (!(agency.licenseStatus in LICENSE_STATUS_SEVERITY)) {
    return `unrecognized license status "${agency.licenseStatus}" — treated as caution`;
  }
  const since = agency.licenseStatusDate ? ` since ${formatDate(agency.licenseStatusDate)}` : "";
  return `license status "${agency.licenseStatus}"${since}`;
}

// Job Orders join to Agencies by normalized name string only — the DMW API has no id
// (ADR-0001, same normalizer as the exact-match agency lookup).
function jobOrdersForAgency(agency: Agency, jobOrders: JobOrder[]): JobOrder[] {
  return jobOrders.filter((jobOrder) => normalizeAgencyName(jobOrder.agencyName) === agency.normalizedName);
}

// Case-insensitive, trimmed: real DMW job-order data is all-caps (DATA-SOURCES.md).
function matchesClaim(jobOrder: JobOrder, claim: ClaimedJobOrder): boolean {
  return (
    jobOrder.jobsite.trim().toLowerCase() === claim.destination.trim().toLowerCase() &&
    jobOrder.position.trim().toLowerCase() === claim.position.trim().toLowerCase()
  );
}

function scoreMatchedAgency(
  match: Agency,
  matchReason: string,
  state: RegistryState,
  now: Date,
  claim?: ClaimedJobOrder,
): RegistryVerdictResult {
  const statusVerdict = licenseStatusSeverity(match.licenseStatus);
  const expiry = computeExpirySeverity(match, now);
  let verdict = worstVerdict(statusVerdict, expiry?.verdict ?? "VERIFIED");

  const reasons = [matchReason];
  if (statusVerdict !== "VERIFIED") {
    reasons.push(statusReason(match));
  }
  if (expiry) {
    reasons.push(expiry.reason);
  }

  const jobOrders = jobOrdersForAgency(match, state.jobOrders);
  let claimedMatch: JobOrder | null | undefined;

  // Job Order confirmation only kicks in when the user supplies a claim (issue #5's
  // "What to build") — with no claim, jobOrders is purely an informational listing
  // (Story 7) and never affects the verdict, even when empty.
  if (claim) {
    const found = jobOrders.find((jobOrder) => matchesClaim(jobOrder, claim));
    if (found) {
      claimedMatch = found;
      reasons.push(`approved job order on file: ${found.position} in ${found.jobsite} (principal: ${found.principal})`);
    } else {
      claimedMatch = null;
      // R13/R14: a missing match is always CAUTION, never HIGH_RISK — worstVerdict can
      // only raise VERIFIED to CAUTION here, it can't push an already-CAUTION/HIGH_RISK
      // verdict any further.
      verdict = worstVerdict(verdict, "CAUTION");
      reasons.push(
        jobOrders.length === 0
          ? "no job orders on file — data may lag; verify"
          : `no approved job order for ${claim.destination} on file`,
      );
    }
  }

  return { kind: "matched", verdict, reasons, agency: match, jobOrders, claimedMatch, syncedAt: state.syncedAt };
}

export function checkAgency(
  query: string,
  state: RegistryState,
  now: Date = new Date(),
  claim?: ClaimedJobOrder,
): RegistryVerdictResult {
  const normalizedQuery = normalizeAgencyName(query);
  const exactMatch = state.agencies.find((agency) => agency.normalizedName === normalizedQuery);

  if (exactMatch) {
    return scoreMatchedAgency(exactMatch, `matched exact name: ${exactMatch.name}`, state, now, claim);
  }

  const candidates = state.agencies
    .map((agency) => ({ agency, similarity: trigramSimilarity(normalizedQuery, agency.normalizedName) }))
    .filter((candidate) => candidate.similarity >= FUZZY_SUGGEST_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);

  const strongMatches = candidates.filter((candidate) => candidate.similarity >= FUZZY_MATCH_THRESHOLD);

  const [singleStrongMatch] = strongMatches;
  if (strongMatches.length === 1 && singleStrongMatch) {
    const { agency } = singleStrongMatch;
    return scoreMatchedAgency(agency, `matched to: ${agency.name}`, state, now, claim);
  }

  if (strongMatches.length > 1) {
    // R16: two (or more) equally strong candidates — never auto-pick.
    //
    // Capped like the R5 branch below. A query built from generic industry words ("manpower
    // services", "international") can clear the match threshold against dozens of real rows,
    // and a list that long is unreadable — worse, it reads as corroboration rather than as a
    // failure to identify anything. The count is stated rather than silently truncated.
    const shown = strongMatches.slice(0, DID_YOU_MEAN_LIMIT);
    const hidden = strongMatches.length - shown.length;
    return {
      kind: "ambiguous",
      verdict: "CAUTION",
      reasons: [
        `multiple close matches for "${query}" — did you mean one of these?` +
          (hidden > 0 ? ` (showing the ${shown.length} closest of ${strongMatches.length})` : ""),
      ],
      candidates: shown.map((candidate) => candidate.agency),
      syncedAt: state.syncedAt,
    };
  }

  if (candidates.length > 0) {
    // R5: no strong match, but at least one plausible one — surface a did-you-mean list.
    return {
      kind: "ambiguous",
      verdict: "CAUTION",
      reasons: [`no exact match for "${query}" — did you mean one of these?`],
      candidates: candidates.slice(0, DID_YOU_MEAN_LIMIT).map((candidate) => candidate.agency),
      syncedAt: state.syncedAt,
    };
  }

  return {
    kind: "not_found",
    verdict: "HIGH_RISK",
    reasons: [`"${query}" not found in DMW list as of ${formatDate(state.syncedAt)}`],
    syncedAt: state.syncedAt,
  };
}

// Fixture-backed RegistryState — test-only now. Production loads RegistryState from the
// live Postgres registry via registry-store.ts's loadDbRegistryState() (issues #6/#12,
// shipped 2026-07-27 / 2026-08-03). Callers only ever depend on checkAgency + RegistryState,
// never on how the state was loaded.
export function loadFixtureRegistryState(): RegistryState {
  const snapshot = loadRegistrySnapshot();
  return {
    agencies: toAgencyRows(snapshot),
    jobOrders: toJobOrderRows(snapshot),
    syncedAt: new Date(snapshot.syncedAt),
  };
}
