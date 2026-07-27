import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOpenRouterExtractorClient, openRouterExtractorClient } from "./extractor-client";

function fetchMockReturning(content: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  });
}

function requestBody(fetchMock: ReturnType<typeof fetchMockReturning>): Record<string, unknown> {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error("fetch was not called");
  return JSON.parse(call[1].body);
}

describe("openRouterExtractorClient / createOpenRouterExtractorClient", () => {
  beforeEach(() => {
    vi.stubEnv("EXTRACTOR_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("the default export omits temperature from the request body", async () => {
    const fetchMock = fetchMockReturning({ is_job_post: true });
    vi.stubGlobal("fetch", fetchMock);

    await openRouterExtractorClient([{ role: "user", content: "hello" }]);

    expect(requestBody(fetchMock)).not.toHaveProperty("temperature");
  });

  it("createOpenRouterExtractorClient({ temperature: 0 }) includes temperature: 0 in the request body", async () => {
    const fetchMock = fetchMockReturning({ is_job_post: true });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenRouterExtractorClient({ temperature: 0 });
    await client([{ role: "user", content: "hello" }]);

    expect(requestBody(fetchMock)).toMatchObject({ temperature: 0 });
  });

  it("createOpenRouterExtractorClient() with no options also omits temperature", async () => {
    const fetchMock = fetchMockReturning({ is_job_post: true });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenRouterExtractorClient();
    await client([{ role: "user", content: "hello" }]);

    expect(requestBody(fetchMock)).not.toHaveProperty("temperature");
  });

  it("throws when EXTRACTOR_API_KEY is unset, from both the default export and a factory-created client", async () => {
    vi.stubEnv("EXTRACTOR_API_KEY", "");
    vi.stubGlobal("fetch", fetchMockReturning({}));

    await expect(openRouterExtractorClient([{ role: "user", content: "hi" }])).rejects.toThrow(/EXTRACTOR_API_KEY/);
    await expect(createOpenRouterExtractorClient({ temperature: 0 })([{ role: "user", content: "hi" }])).rejects.toThrow(
      /EXTRACTOR_API_KEY/,
    );
  });
});
