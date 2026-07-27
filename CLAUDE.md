# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

The workspace is scaffolded: an npm-workspaces monorepo with four modules — `packages/db` (Drizzle schema + client), `packages/core` (extraction schemas + prompt, verdict engine, registry lookup — zero Next.js/HTTP imports, mechanically enforced by `scripts/check-core-boundary.ts`), `packages/sync` (nightly registry sync, still a stub — see "Data sync" below), and `apps/web` (the Next.js Surface). TypeScript and vitest are wired at the root (`npm run typecheck`, `npm test`); CI runs both on every push/PR.

`packages/core/src/{extraction,verdict,registry,scan,copy}.ts` are the real, tested implementations of the Extraction schema, the deterministic verdict engine, the registry lookup, and the job-post scan orchestration — not just spec. `starter/` is now **superseded legacy design material**: its Zod schemas and prompt were the seed for `packages/core`'s versions but are no longer imported or kept in sync. Two `starter/` files stay live references, not code: `starter/verdict-cases.md` (the test matrix new verdict-engine tests should trace back to) and `starter/fixtures-posts.json` (the LLM eval fixture set — see "Testing expectations").

## What LigtasOFW does

Verifies Philippine recruitment agencies against the DMW's licensed-agency registry and scans overseas job posts (usually Taglish) for illegal-recruitment red flags. Two surfaces:
- **Agency check** — **name-only** lookup against a nightly-synced copy of DMW public data (the DMW API exposes no license numbers — ADR-0001; a claimed license number is format-validated only, never a lookup key).
- **Job-post scan** — paste text/screenshot → vision LLM extracts claims (no separate OCR stage — ADR-0003) → deterministic engine issues the verdict.

Stack: Next.js · TypeScript · Postgres/Drizzle (`pg_trgm` fuzzy search) · OpenRouter open-weights vision LLM (extraction — ADR-0002/0003) · Playwright (endpoint *discovery* only; sync itself is plain fetch) · GitHub Actions (typecheck + tests wired today; nightly sync and fixture-eval CI gating are separate, tracked work).

**`CONTEXT.md` is the project glossary and `docs/adr/` holds the accepted decisions — both are authoritative; use their vocabulary exactly and don't contradict an accepted ADR.**

## Core architecture — the non-negotiable invariants

These rules are the whole point of the product. Violating them is a correctness bug, not a style choice.

1. **The LLM never issues verdicts — it only extracts.** `extraction.ts` produces a Zod-validated `Extraction` object (facts + observed red flags with verbatim evidence). A separate deterministic verdict engine turns that into ✅/⚠️/🚨. Never let model output become the final judgment.

2. **Verdict = worst-of(registry_verdict, post_verdict).** Severity order `VERIFIED < CAUTION < HIGH_RISK`. A registry-valid agency still gets HIGH_RISK if the post has critical flags (see impersonation case `scam-15`). Both layers are computed independently, then combined.

3. **Flag severity is data, not code.** Encode the Critical / Warning / Info tiers from `starter/verdict-cases.md` as a table. Critical → any one ⇒ HIGH_RISK. Warning → ≥2 ⇒ HIGH_RISK, 1 ⇒ CAUTION. Info → surface but don't score.

4. **Evidence or it didn't happen.** Every red flag carries an `evidence_quote` lifted verbatim from the post; every verdict string names the evidence that triggered it.

5. **Cache is the product.** User queries hit the local Postgres copy, never DMW servers. Every result shows a data-freshness stamp and a link to verify on the official DMW site.

6. **Degrade, never fabricate.** If extraction fails Zod validation, retry once with the error appended, then return `UNANALYZABLE` / `{ analyzable: false }` with manual-search links. Never guess a verdict.

## Domain rules the verdict engine must encode

These are Philippine-recruitment specifics baked into the fixtures and prompt — they are the source of truth for scoring logic:
- Placement fees may not exceed one month's salary; **HSW (domestic) and seafarers must be charged nothing** — any fee is a violation.
- Any fee demanded **before a signed job order** is suspect (esp. via GCash/remittance/Western Union).
- **Korea E-9 factory work is government-to-government (EPS) only** — any private-agency post for it is fraudulent.
- **Cambodia/Myanmar/Laos + vague online role** (customer service, encoder, crypto, gaming) = trafficking-corridor pattern (always Critical).
- "Tourist visa muna, convert later" = illegal deployment (Critical).
- License formats: `DMW-###-LB-MMDDYYYY-UL` or `POEA-###-LB/SB-MMDDYY-R` (LB=landbased, SB=seabased). Deviations ⇒ `invalid_license_format`.
- `"URGENT"` alone is **not** a flag — urgency only scores when combined with payment/anonymity (see `legit-04`).

## Data sync (Phase 0)

`dmw.gov.ph` is a catch-all SPA — every path returns the same JS shell, so the JSON data endpoint could only be discovered at runtime. Phase 0 discovery already ran: `starter/phase0-capture.ts` drove headless Chromium to record XHR/fetch traffic, and the findings (the agencies/job-orders endpoints, confirmed fetchable without a browser) are recorded in `packages/sync/DATA-SOURCES.md`. `packages/sync/src/index.ts` is still a placeholder — implementing the actual nightly full-replace sync job against those endpoints is separate, tracked work (issue #6), not part of this Phase 0 step.

Re-run discovery only if the DMW SPA changes and the recorded endpoints stop working:
```
npm i -D playwright tsx && npx playwright install chromium
npx tsx starter/phase0-capture.ts   # writes to phase0-findings/
```

## Testing expectations

- `starter/fixtures-posts.json` is the **LLM eval set** — the fixture data and the verdict-level accuracy metric (`_readme`) are defined, but it does not run in CI yet; wiring a CI gate on it (real Extractor + real verdict engine, ≥90% bar) is separate, tracked work (issue #10), not implemented today. Scams use synthetic names only (no real agency defamed). Add real cases from DMW advisories over time.
- `starter/verdict-cases.md` is the **deterministic test matrix** — registry-lookup cases (R1–R16) and post-scoring cases (P1–P7). Implemented table-driven in `packages/core/src/{verdict,registry,scan}.test.ts`; new verdict-engine behavior should trace back to a case in this matrix the same way.
- Few-shot examples belong in the extraction prompt **only if** the default model's zero-shot accuracy on the fixture set is <90% — measure first. The metric is verdict-level (extraction → real verdict engine → compare post verdict), defined in `fixtures-posts.json` `_readme`.
- The result footer (freshness line + official DMW verify link + hotline) is required on every result; snapshot-test it.

## Extractor usage (ADR-0002 / ADR-0003)

Extraction uses an **OpenAI-compatible chat call** (provider/model/base URL are env config, never code): `response_format: json_schema` with `zodToJsonSchema(Extraction)` (on OpenRouter set `require_parameters: true`), vision-capable input (pasted text or screenshot — no OCR stage). Default model v1: `google/gemma-4-31b-it:free`; paid fallback Qwen2.5-VL via env var. Validate with `Extraction.safeParse`; for pasted text, drop any flag whose `evidence_quote` isn't a substring of the input. The real implementation: `apps/web/lib/extractor-client.ts` (the OpenAI-compatible fetch call) and `packages/core/src/scan.ts` (the retry-once-then-degrade wrapper, evidence-guard wiring, and `scanPost` orchestration). `starter/extraction.ts`'s call sketch is the original design reference these were built from.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (pandacall/ligtas-ofw) via the `gh` CLI; external PRs are a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used verbatim (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` (glossary) + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
