/**
 * File-type and size validation + base64 data-URL encoding for screenshot input (issue #9).
 * Lives in apps/web because packages/core forbids anything beyond @ligtas-ofw/db + zod
 * (scripts/check-core-boundary.ts) — encoding a browser File is a Surface concern, not a
 * core-domain one. scanPost (core) only ever sees the resulting dataUrl string.
 */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

// 4 MiB raw file bytes: comfortably covers real screenshot sizes (including tall
// Facebook/TikTok scroll-captures) while base64's ~33% inflation keeps the encoded data URL
// under typical platform request-body ceilings (see apps/web/next.config.js).
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type ImageValidationError = "unsupported_type" | "too_large";
export type ImageValidationResult = { ok: true; dataUrl: string } | { ok: false; reason: ImageValidationError };

function isAllowedMimeType(type: string): type is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export async function validateAndEncodeImage(file: File): Promise<ImageValidationResult> {
  if (!isAllowedMimeType(file.type)) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return { ok: true, dataUrl: `data:${file.type};base64,${bytes.toString("base64")}` };
}
