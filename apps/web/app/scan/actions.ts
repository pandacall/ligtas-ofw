"use server";

import { headers } from "next/headers";
import { checkAndConsumeQuota, scanPost, type ScanInput, type ScanResult } from "@ligtas-ofw/core";
import { openRouterExtractorClient } from "../../lib/extractor-client";
import { getQuotaStore, readQuotaConfig } from "../../lib/quota-store";
import { getRegistryState } from "../../lib/registry-store";
import { validateAndEncodeImage, type ImageValidationError } from "../../lib/image-upload";

export type ScanActionState =
  | { kind: "scanned"; result: ScanResult; syncedAt: Date }
  | { kind: "file_error"; fileError: ImageValidationError }
  | null;

// x-forwarded-for's first entry is the original client IP (Vercel sets this). No header
// means we can't attribute the request to a caller — fall back to a shared bucket rather
// than throwing, so a missing header degrades to "IP-agnostic" instead of breaking scans.
function extractIp(forwardedFor: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || "unknown";
}

export async function scanPostAction(
  _prevState: ScanActionState,
  formData: FormData,
): Promise<ScanActionState> {
  const file = formData.get("image");

  let scanInput: ScanInput;
  if (file instanceof File && file.size > 0) {
    // Image wins over any leftover textarea content — an upload is always a deliberate
    // action, whereas pasted text left in the box is often just incidental (issue #9).
    const validation = await validateAndEncodeImage(file);
    if (!validation.ok) {
      return { kind: "file_error", fileError: validation.reason };
    }
    scanInput = { kind: "image", dataUrl: validation.dataUrl };
  } else {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) {
      return null;
    }
    scanInput = { kind: "text", text };
  }

  const registryState = await getRegistryState();

  // Checked and incremented before any Extractor call — an exhausted budget never
  // reaches the provider (issue #11).
  const ip = extractIp((await headers()).get("x-forwarded-for"));
  const quota = await checkAndConsumeQuota(getQuotaStore(), readQuotaConfig(), ip, new Date());
  if (quota.kind !== "ok") {
    return { kind: "scanned", result: { kind: quota.kind }, syncedAt: registryState.syncedAt };
  }

  const result = await scanPost(scanInput, { extractor: openRouterExtractorClient, registryState });
  return { kind: "scanned", result, syncedAt: registryState.syncedAt };
}
