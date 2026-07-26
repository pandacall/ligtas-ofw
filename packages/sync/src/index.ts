// Real home of the DMW fetch client / nightly-sync job lands in a later
// ticket (#6). See ../DATA-SOURCES.md for the discovered endpoints.
import { normalizeAgencyName } from "@ligtas-ofw/db";

export const SYNC_PLACEHOLDER = `sync:${normalizeAgencyName("DB")}`;
