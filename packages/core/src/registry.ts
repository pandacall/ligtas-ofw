/**
 * Registry Verdict: exact-normalized name lookup (ADR-0001) + License Status + expiry.
 * Computed independently of the Post Verdict — see verdict.ts's combineVerdict/worstVerdict
 * for how the two are combined (worst-of).
 */
import type { Agency } from "@ligtas-ofw/db";
import { loadRegistrySnapshot, normalizeAgencyName, toAgencyRows } from "@ligtas-ofw/db";
import type { Verdict } from "./verdict";
import { worstVerdict } from "./verdict";

export type RegistryState = {
  agencies: Agency[];
  syncedAt: Date;
};

export type RegistryVerdictResult =
  | { kind: "not_found"; verdict: "HIGH_RISK"; reasons: string[]; syncedAt: Date }
  | { kind: "matched"; verdict: Verdict; reasons: string[]; agency: Agency; syncedAt: Date };

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

// Exported so Surfaces render dates the same way the reasons[] strings do.
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

export function checkAgency(query: string, state: RegistryState, now: Date = new Date()): RegistryVerdictResult {
  const normalizedQuery = normalizeAgencyName(query);
  const match = state.agencies.find((agency) => agency.normalizedName === normalizedQuery);

  if (!match) {
    return {
      kind: "not_found",
      verdict: "HIGH_RISK",
      reasons: [`"${query}" not found in DMW list as of ${formatDate(state.syncedAt)}`],
      syncedAt: state.syncedAt,
    };
  }

  const statusVerdict = licenseStatusSeverity(match.licenseStatus);
  const expiry = computeExpirySeverity(match, now);
  const verdict = worstVerdict(statusVerdict, expiry?.verdict ?? "VERIFIED");

  const reasons = [`matched exact name: ${match.name}`];
  if (statusVerdict !== "VERIFIED") {
    reasons.push(statusReason(match));
  }
  if (expiry) {
    reasons.push(expiry.reason);
  }

  return { kind: "matched", verdict, reasons, agency: match, syncedAt: state.syncedAt };
}

// Fixture-backed RegistryState for surfaces (no live DB provisioned yet — see issue
// #6/#12). This is the one seam that swaps to a live DB query once one exists; callers
// only ever depend on checkAgency + RegistryState, never on how the state was loaded.
export function loadFixtureRegistryState(): RegistryState {
  const snapshot = loadRegistrySnapshot();
  return { agencies: toAgencyRows(snapshot), syncedAt: new Date(snapshot.syncedAt) };
}
