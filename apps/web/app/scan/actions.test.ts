import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ligtas-ofw/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ligtas-ofw/core")>();
  return {
    ...actual,
    scanPost: vi.fn(),
    checkAndConsumeQuota: vi.fn(),
    loadFixtureRegistryState: vi.fn(),
  };
});

vi.mock("../../lib/quota-store", () => ({
  getQuotaStore: vi.fn(),
  readQuotaConfig: vi.fn(),
}));

vi.mock("../../lib/extractor-client", () => ({
  openRouterExtractorClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

import { checkAndConsumeQuota, loadFixtureRegistryState, scanPost } from "@ligtas-ofw/core";
import { scanPostAction } from "./actions";

const scanPostMock = vi.mocked(scanPost);
const checkAndConsumeQuotaMock = vi.mocked(checkAndConsumeQuota);
const loadFixtureRegistryStateMock = vi.mocked(loadFixtureRegistryState);

const SYNCED_AT = new Date("2026-07-27T00:00:00.000Z");

function formDataOf(fields: { text?: string; image?: File }): FormData {
  const formData = new FormData();
  if (fields.text !== undefined) formData.set("text", fields.text);
  if (fields.image !== undefined) formData.set("image", fields.image);
  return formData;
}

function pngFile(bytes = 10, name = "shot.png"): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

describe("scanPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadFixtureRegistryStateMock.mockReturnValue({ syncedAt: SYNCED_AT } as unknown as ReturnType<
      typeof loadFixtureRegistryState
    >);
    checkAndConsumeQuotaMock.mockResolvedValue({ kind: "ok" } as unknown as Awaited<ReturnType<typeof checkAndConsumeQuota>>);
    scanPostMock.mockResolvedValue({ kind: "not_a_job_post" });
  });

  it("returns null when neither text nor an image is submitted", async () => {
    const result = await scanPostAction(null, formDataOf({}));
    expect(result).toBeNull();
    expect(scanPostMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported file type before ever checking the quota or calling scanPost", async () => {
    const gifFile = new File([new Uint8Array(10)], "shot.gif", { type: "image/gif" });
    const result = await scanPostAction(null, formDataOf({ image: gifFile }));
    expect(result).toEqual({ kind: "file_error", fileError: "unsupported_type" });
    expect(checkAndConsumeQuotaMock).not.toHaveBeenCalled();
    expect(scanPostMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized file before ever checking the quota or calling scanPost", async () => {
    const bigFile = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "shot.png", { type: "image/png" });
    const result = await scanPostAction(null, formDataOf({ image: bigFile }));
    expect(result).toEqual({ kind: "file_error", fileError: "too_large" });
    expect(checkAndConsumeQuotaMock).not.toHaveBeenCalled();
    expect(scanPostMock).not.toHaveBeenCalled();
  });

  it("scans as text when only text is submitted", async () => {
    await scanPostAction(null, formDataOf({ text: "some job post" }));
    expect(scanPostMock).toHaveBeenCalledWith({ kind: "text", text: "some job post" }, expect.anything());
  });

  it("image wins when both text and a valid image are submitted", async () => {
    await scanPostAction(null, formDataOf({ text: "some job post", image: pngFile() }));
    expect(scanPostMock).toHaveBeenCalledTimes(1);
    const [scanInput] = scanPostMock.mock.calls[0]!;
    expect(scanInput.kind).toBe("image");
    if (scanInput.kind === "image") {
      expect(scanInput.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    }
  });

  it("scans as image when only a valid image is submitted", async () => {
    await scanPostAction(null, formDataOf({ image: pngFile() }));
    expect(scanPostMock).toHaveBeenCalledTimes(1);
    expect(scanPostMock.mock.calls[0]![0].kind).toBe("image");
  });

  describe("escape-hatch parity: quota rejection short-circuits before scanPost, for every input kind", () => {
    const quotaOutcomes = ["quota_exhausted", "rate_limited"] as const;
    const inputKinds: Array<{ label: string; fields: { text?: string; image?: File } }> = [
      { label: "text", fields: { text: "some job post" } },
      { label: "image", fields: { image: pngFile() } },
    ];

    for (const quotaKind of quotaOutcomes) {
      for (const { label, fields } of inputKinds) {
        it(`${quotaKind} for ${label} input`, async () => {
          checkAndConsumeQuotaMock.mockResolvedValue({ kind: quotaKind } as unknown as Awaited<
            ReturnType<typeof checkAndConsumeQuota>
          >);
          const result = await scanPostAction(null, formDataOf(fields));
          expect(result).toEqual({ kind: "scanned", result: { kind: quotaKind }, syncedAt: SYNCED_AT });
          expect(scanPostMock).not.toHaveBeenCalled();
        });
      }
    }
  });
});
