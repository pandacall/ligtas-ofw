/**
 * Seeds the Registry from the checked-in snapshot fixture. Requires a live DATABASE_URL
 * (none provisioned yet for this ticket — see issue #6/#12); run manually once a Postgres
 * instance exists: `npm run db:seed -w @ligtas-ofw/db`.
 */
import { createDbClient } from "./client";
import { loadRegistrySnapshot, toAgencyRows, toJobOrderRows } from "./fixtures";
import { agencies, jobOrders, syncMetadata } from "./schema";

export async function seed(): Promise<void> {
  const snapshot = loadRegistrySnapshot();
  const db = createDbClient();

  await db.delete(agencies);
  await db.delete(jobOrders);
  await db.delete(syncMetadata);

  await db.insert(agencies).values(toAgencyRows(snapshot).map(({ id: _id, ...row }) => row));
  await db.insert(jobOrders).values(toJobOrderRows(snapshot).map(({ id: _id, ...row }) => row));
  await db.insert(syncMetadata).values([
    {
      source: "agencies",
      lastSyncedAt: new Date(snapshot.syncedAt),
      rowCount: snapshot.agencies.length,
      status: "success",
    },
    {
      source: "job_orders",
      lastSyncedAt: new Date(snapshot.syncedAt),
      rowCount: snapshot.jobOrders.length,
      status: "success",
    },
  ]);
}

const isMainModule = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMainModule) {
  seed()
    .then(() => {
      console.log("Registry seeded from fixtures/registry-snapshot.json");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
