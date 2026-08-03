/**
 * CLI entrypoint for the nightly sync (issue #6): `tsx src/run.ts`, wired as the `sync`
 * script and invoked by .github/workflows/sync.yml. Pulls both DMW endpoints sequentially
 * (agencies, then job orders — never in parallel, to stay polite; real runs take ~50 min,
 * see DATA-SOURCES.md), maps them, and promotes via stageAndPromote. On any failure
 * it prints a remedy specific to the failure cause (the 401 case explicitly has no
 * automatic re-discovery, per the acceptance criteria) and exits non-zero — the calling
 * GitHub Actions workflow is what fails loudly and opens the issue. `sync_metadata` is
 * deliberately left untouched on failure: it only ever records the last *successful* sync
 * (per the acceptance criteria), which is exactly the "stale-but-stamped" Freshness Stamp
 * behavior — a failure row here would risk a future freshness read picking up a 0-row
 * failed run instead of last night's real data.
 */
import type { RawJobOrder } from "@ligtas-ofw/db";
import { createDbClient } from "@ligtas-ofw/db";
import { fetchAllPages } from "./dmw-client";
import { SyncError } from "./errors";
import type { DmwRawAgencyRecord } from "./map";
import { mapAgencies, mapJobOrders } from "./map";
import { stageAndPromote } from "./promote";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

function remedyFor(error: SyncError): string {
  switch (error.code) {
    case "auth":
      return (
        "The DMW x-api-key was rejected (401) — it likely rotated. No automatic re-discovery: " +
        "re-run `npx tsx starter/phase0-capture.ts` (see packages/sync/DATA-SOURCES.md) to find the new key, " +
        "then update the DMW_API_KEY secret."
      );
    case "tripwire":
      return "The row-count tripwire aborted the swap — live data is untouched. Investigate before re-running.";
    case "validation":
      return "The DMW API response shape didn't match what this client expects — check packages/sync/DATA-SOURCES.md against a live response and update the client.";
    case "network":
      return "The DMW API request failed — check DMW's availability and retry.";
  }
}

export async function run(): Promise<void> {
  const databaseUrl = requireEnv("DATABASE_URL");
  const apiKey = requireEnv("DMW_API_KEY");
  const db = createDbClient(databaseUrl);
  const syncedAt = new Date();

  try {
    console.log("Pulling licensed agencies...");
    const rawAgencies = await fetchAllPages<DmwRawAgencyRecord>("licensed-agencies", apiKey);
    const agencyRows = mapAgencies(rawAgencies, syncedAt.toISOString());

    console.log("Pulling approved job orders...");
    const rawJobOrders = await fetchAllPages<RawJobOrder>("approved-job-orders", apiKey);
    const jobOrderRows = mapJobOrders(rawJobOrders, syncedAt.toISOString());

    const result = await stageAndPromote(db, { agencies: agencyRows, jobOrders: jobOrderRows, syncedAt });
    console.log(`Sync succeeded: ${result.agencyCount} agencies, ${result.jobOrderCount} job orders.`);
  } catch (err) {
    if (err instanceof SyncError) {
      console.error(`Sync failed (${err.code}): ${err.message}`);
      console.error(remedyFor(err));
    } else {
      console.error("Sync failed with an unexpected error:", err);
    }
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMainModule) {
  run();
}
