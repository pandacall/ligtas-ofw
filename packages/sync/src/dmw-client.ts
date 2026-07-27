/**
 * Browserless paginated pull of a DMW public endpoint (packages/sync/DATA-SOURCES.md) —
 * no session, no browser, just a static x-api-key header. Playwright was only needed for
 * Phase 0 discovery, not for this. `fetchImpl` is injectable (same shape as `ExtractorClient`
 * in packages/core/src/scan.ts) so tests can stub it without a network call.
 */
import { SyncError } from "./errors";

const API_BASE_URL = "https://master-api.dmw.gov.ph/api/v1/public";
const DEFAULT_PAGE_DELAY_MS = 300;

export type DmwPage<T> = {
  meta: { total: number; perPage: number; currentPage: number; lastPage: number };
  data: T[];
};

type FetchImpl = typeof fetch;

function isDmwPage(body: unknown): body is DmwPage<unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { data?: unknown }).data) &&
    typeof (body as { meta?: { lastPage?: unknown } }).meta?.lastPage === "number"
  );
}

async function fetchPage<T>(endpoint: string, page: number, apiKey: string, fetchImpl: FetchImpl): Promise<DmwPage<T>> {
  let response: Response;
  try {
    response = await fetchImpl(`${API_BASE_URL}/${endpoint}?page=${page}`, {
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
        origin: "https://dmw.gov.ph",
        referer: "https://dmw.gov.ph/",
      },
    });
  } catch (err) {
    throw new SyncError("network", `${endpoint} page ${page}: request failed — ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.status === 401) {
    throw new SyncError("auth", `${endpoint} page ${page}: DMW API rejected the x-api-key (401) — it may have rotated`);
  }
  if (!response.ok) {
    throw new SyncError("network", `${endpoint} page ${page}: request failed — ${response.status} ${response.statusText}`);
  }

  const body = await response.json().catch((err: unknown) => {
    throw new SyncError("validation", `${endpoint} page ${page}: response was not valid JSON — ${err instanceof Error ? err.message : String(err)}`);
  });

  if (!isDmwPage(body)) {
    throw new SyncError("validation", `${endpoint} page ${page}: response did not match the expected {meta, data} shape`);
  }

  return body as DmwPage<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pulls every page of a DMW public endpoint ("licensed-agencies" or "approved-job-orders"),
 * pausing `delayMs` between requests ("polite spacing" — DATA-SOURCES.md). Both endpoints'
 * full pulls together run ~15-20 min; run this sequentially per endpoint, never in
 * parallel, to keep to that estimate.
 */
export async function fetchAllPages<T>(
  endpoint: string,
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
  delayMs: number = DEFAULT_PAGE_DELAY_MS,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await fetchPage<T>(endpoint, page, apiKey, fetchImpl);
    items.push(...response.data);
    lastPage = response.meta.lastPage;
    page += 1;
    if (page <= lastPage) {
      await sleep(delayMs);
    }
  } while (page <= lastPage);

  return items;
}
