/**
 * Live registry wiring (issues #6/#12). apps/web depends on @ligtas-ofw/core only (never
 * @ligtas-ofw/db directly) — createDbClient is re-exported through core for exactly this,
 * same pattern as quota-store.ts. The db client is a lazily-initialized module singleton
 * (createDbClient() opens a real Postgres connection pool); the RegistryState itself is
 * loaded fresh on every call — no caching — so a request always reflects the latest sync.
 */
import { createDbClient, loadDbRegistryState, type RegistryState } from "@ligtas-ofw/core";

let db: ReturnType<typeof createDbClient> | undefined;

export function getRegistryState(): Promise<RegistryState> {
  if (!db) {
    db = createDbClient();
  }
  return loadDbRegistryState(db);
}
