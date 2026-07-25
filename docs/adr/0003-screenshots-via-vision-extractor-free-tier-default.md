# 0003 — Screenshots go through a vision Extractor; free-tier model is the default

- Status: Accepted
- Date: 2026-07-25
- Amends ADR-0002 (supersedes its "Model v1: Qwen2.5-72B-Instruct" line; the adapter,
  provider, and safety-net decisions there stand unchanged).

## Context

The README promises "paste text or a screenshot," and the project owner's requirement is
free/open-source as much as possible — this is a community project, so recurring cost must
stay near zero. ADR-0002 noted the open-source requirement covers OCR but never chose one.

Key realization: OCR was never the paid step. The extraction LLM call happens on every scan
regardless of input type, so a separate OCR stage (Tesseract) saves only the image tokens
(~$0.0005/scan) while feeding the Extractor degraded text — Tesseract performs poorly on the
core input (Facebook screenshots: stylized fonts, emoji, colored backgrounds, Taglish).

Meanwhile OpenRouter (checked 2026-07-25) offers $0 open-weights **vision** models —
`google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free` — behind the same
OpenAI-compatible interface ADR-0002 standardized on.

## Decision

- **No separate OCR stage.** The Extractor is vision-capable and accepts text or image
  input directly; both produce the same Zod-validated `Extraction`.
- **Model default v1: `google/gemma-4-31b-it:free`** ($0/$0). Subject to CLAUDE.md's
  "measure first" rule: it must hold ≥90% on the fixture eval set, else fall back.
- **Documented paid fallback: Qwen2.5-VL-72B** (~$0.25/$0.75 per 1M tokens; ~$0.001–0.002
  per screenshot scan) — an env-var change (`EXTRACTOR_MODEL`), never a code change.
- **Evidence-substring guard (text input only):** since `evidence_quote` must be verbatim,
  when the input is pasted text the verdict engine verifies each quote is a substring of the
  input (after whitespace normalization) and drops flags whose evidence doesn't appear —
  a deterministic anti-hallucination check. For screenshots no source text exists, so
  "verbatim" means the model's transcription; the weaker guarantee is accepted.

## Consequences

- Free-tier limits (verified 2026-07-25): 50 req/day at $0 balance, 20 req/min; a
  **one-time $10 lifetime top-up** raises this to 1,000/day permanently (and doubles as the
  paid-fallback budget). Decision: **start at $0; buy the unlock only when the 50/day
  ceiling bites** (a launch-time call, not scaffolding-time). Google AI Studio's free Gemma
  endpoint (OpenAI-compatible, open-weights) is a $0 candidate for production scans —
  verify its current limits in-account before launch.
- Abuse protection is required either way: per-IP rate limit + a config-driven global
  daily budget (`SCAN_DAILY_BUDGET`) checked before calling the provider; when spent,
  degrade to the Quota Exhausted state (see CONTEXT.md). Limits live in Postgres — no
  extra services.
- Free endpoints may log prompts for training. Low-stakes here (inputs are public scam
  posts, not PII) but must be stated in the privacy note.
- If the free model fails the 90% eval bar or rate limits bite, switching to the paid
  fallback is config-only. Watch UNANALYZABLE rate per ADR-0002.
- Free-tier model availability rotates; the eval set is the gate for any replacement.

## Alternatives considered

- **Tesseract OCR → text model** — rejected: saves ~nothing (the LLM call remains), degrades
  quality on the primary input type, adds a pipeline stage.
- **Paid Qwen2.5-VL as default** — rejected as default for a community project; kept as the
  documented fallback.
- **Text-only v1 (defer screenshots)** — rejected: screenshots are the dominant real-world
  form of the scam posts the product exists to scan.
