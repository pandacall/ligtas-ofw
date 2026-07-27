/**
 * The real OpenAI-compatible Extractor client (ADR-0002/0003). This is the piece that
 * cannot live in packages/core — scripts/check-core-boundary.ts bans HTTP imports and
 * any dependency beyond @ligtas-ofw/db + zod there. scanPost (core) only depends on the
 * ExtractorClient function type; this module supplies the real implementation.
 */
import type { ExtractorClient, ExtractorMessage } from "@ligtas-ofw/core";
import { Extraction } from "@ligtas-ofw/core";
import { zodToJsonSchema } from "zod-to-json-schema";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

export function createOpenRouterExtractorClient(options: { temperature?: number } = {}): ExtractorClient {
  return async (messages: ExtractorMessage[]) => {
    const apiKey = requireEnv("EXTRACTOR_API_KEY");
    const model = process.env.EXTRACTOR_MODEL ?? "google/gemma-4-31b-it:free";
    const baseUrl = process.env.EXTRACTOR_BASE_URL ?? "https://openrouter.ai/api/v1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        response_format: {
          type: "json_schema",
          json_schema: { name: "record_extraction", strict: true, schema: zodToJsonSchema(Extraction) },
        },
        // OpenRouter-only: only route to backends that honor response_format (ADR-0002).
        provider: { require_parameters: true },
      }),
    });

    if (!response.ok) {
      throw new Error(`Extractor request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Extractor response had no message content");
    }

    return JSON.parse(content);
  };
}

export const openRouterExtractorClient: ExtractorClient = createOpenRouterExtractorClient();
