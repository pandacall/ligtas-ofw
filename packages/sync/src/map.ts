/**
 * Maps raw DMW API records (packages/sync/DATA-SOURCES.md) into the row shapes
 * @ligtas-ofw/db already knows how to build (toAgencyRows/toJobOrderRows) — reusing that
 * transform (date parsing, balance coercion, normalizeAgencyName) rather than duplicating
 * it here.
 *
 * The one on-the-wire quirk: the real API's agency email field is capitalized `eMail`
 * (confirmed against the recorded Phase 0 fixture), while RawAgency/every hand-curated
 * fixture uses `email`. That rename happens here, once.
 */
import { toAgencyRows, toJobOrderRows } from "@ligtas-ofw/db";
import type { Agency, JobOrder, RawAgency, RawJobOrder, RegistrySnapshot } from "@ligtas-ofw/db";

export interface DmwRawAgencyRecord extends Omit<RawAgency, "email"> {
  eMail: string | null;
}

function toRawAgency(record: DmwRawAgencyRecord): RawAgency {
  const { eMail, ...rest } = record;
  return { ...rest, email: eMail };
}

export function mapAgencies(records: DmwRawAgencyRecord[], syncedAt: string): Agency[] {
  const snapshot: RegistrySnapshot = { syncedAt, agencies: records.map(toRawAgency), jobOrders: [] };
  return toAgencyRows(snapshot);
}

export function mapJobOrders(records: RawJobOrder[], syncedAt: string): JobOrder[] {
  const snapshot: RegistrySnapshot = { syncedAt, agencies: [], jobOrders: records };
  return toJobOrderRows(snapshot);
}
