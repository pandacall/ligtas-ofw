# 0002 — Extraction uses an open-weights model via OpenRouter (OpenAI-compatible adapter)

- Status: Accepted
- Date: 2026-07-14
- Supersedes the Anthropic/Haiku assumption in `CLAUDE.md`, `README-draft.md`, and the
  `extraction.ts` call sketch (all three updated 2026-07-25; see also ADR-0003 for the
  vision/free-tier amendments).

## Context

The original spec extracts with a Haiku-class Anthropic model using a forced
`record_extraction` tool call. Project owner's requirement: **use open-source as much as
possible**, for both OCR and the extraction LLM — interpreted (ADR discussion) as
**open-weights models via a hosted inference API** (not fully self-hosted; option (a)), with
the code written so a fully self-hosted backend is a later drop-in.

This is safe because the architecture already isolates the model: the **Extractor** only ever
emits a Zod-validated `Extraction`; a **deterministic verdict engine** issues all verdicts. The
model is one adapter behind a boundary — swapping it changes no downstream guarantee, *as long
as the model reliably produces schema-valid structured output*.

## Decision

- **Interface: OpenAI-compatible chat API.** Provider, model, and hosted-vs-self-hosted are all
  env config (`base_url`, `api_key`, `model`) — never code changes. Together, Fireworks, Groq,
  OpenRouter, and (later) Ollama/vLLM all speak this shape.
- **Provider v1: OpenRouter** (owner has prior experience).
- **Model v1: Qwen2.5-72B-Instruct** — strong at structured output and multilingual (Taglish).
  Per CLAUDE.md "measure first": if fixture accuracy ≥90%, downshift to the smallest model that
  holds the bar.
- **Schema enforcement at decode time:** pass `zodToJsonSchema(Extraction)` as a JSON schema
  (`response_format: json_schema`). On OpenRouter, set `require_parameters: true` and/or pin
  provider order so it only routes to backends that honor the schema.
- **Safety net unchanged:** `Extraction.safeParse` → retry once with the error appended →
  degrade to `UNANALYZABLE` / `{ analyzable: false }`. Model-agnostic; holds for any provider.

## Consequences

- CI fixture evals call OpenRouter with an `OPENROUTER_API_KEY` secret — no GPU needed in CI.
- Self-hosting later (privacy/sovereignty, option (b)) is a `base_url`/`model` change, not a
  rewrite.
- `CLAUDE.md`, `README-draft.md`, and `extraction.ts`'s Anthropic call sketch must be updated to
  the OpenAI-compatible flow (tracked as a follow-up).
- Extraction quality now depends on an aggregator's routing; the `require_parameters` pin + Zod
  net are the mitigations. Watch UNANALYZABLE rate as a health metric.

## Alternatives considered

- **Keep Anthropic/Haiku** — rejected per open-source requirement.
- **Fully self-hosted (Ollama/vLLM) for v1** — rejected for v1: painful CI, GPU ops burden;
  preserved as a drop-in future option.
- **Together / Fireworks** — viable (cleaner native schema-constrained decoding); OpenRouter
  chosen for owner familiarity, with the `require_parameters` caveat noted.
