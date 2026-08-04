import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These are Surface tests: form parsing, file validation, and quota wiring. The turn logic
 * itself — routing, degrading, which budget a turn draws from — is covered against the real
 * implementation in packages/core/src/chat.test.ts, so handleTurn is mocked here and we
 * assert on what it was handed.
 */
vi.mock("@ligtas-ofw/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ligtas-ofw/core")>();
  return {
    ...actual,
    handleTurn: vi.fn(),
    checkAndConsumeQuota: vi.fn(),
  };
});

vi.mock("../../lib/quota-store", () => ({
  getQuotaStore: vi.fn(() => "quota-store"),
  readQuotaConfig: vi.fn(() => ({ dailyBudget: 50, perIpLimit: 5, perIpWindowMs: 600_000 })),
  readChatQuotaConfig: vi.fn(() => ({ dailyBudget: 500, perIpLimit: 30, perIpWindowMs: 600_000 })),
}));

vi.mock("../../lib/registry-store", () => ({ getRegistryState: vi.fn() }));
vi.mock("../../lib/extractor-client", () => ({ openRouterExtractorClient: vi.fn() }));
vi.mock("../../lib/router-client", () => ({ openRouterRouterClient: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => "203.0.113.9, 70.41.3.18" })),
}));

import { checkAndConsumeQuota, handleTurn, type ChatTurnDeps, type ChatTurnInput } from "@ligtas-ofw/core";
import { getRegistryState } from "../../lib/registry-store";
import { chatTurnAction } from "./chat";

const handleTurnMock = vi.mocked(handleTurn);
const checkAndConsumeQuotaMock = vi.mocked(checkAndConsumeQuota);
const getRegistryStateMock = vi.mocked(getRegistryState);

const SYNCED_AT = new Date("2026-07-27T00:00:00.000Z");

function formDataOf(fields: { text?: string; image?: File; action?: string }): FormData {
  const formData = new FormData();
  if (fields.text !== undefined) formData.set("text", fields.text);
  if (fields.image !== undefined) formData.set("image", fields.image);
  if (fields.action !== undefined) formData.set("action", fields.action);
  return formData;
}

function pngFile(bytes = 10, name = "shot.png"): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

/** The (input, deps) pair the action handed to the engine. */
function lastCall(): { input: ChatTurnInput; deps: ChatTurnDeps } {
  const call = handleTurnMock.mock.calls.at(-1);
  if (!call) throw new Error("handleTurn was never called");
  return { input: call[0], deps: call[1] };
}

describe("chatTurnAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRegistryStateMock.mockResolvedValue({
      agencies: [],
      jobOrders: [],
      syncedAt: SYNCED_AT,
    } as unknown as Awaited<ReturnType<typeof getRegistryState>>);
    checkAndConsumeQuotaMock.mockResolvedValue({ kind: "ok" });
    handleTurnMock.mockResolvedValue({ kind: "out_of_scope", reply: "Sige po." });
  });

  it("returns null when nothing at all is submitted", async () => {
    expect(await chatTurnAction(null, formDataOf({}))).toBeNull();
    expect(handleTurnMock).not.toHaveBeenCalled();
  });

  it("returns the turn result alongside the registry freshness stamp", async () => {
    const result = await chatTurnAction(null, formDataOf({ text: "kumusta" }));
    expect(result).toEqual({
      kind: "turn",
      result: { kind: "out_of_scope", reply: "Sige po." },
      syncedAt: SYNCED_AT,
    });
  });

  describe("file validation happens before the engine is ever reached", () => {
    it("rejects an unsupported file type", async () => {
      const gifFile = new File([new Uint8Array(10)], "shot.gif", { type: "image/gif" });
      const result = await chatTurnAction(null, formDataOf({ image: gifFile }));

      expect(result).toEqual({ kind: "file_error", fileError: "unsupported_type" });
      expect(handleTurnMock).not.toHaveBeenCalled();
    });

    it("rejects an oversized file", async () => {
      const bigFile = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "shot.png", { type: "image/png" });
      const result = await chatTurnAction(null, formDataOf({ image: bigFile }));

      expect(result).toEqual({ kind: "file_error", fileError: "too_large" });
      expect(handleTurnMock).not.toHaveBeenCalled();
    });
  });

  describe("input shaping", () => {
    it("passes trimmed text through", async () => {
      await chatTurnAction(null, formDataOf({ text: "  Golden Star Manpower  " }));
      expect(lastCall().input).toMatchObject({ text: "Golden Star Manpower" });
    });

    it("encodes an attached image as a data URL", async () => {
      await chatTurnAction(null, formDataOf({ image: pngFile() }));
      expect(lastCall().input.imageDataUrl?.startsWith("data:image/png;base64,")).toBe(true);
    });

    it("passes both text and image through — routeTurn decides which wins", async () => {
      await chatTurnAction(null, formDataOf({ text: "tingnan mo ito", image: pngFile() }));
      const { input } = lastCall();
      expect(input.text).toBe("tingnan mo ito");
      expect(input.imageDataUrl).toBeDefined();
    });

    it("passes a recognized quick action through", async () => {
      await chatTurnAction(null, formDataOf({ action: "hotlines" }));
      expect(lastCall().input.action).toBe("hotlines");
    });

    // Never trust a client-supplied action name — an unknown value is dropped, not forwarded.
    it("drops an unrecognized action value", async () => {
      await chatTurnAction(null, formDataOf({ action: "delete_everything", text: "hello" }));
      expect(lastCall().input.action).toBeUndefined();
    });

    it("treats whitespace-only text as absent", async () => {
      expect(await chatTurnAction(null, formDataOf({ text: "   " }))).toBeNull();
    });
  });

  describe("quota wiring", () => {
    it("hands the engine two budget thunks that consume different kinds", async () => {
      await chatTurnAction(null, formDataOf({ text: "kumusta" }));
      const { deps } = lastCall();

      // The engine decides which to call; neither fires until it does.
      expect(checkAndConsumeQuotaMock).not.toHaveBeenCalled();

      await deps.consumeScanBudget();
      expect(checkAndConsumeQuotaMock.mock.calls.at(-1)?.[4]).toBe("scan");

      await deps.consumeChatBudget();
      expect(checkAndConsumeQuotaMock.mock.calls.at(-1)?.[4]).toBe("chat");
    });

    it("gives each budget its own config", async () => {
      await chatTurnAction(null, formDataOf({ text: "kumusta" }));
      const { deps } = lastCall();

      await deps.consumeScanBudget();
      expect(checkAndConsumeQuotaMock.mock.calls.at(-1)?.[1]).toMatchObject({ dailyBudget: 50 });

      await deps.consumeChatBudget();
      expect(checkAndConsumeQuotaMock.mock.calls.at(-1)?.[1]).toMatchObject({ dailyBudget: 500 });
    });

    // x-forwarded-for's first entry is the original client IP (Vercel sets this).
    it("attributes the turn to the first forwarded IP", async () => {
      await chatTurnAction(null, formDataOf({ text: "kumusta" }));
      await lastCall().deps.consumeScanBudget();
      expect(checkAndConsumeQuotaMock.mock.calls.at(-1)?.[2]).toBe("203.0.113.9");
    });
  });
});
