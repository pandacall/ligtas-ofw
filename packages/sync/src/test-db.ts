/**
 * Shared integration-test wiring for promote.test.ts / pipeline.test.ts. The skip/fail
 * behavior is deliberately asymmetric: locally, no TEST_DATABASE_URL means "developer
 * hasn't run `npm run test:db:up` yet" — skip. In CI (`process.env.CI`), that same suite
 * must never silently skip — an unset URL, a refused connection, or a rejected auth all
 * surface as a failing beforeAll (SKIP_INTEGRATION is unconditionally false when IS_CI is
 * true, and connectTestDb() throws rather than swallowing any connection error), matching
 * the "tested against a test Postgres" acceptance criterion for issue #6.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDbClient } from "@ligtas-ofw/db";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const IS_CI = Boolean(process.env.CI);
// Only "never provisioned locally" is a legitimate skip — never true when IS_CI is true.
export const SKIP_INTEGRATION = !TEST_DATABASE_URL && !IS_CI;

const MIGRATIONS_FOLDER = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

// pg surfaces a connection refusal as an AggregateError with an empty top-level .message —
// the useful detail (ECONNREFUSED, auth failure, etc.) is in .errors[]. Unwrap it so a CI
// failure is actually diagnosable instead of just "Could not connect: ".
function describeConnectionError(err: unknown): string {
  if (err instanceof AggregateError) {
    return [...err.errors].map((e) => (e instanceof Error ? e.message : String(e))).join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

export async function connectTestDb(): Promise<ReturnType<typeof createDbClient>> {
  if (!TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is required to run packages/sync's integration tests. In CI this must never be " +
        "unset (see .github/workflows/ci.yml) — locally, run `npm run test:db:up` and set it (see .env.example), " +
        "or leave it unset to skip this suite.",
    );
  }

  const db = createDbClient(TEST_DATABASE_URL);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (err) {
    throw new Error(`Could not connect to or migrate the test Postgres at ${TEST_DATABASE_URL}: ${describeConnectionError(err)}`);
  }
  return db;
}
