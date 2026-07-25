# DMW Data Sources — Phase 0 Findings

_Captured 2026-07-14 via `starter/phase0-capture.ts` + direct-fetch verification._

## Summary

**The nightly sync is a plain browserless JSON pull.** `dmw.gov.ph` is a Nuxt SPA, but its
data comes from a separate public REST API host (`master-api.dmw.gov.ph`). The endpoints
work with a plain `fetch` — **no browser, no session, no per-request token** — as long as a
static `x-api-key` header is sent. Playwright is therefore only needed for *discovery*
(Phase 0), not for ongoing sync.

## API host

```
https://master-api.dmw.gov.ph/api/v1/public/
```

### Required headers

```
x-api-key: RTA0X0lOWFcycm9KU29WTlZxNDUzSDY5enc5OWFxY2ktWkxVdkFwZjEyMjkwNTA2MTE
accept:    application/json
origin:    https://dmw.gov.ph      # sent by the SPA; include to be safe
referer:   https://dmw.gov.ph/
```

⚠️ **On the API key:** it is a *static* key embedded in the public SPA JS bundle — anyone can
read it off the live site, so it is not a secret in the credential sense. But it can rotate
without notice. Store it in an env var (`DMW_API_KEY`), don't hardcode it, and have Phase 0
re-discovery as the fallback when sync starts returning 401.

## Endpoints

### 1. Licensed agencies (registry — the agency check)

```
GET /api/v1/public/licensed-agencies?page={n}
GET /api/v1/public/licensed-agencies/filter?page={n}&name={query}   # server-side search
```

- **Total: 3,790 records**, `perPage: 50`, `lastPage: 76`.
- We sync **all** pages nightly (cache is the product); the `/filter` endpoint is *not* used
  at query time — we search our local `pg_trgm` copy instead.

Response shape:

```jsonc
{
  "meta": {
    "total": 3790, "perPage": 50, "currentPage": 1, "lastPage": 76,
    "nextPageUrl": "/api/v1/public/licensed-agencies?page=2", "previousPageUrl": null
  },
  "data": [
    {
      "name": "101 MOJO INT`L. CORPORATION",
      "classification": "Private Employment Agency",
      "license_status": "Valid License",
      "license_status_date": "2025-11-11T00:00:00.000Z",
      "license_expiration_date": "2031-10-03T00:00:00.000Z",
      "is_valid": true,
      "representative": "JAMES TAN ONG LOPEZ",
      "address": "UNIT 103-203, G/F, FILHIGH TRADING BUILDING, ...",
      "municipality_province": "MALATE",
      "city_province": "MANILA",
      "contact_number": "(02) 86818959/09178870567/...",
      "eMail": "101mojorecruit@gmail.com/101mojo.dh@gmail.com",
      "data_as_of": "2026-07-14T05:00:00.250Z"
    }
  ]
}
```

**Note:** the API provides **no license number field** in this endpoint. The registry can be
searched by name only here. License-number lookup (verdict cases R1/R2) will need either a
different field/endpoint or must be derived — **open question, see CONTEXT.md**.

**Note:** `data_as_of` is a per-record freshness stamp straight from DMW — use it for the
mandatory freshness line (pillar 5) rather than only our own sync timestamp.

### 2. Approved job orders

```
GET /api/v1/public/approved-job-orders?page={n}
GET /api/v1/public/approved-job-orders/filter?page={n}&jobsite={query}
```

- **Total: 134,566 records**, `perPage: 50`, `lastPage: 2,692`. Larger, but fine nightly.

Response shape:

```jsonc
{
  "meta": { "total": 134566, "perPage": 50, "lastPage": 2692, ... },
  "data": [
    {
      "agency": "STUDIO 85 PROMOTIONS INC",
      "principal": "NAKAMOTO GUMI CO",
      "jobsite": "JAPAN",
      "position": "WELDING",
      "balance": "15",
      "date_approved": "2031-03-26T00:00:00.000Z",
      "accreditation_class": "Regular Accreditation",
      "data_as_of": "2026-07-14T04:00:04.053Z"
    }
  ]
}
```

- Job orders link to agencies by **`agency` name string only** (no id) — join is name-based,
  so normalization matters.

## Observed `license_status` values (⚠️ richer than the spec assumed)

Sampled across pages 1, 38, 76. `verdict-cases.md` assumes only valid/suspended/cancelled/banned.
Reality (non-exhaustive — a full-sync scan should enumerate all):

| Raw status                       | Severity (decided 2026-07-14)     |
|----------------------------------|-----------------------------------|
| `Valid License`                  | VERIFIED (subject to expiry check)|
| `Valid License - Provisional`    | CAUTION ("provisional — verify")  |
| `Expired`                        | HIGH_RISK                         |
| `Cancelled`                      | HIGH_RISK                         |
| `Forever Banned`                 | HIGH_RISK                         |
| `Delisted`                       | HIGH_RISK                         |
| `Denied Renewal`                 | HIGH_RISK                         |
| `Ceased Operations`              | HIGH_RISK                         |
| `Suspended (Document Processing)`| CAUTION (may be renewal-in-progress; show note + verify link) |
| `Inactive`                       | CAUTION                           |
| _any unrecognized status_        | CAUTION (default; never VERIFIED) |

The status → severity mapping is **table-driven data** (pillar 3). `is_valid` from the API is
kept only as a cross-check, never as the verdict source. A full-sync scan should enumerate all
statuses to catch any not seen in the page 1/38/76 sample.

**Revisit note:** `Suspended (Document Processing)` is CAUTION "for now" — if it turns out to
be disciplinary rather than administrative, promote to HIGH_RISK.

## Sync strategy (decided 2026-07-25)

- **Full replace, nightly.** All pages of both endpoints (~2,768 requests at 50/page, ~300ms
  spacing ≈ 15–20 min in GitHub Actions). No delta API exists, and full replace propagates
  DMW delistings automatically — an upsert sync would keep showing rows DMW removed.
- **Staging-swap:** load into staging tables; promote to live in one transaction only after a
  complete pull. A crashed sync leaves last night's registry serving untouched — stale-but-
  stamped is designed behavior (the Freshness Stamp surfaces it), half-empty is catastrophic
  (missing agency ⇒ false HIGH_RISK "not found").
- **Row-count tripwire:** abort the swap if the new agency count is >10% below the live
  count. Guards against a half-broken API mass-flagging legit agencies as unregistered.
- **On failure (incl. 401 = rotated `x-api-key`):** fail the workflow loudly and auto-open a
  GitHub issue with the remedy (re-run `starter/phase0-capture.ts`, update `DMW_API_KEY`
  secret). No automatic re-discovery in CI — a key rotation is a "DMW changed something"
  signal a maintainer should see.

## Reproduction

```bash
npm i -D playwright tsx && npx playwright install chromium
npx tsx starter/phase0-capture.ts       # discovery → starter/phase0-findings/
# then verify browserless fetch with the x-api-key header above
```
