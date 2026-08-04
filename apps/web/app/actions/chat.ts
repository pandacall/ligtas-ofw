"use server";

import { headers } from "next/headers";
import {
  checkAndConsumeQuota,
  handleTurn,
  type ChatTurnResult,
  type QuickAction,
  type QuotaCheckResult,
} from "@ligtas-ofw/core";
import { openRouterExtractorClient } from "../../lib/extractor-client";
import { openRouterRouterClient } from "../../lib/router-client";
import { getQuotaStore, readChatQuotaConfig, readQuotaConfig } from "../../lib/quota-store";
import { getRegistryState } from "../../lib/registry-store";
import { validateAndEncodeImage, type ImageValidationError } from "../../lib/image-upload";

export type ChatActionState =
  | { kind: "turn"; result: ChatTurnResult; syncedAt: Date }
  | { kind: "file_error"; fileError: ImageValidationError }
  | null;

const QUICK_ACTIONS: readonly QuickAction[] = [
  "scan_post",
  "check_agency",
  "hotlines",
  "what_to_do_if_scammed",
  "about",
];

function parseAction(raw: FormDataEntryValue | null): QuickAction | undefined {
  const value = typeof raw === "string" ? raw : "";
  return (QUICK_ACTIONS as readonly string[]).includes(value) ? (value as QuickAction) : undefined;
}

// x-forwarded-for's first entry is the original client IP (Vercel sets this). No header
// means we can't attribute the request to a caller — fall back to a shared bucket rather
// than throwing, so a missing header degrades to "IP-agnostic" instead of breaking the turn.
function extractIp(forwardedFor: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || "unknown";
}

export async function chatTurnAction(_prevState: ChatActionState, formData: FormData): Promise<ChatActionState> {
  const registryState = await getRegistryState();

  const file = formData.get("image");
  let imageDataUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    const validation = await validateAndEncodeImage(file);
    if (!validation.ok) {
      return { kind: "file_error", fileError: validation.reason };
    }
    imageDataUrl = validation.dataUrl;
  }

  const text = String(formData.get("text") ?? "").trim();
  const action = parseAction(formData.get("action"));

  if (!text && !imageDataUrl && !action) {
    return null;
  }

  const ip = extractIp((await headers()).get("x-forwarded-for"));
  const store = getQuotaStore();

  // Both budgets are passed as thunks so Core decides WHICH one a turn draws from — and so
  // a turn the pre-router resolves deterministically never touches either (ADR-0005).
  const consume = (kind: "scan" | "chat"): (() => Promise<QuotaCheckResult>) => {
    const config = kind === "scan" ? readQuotaConfig() : readChatQuotaConfig();
    return () => checkAndConsumeQuota(store, config, ip, new Date(), kind);
  };

  const result = await handleTurn(
    { text: text || undefined, imageDataUrl, action },
    {
      router: openRouterRouterClient,
      extractor: openRouterExtractorClient,
      registryState,
      consumeScanBudget: consume("scan"),
      consumeChatBudget: consume("chat"),
    },
  );

  return { kind: "turn", result, syncedAt: registryState.syncedAt };
}
