# 0001 — Agency lookup is name-only; license numbers are format-validated, not lookup keys

- Status: Accepted
- Date: 2026-07-14

## Context

The product headline and spec (`README-draft.md`, `verdict-cases.md` R1/R2) assume users can
verify an agency by **name or license number**, with license number as an exact-match lookup
key against the DMW registry.

Phase 0 reverse-engineering of the live DMW data source (`packages/sync/DATA-SOURCES.md`)
established that the public DMW agency API (`master-api.dmw.gov.ph`) exposes **no license
number field at all**. Verified three ways:

1. The `licensed-agencies` list record has 13 fields; none is a license number.
2. No detail-by-id or export endpoint exists (all candidates 404).
3. The SPA JS never references a `license_no`-style identifier.

There is therefore no public data to match a pasted license number against.

## Decision

- **Agency lookup is keyed on name only** (exact-normalized, then `pg_trgm` fuzzy).
- A pasted/claimed **license number is used for format validation only** — it feeds the
  deterministic `invalid_license_format` red-flag check, and may be shown as corroboration,
  but it is **never a registry lookup key**.
- The README promise is softened from "verify by license number" to "check the license
  **format**."

## Consequences

- **R1/R2 rewritten**: lookup-by-license-number cases become format-validation cases.
- **R15 (license-hijack detection) is not achievable via the registry.** Cross-referencing a
  claimed license number against a different agency row requires license-number data we don't
  have. Impersonation is still caught at the **post layer** (`page_hijack_pattern`, e.g.
  fixture `scam-15`), but the registry-layer R15 case must be dropped or reframed.
- If DMW later exposes license numbers (detail endpoint, FOI export, advisory PDFs), this can
  be revisited — the format-validation logic stays useful either way.

## Alternatives considered

- **Parse license numbers from advisory PDFs / `workabroad.ph`** — possible future source, but
  unreliable and out of scope for v1; deferred.
- **Keep license-number lookup as a promise, fail gracefully when not found** — rejected:
  every lookup would "fail," training users to distrust the tool.
