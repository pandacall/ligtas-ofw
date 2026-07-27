/**
 * The real Postgres-backed QuotaStore (issue #11). All query-building lives in
 * @ligtas-ofw/db (quota.ts) — this file only wires those functions into the QuotaStore
 * shape, the same relationship registry.ts has with @ligtas-ofw/db's exports.
 */
import { countScanEvents, createDbClient, recordScanEvent } from "@ligtas-ofw/db";
import type { QuotaStore } from "./quota";

export function createPostgresQuotaStore(db: ReturnType<typeof createDbClient>): QuotaStore {
  return {
    countSince: (scope, since, now) => countScanEvents(db, scope, since, now),
    record: (ip, now) => recordScanEvent(db, ip, now),
  };
}
