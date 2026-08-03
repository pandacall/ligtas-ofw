/**
 * The real Postgres-backed RegistryState (issues #6/#12). All query-building lives in
 * @ligtas-ofw/db (registry-query.ts) — this file only wires those functions into the
 * RegistryState shape, the same relationship quota-store.ts has with quota.ts.
 */
import { createDbClient, getAllAgencies, getAllJobOrders, getLatestSyncedAt } from "@ligtas-ofw/db";
import type { RegistryState } from "./registry";

export async function loadDbRegistryState(db: ReturnType<typeof createDbClient>): Promise<RegistryState> {
  const [dbAgencies, dbJobOrders, syncedAt] = await Promise.all([
    getAllAgencies(db),
    getAllJobOrders(db),
    getLatestSyncedAt(db),
  ]);

  // Degrade loudly rather than fabricate a Freshness Stamp (pillar 6) — this only happens
  // before the very first successful sync has ever run.
  if (!syncedAt) {
    throw new Error("No successful registry sync recorded yet — sync_metadata is empty.");
  }

  return { agencies: dbAgencies, jobOrders: dbJobOrders, syncedAt };
}
