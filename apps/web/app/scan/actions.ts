"use server";

import { headers } from "next/headers";
import { checkAndConsumeQuota, loadFixtureRegistryState, scanPost, type ScanResult } from "@ligtas-ofw/core";
import { openRouterExtractorClient } from "../../lib/extractor-client";
import { getQuotaStore, readQuotaConfig } from "../../lib/quota-store";

export type ScanActionState = { result: ScanResult; syncedAt: Date } | null;

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
  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    return null;
  }

  const registryState = loadFixtureRegistryState();

  // Checked and incremented before any Extractor call — an exhausted budget never
  // reaches the provider (issue #11).
  const ip = extractIp((await headers()).get("x-forwarded-for"));
  const quota = await checkAndConsumeQuota(getQuotaStore(), readQuotaConfig(), ip, new Date());
  if (quota.kind !== "ok") {
    return { result: { kind: quota.kind }, syncedAt: registryState.syncedAt };
  }

  const result = await scanPost(text, { extractor: openRouterExtractorClient, registryState });
  return { result, syncedAt: registryState.syncedAt };
}
