import { describe, expect, it } from "vitest";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, validateAndEncodeImage } from "./image-upload";

function fileOf(bytes: number, type: string, name = "shot.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateAndEncodeImage", () => {
  it.each(ALLOWED_IMAGE_MIME_TYPES)("accepts %s within the size limit and returns a matching data URL", async (type) => {
    const result = await validateAndEncodeImage(fileOf(10, type));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.dataUrl.startsWith(`data:${type};base64,`)).toBe(true);
    }
  });

  it("rejects an unsupported MIME type (e.g. image/gif)", async () => {
    const result = await validateAndEncodeImage(fileOf(10, "image/gif"));
    expect(result).toEqual({ ok: false, reason: "unsupported_type" });
  });

  it("accepts a file exactly at MAX_IMAGE_BYTES", async () => {
    const result = await validateAndEncodeImage(fileOf(MAX_IMAGE_BYTES, "image/png"));
    expect(result.ok).toBe(true);
  });

  it("rejects a file one byte over MAX_IMAGE_BYTES", async () => {
    const result = await validateAndEncodeImage(fileOf(MAX_IMAGE_BYTES + 1, "image/png"));
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });
});
