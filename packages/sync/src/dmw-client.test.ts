import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./dmw-client";
import { SyncError } from "./errors";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RECORDED_AGENCIES_PAGE_1 = JSON.parse(
  readFileSync(
    path.join(
      REPO_ROOT,
      "starter/phase0-findings/https___master_api_dmw_gov_ph_api_v1_public_licensed_agencies_page_1.json",
    ),
    "utf-8",
  ),
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("fetchAllPages", () => {
  it("returns all records from the recorded Phase 0 fixture when it is a single page", async () => {
    const singlePage = { ...RECORDED_AGENCIES_PAGE_1, meta: { ...RECORDED_AGENCIES_PAGE_1.meta, lastPage: 1 } };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(singlePage));

    const result = await fetchAllPages("licensed-agencies", "test-key", fetchImpl, 0);

    expect(result).toEqual(RECORDED_AGENCIES_PAGE_1.data);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends the required headers and the page-number query param", async () => {
    const singlePage = { meta: { total: 0, perPage: 50, currentPage: 1, lastPage: 1 }, data: [] };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(singlePage));

    await fetchAllPages("licensed-agencies", "my-api-key", fetchImpl, 0);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://master-api.dmw.gov.ph/api/v1/public/licensed-agencies?page=1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-api-key": "my-api-key",
          accept: "application/json",
          origin: "https://dmw.gov.ph",
          referer: "https://dmw.gov.ph/",
        }),
      }),
    );
  });

  it("follows pagination across multiple pages and concatenates data", async () => {
    const page1 = { meta: { total: 3, perPage: 2, currentPage: 1, lastPage: 2 }, data: ["a", "b"] };
    const page2 = { meta: { total: 3, perPage: 2, currentPage: 2, lastPage: 2 }, data: ["c"] };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));

    const result = await fetchAllPages<string>("approved-job-orders", "test-key", fetchImpl, 0);

    expect(result).toEqual(["a", "b", "c"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws a SyncError with code 'auth' on a 401", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));

    const error = await fetchAllPages("licensed-agencies", "stale-key", fetchImpl, 0).catch((e) => e);

    expect(error).toBeInstanceOf(SyncError);
    expect((error as SyncError).code).toBe("auth");
  });

  it("throws a SyncError with code 'network' on a non-401 HTTP failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: "boom" }, 503));

    const error = await fetchAllPages("licensed-agencies", "test-key", fetchImpl, 0).catch((e) => e);

    expect(error).toBeInstanceOf(SyncError);
    expect((error as SyncError).code).toBe("network");
  });

  it("throws a SyncError with code 'network' when the request itself rejects", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const error = await fetchAllPages("licensed-agencies", "test-key", fetchImpl, 0).catch((e) => e);

    expect(error).toBeInstanceOf(SyncError);
    expect((error as SyncError).code).toBe("network");
  });

  it("throws a SyncError with code 'validation' when the response shape is unexpected", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ oops: true }));

    const error = await fetchAllPages("licensed-agencies", "test-key", fetchImpl, 0).catch((e) => e);

    expect(error).toBeInstanceOf(SyncError);
    expect((error as SyncError).code).toBe("validation");
  });
});
