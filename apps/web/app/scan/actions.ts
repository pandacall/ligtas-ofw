"use server";

import { loadFixtureRegistryState, scanPost, type ScanResult } from "@ligtas-ofw/core";
import { openRouterExtractorClient } from "../../lib/extractor-client";

export type ScanActionState = { result: ScanResult; syncedAt: Date } | null;

export async function scanPostAction(
  _prevState: ScanActionState,
  formData: FormData,
): Promise<ScanActionState> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    return null;
  }

  const registryState = loadFixtureRegistryState();
  const result = await scanPost(text, { extractor: openRouterExtractorClient, registryState });
  return { result, syncedAt: registryState.syncedAt };
}
