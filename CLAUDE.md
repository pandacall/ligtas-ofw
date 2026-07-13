# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**This is a spec-stage project.** The `starter/` directory holds the design — Zod schemas, the extraction prompt, the verdict-engine test matrix, and LLM eval fixtures — but the application itself has not been scaffolded yet. There is no `package.json`, build, lint, or test runner. When implementing, treat `starter/` as the authoritative spec, not as code to import as-is (the intended package layout, e.g. `packages/core/extraction.ts`, differs from the flat `starter/` location).

## What LigtasOFW does

Verifies Philippine recruitment agencies against the DMW's licensed-agency registry and scans overseas job posts (usually Taglish) for illegal-recruitment red flags. Two surfaces:
- **Agency check** — name or license-number lookup against a nightly-synced copy of DMW public data.
- **Job-post scan** — paste text/screenshot → LLM extracts claims → deterministic engine issues the verdict.

Intended stack (from `starter/README-draft.md`): Next.js · TypeScript · Postgres/Drizzle (`pg_trgm` fuzzy search) · Playwright (data sync) · Anthropic API · GitHub Actions (nightly sync + fixture evals in CI).

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

`dmw.gov.ph` is a catch-all SPA — every path returns the same JS shell, so the JSON data endpoint can only be discovered at runtime. `starter/phase0-capture.ts` drives headless Chromium to record XHR/fetch traffic and dump candidate endpoints. The goal: identify the agencies/job-orders endpoints, then confirm they can be fetched directly (no browser) so ongoing sync is a plain JSON pull. Document findings in `packages/sync/DATA-SOURCES.md`.

Run it:
```
npm i -D playwright tsx && npx playwright install chromium
npx tsx starter/phase0-capture.ts   # writes to phase0-findings/
```

## Testing expectations

- `starter/fixtures-posts.json` is the **LLM eval set** — run it in CI on any prompt/extraction change. Scams use synthetic names only (no real agency defamed). Add real cases from DMW advisories over time.
- `starter/verdict-cases.md` is the **deterministic test matrix** — registry-lookup cases (R1–R16) and post-scoring cases (P1–P7). Implement the verdict engine table-driven against these.
- Few-shot examples belong in the extraction prompt **only if** Haiku's zero-shot accuracy on the fixture set is <90% — measure first.
- The result footer (freshness line + official DMW verify link + hotline) is required on every result; snapshot-test it.

## Anthropic usage

Extraction uses a tool-call with `tool_choice` forcing `record_extraction`, schema = `zodToJsonSchema(Extraction)`, on a Haiku-class model. Validate with `Extraction.safeParse`. See the call sketch at the bottom of `starter/extraction.ts`.
