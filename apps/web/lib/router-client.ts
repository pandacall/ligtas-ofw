/**
 * The real OpenAI-compatible Router client (ADR-0005). Mirrors extractor-client.ts exactly —
 * same provider, same `response_format: json_schema`, same `require_parameters` guard — and
 * lives here for the same reason: scripts/check-core-boundary.ts bans HTTP from packages/core,
 * so Core declares the RouterClient function type and this module supplies the implementation.
 *
 * Deliberately NOT native tool calling. ADR-0004 records free-tier flakiness, and structured
 * JSON output is the mechanism this repo has already measured at 95% on the fixture eval.
 *
 * Text-only: routing never sees an image. A screenshot short-circuits to the scan path in
 * router.ts before any routing call is made, so there is no vision cost here.
 */
import type { RouterClient, RouterMessage } from "@ligtas-ofw/core";
import { ChatRouteSchema } from "@ligtas-ofw/core";
import { zodToJsonSchema } from "zod-to-json-schema";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

export function createOpenRouterRouterClient(options: { temperature?: number } = {}): RouterClient {
  return async (messages: RouterMessage[]) => {
    // Falls back to the Extractor's credentials/endpoint so a single OpenRouter key covers
    // both roles; only the model id realistically differs.
    const apiKey = process.env.CHAT_API_KEY ?? requireEnv("EXTRACTOR_API_KEY");
    const model = process.env.CHAT_MODEL ?? "google/gemma-4-26b-a4b-it:free";
    const baseUrl = process.env.CHAT_BASE_URL ?? process.env.EXTRACTOR_BASE_URL ?? "https://openrouter.ai/api/v1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        // Routing is a classification, not a creative task — pin it.
        temperature: options.temperature ?? 0,
        response_format: {
          type: "json_schema",
          json_schema: { name: "route_turn", strict: true, schema: zodToJsonSchema(ChatRouteSchema) },
        },
        provider: { require_parameters: true },
      }),
    });

    if (!response.ok) {
      throw new Error(`Router request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Router response had no message content");
    }

    return JSON.parse(content);
  };
}

export const openRouterRouterClient: RouterClient = createOpenRouterRouterClient();
