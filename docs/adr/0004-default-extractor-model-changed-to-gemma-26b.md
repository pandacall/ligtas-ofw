# 0004 — Default Extractor model changed to Gemma 4 26B A4B (free)

- Status: Accepted
- Date: 2026-08-03
- Amends ADR-0003 (supersedes its "Model default v1: `google/gemma-4-31b-it:free`" line; the
  no-OCR, vision-Extractor, and paid-fallback decisions there stand unchanged).

## Context

While working issue #10 (CI eval harness), `google/gemma-4-31b-it:free` returned HTTP 429
("temporarily rate-limited upstream") on every request for 13+ minutes of polling (2026-08-03,
~09:19–09:32). Checking its OpenRouter endpoint listing explains why: it has exactly **one**
backend, Google AI Studio — a single point of congestion with no routing alternative.

ADR-0003 already named a second $0 vision candidate it never selected as default:
`google/gemma-4-26b-a4b-it:free`. Checking its endpoint listing shows it is backed by **two**
independent providers (Darkbloom and Google AI Studio), confirmed vision-capable
(`text+image+video->text`) and `response_format`-capable on both endpoints — i.e. it satisfies
the same ADR-0002 schema-enforcement requirement (`response_format: json_schema` +
`require_parameters: true`). A live test call returned 200 (routed to Darkbloom, $0 cost)
while the 31B model was still 429-ing.

(Considered and rejected as substitutes: `nvidia/nemotron-3-ultra-550b-a55b:free` is
text-only — no vision — and its `supported_parameters` don't include `response_format`, so
`require_parameters: true` would refuse to route to it at all.)

## Decision

- **Model default v1 changed to `google/gemma-4-26b-a4b-it:free`** ($0/$0). Still subject to
  CLAUDE.md's "measure first" rule (issue #10): the ≥90% fixture-eval bar and the resulting
  few-shot decision now apply to this model, not the 31B one.
- Provider-count is now a selection factor alongside price and modality: prefer the free
  candidate with more than one backing provider, since a single-provider free endpoint is a
  single point of congestion (as demonstrated here).
- No code change — `EXTRACTOR_MODEL` is env config per ADR-0002; only `.env(.example)` and the
  code's fallback default (`extractor-client.ts`) move to the new model id.

## Consequences

- Any prior fixture-eval numbers gathered against `google/gemma-4-31b-it:free` are not the
  issue #10 answer going forward — the harness must be (re-)run against
  `google/gemma-4-26b-a4b-it:free` to produce the recorded measurement.
- Documented paid fallback is unchanged: Qwen2.5-VL-72B via `EXTRACTOR_MODEL`.
- `google/gemma-4-31b-it:free` isn't removed from consideration — if a later measurement shows
  it materially more accurate and OpenRouter adds a second provider for it, revisiting the
  default is a config change, not a re-litigation of this ADR's reasoning.
- Free-tier model/provider availability rotates (ADR-0003 already notes this) — provider count
  should be rechecked if this model is ever revisited.

## Alternatives considered

- **Wait out the `gemma-4-31b-it:free` congestion and keep it default** — rejected: the
  single-provider dependency is a structural risk independent of this specific incident: the
  next congestion event would hit the same wall.
- **`nvidia/nemotron-3-ultra-550b-a55b:free`** — rejected: text-only, no `response_format`
  support (see Context).
- **Paid Qwen2.5-VL as default** — rejected, same reasoning as ADR-0003: cost-sensitivity for a
  community project; kept as the documented fallback only.
