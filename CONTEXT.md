# LigtasOFW

Verifies Philippine recruitment agencies against the DMW's licensed-agency registry and scans
overseas job posts for illegal-recruitment red flags. This glossary is the project's shared
vocabulary — use these terms exactly in code, tests, and copy.

## Language

### Architecture

**Core**:
The surface-agnostic engine: extraction + verdict scoring + registry lookup. Contains no
Next.js, HTTP, or Messenger assumptions. Both Surfaces call the identical Core.
_Avoid_: backend, engine (except "verdict engine" as a Core component).

**Surface**:
A thin client that adapts the Core to a channel. Two planned co-equal Surfaces: the **Web** app
(ships in v1) and the **Messenger Bot** (roadmap, not v1). A Surface handles input/output
formatting only — it never issues verdicts.
_Avoid_: frontend, client, channel.

### Verdicts & scoring

**Verdict**:
The final ✅/⚠️/🚨 shown to the user. Its severity is one of `VERIFIED < CAUTION < HIGH_RISK`,
and it always carries `reasons[]` naming the evidence that produced it.

**Registry Verdict**:
The verdict derived solely from the DMW registry lookup (agency name match + license status +
expiry + job orders). Computed independently of the post.

**Post Verdict**:
The verdict derived solely from red-flag scoring of an extracted job post, on the same
severity scale. Computed independently of the registry. **A post with no Red Flags has Post
Verdict = VERIFIED** (so the Combined Verdict falls through to the Registry Verdict) — there is
no separate "pass" token.
_Avoid_: post-level result, scan result, PASS, PASS_TO_REGISTRY.

**Combined Verdict**:
`worst_of(Registry Verdict, Post Verdict)`. The whole point of the product: a registry-valid
agency still gets HIGH_RISK if the post has critical flags (impersonation).
_Avoid_: final score, merged verdict.

**Red Flag**:
A single observed illegal-recruitment signal (from the `RedFlag` enum), always paired with a
verbatim `evidence_quote` from the post. Tiered as Critical / Warning / Info in a data table,
not in code.
_Avoid_: warning, signal, indicator.

**Derived Flag**:
A Red Flag computed by the verdict engine from Extraction facts (a conjunction, e.g. any fee
+ HSW/seafarer position, or Korea factory work + private agency), never observed by the
Extractor — conjunctions are judgments, and judgments stay out of the model. Scored on the
same severity tiers; its evidence quotes are the extracted facts that triggered it. The
keyword tables driving derivation are data, not code.
_Avoid_: computed flag, rule flag.

**Flag Severity Tier**:
One of Critical (any one ⇒ HIGH_RISK), Warning (≥2 ⇒ HIGH_RISK, 1 ⇒ CAUTION), or Info (surface
but don't score). A property of each Red Flag, stored as data.

### Extraction

**Extraction**:
The Zod-validated object the LLM produces from a job post — facts plus observed Red Flags with
evidence. The LLM's only job. It is never a verdict.
_Avoid_: analysis, LLM output, classification.

**Extractor**:
The LLM call that produces an Extraction. A vision-capable open-weights model (free-tier
Gemma 4 31B v1; paid Qwen2.5-VL as fallback) reached via an OpenAI-compatible endpoint
(OpenRouter v1), taking pasted text or a screenshot directly — there is no separate OCR
stage. Schema enforced at decode time, Zod as the safety net. Provider/model/self-host are
env config, not code (see ADR-0002, ADR-0003).

**Unanalyzable**:
An escape-hatch state (not a point on the severity scale) when Extraction fails Zod validation
twice. Renders manual-search links with no verdict banner — never a guessed verdict.
_Avoid_: error, failure.

**Not a Job Post**:
An escape-hatch state (not a point on the severity scale) when the Extractor sets
`is_job_post = false` (a PSA, meme, etc.). Renders an info message with no verdict banner and
no registry lookup.
_Avoid_: invalid, rejected.

**Quota Exhausted**:
An escape-hatch state (not a point on the severity scale) when the day's scan budget (the
free extraction quota) is spent. Renders manual-search links with honest "daily limit
reached, subukan ulit bukas" copy — it never pretends the post couldn't be analyzed. The
Agency check is unaffected (no LLM involved).
_Avoid_: rate limited, out of credits.

### Registry & data

**Agency**:
A DMW-registered recruitment entity, keyed for lookup by **name only** (see ADR-0001). Carries
a License Status, expiry date, address, representative, and contacts.
_Avoid_: recruiter, company. ("Recruiter" specifically means an individual — see below.)

**Individual Recruiter**:
A person recruiting via a personal account (often with a GCash number) rather than a licensed
Agency. Presence of one is itself a Red Flag (`individual_recruiter_not_agency`).

**License Number (claimed)**:
A license number appearing in a Job Post. Format-validated only — never a registry lookup
key (ADR-0001), and a valid format is neutral Info that never counts toward VERIFIED (it is
trivially forgeable). Only an *invalid* format affects the verdict (Critical Red Flag).
_Avoid_: license lookup, license match.

**License Status**:
The DMW-assigned status string on an Agency (e.g. `Valid License`, `Cancelled`,
`Forever Banned`). The raw DMW vocabulary has 10+ values mapped to verdict severity via a data
table; an unknown status maps to CAUTION, never VERIFIED.
_Avoid_: license state, status code.

**Job Order**:
A DMW-approved (agency, principal, jobsite, position) authorization to deploy. Linked to an
Agency by **name string only** (no id). Absence of a matching Job Order is CAUTION, not
HIGH_RISK (data may lag).
_Avoid_: job posting, vacancy. (A "Job Post" is the untrusted social-media text; a "Job Order"
is the trusted DMW record.)

**Job Post**:
The untrusted user-submitted text or screenshot (usually Taglish) being scanned. Distinct from
a Job Order.
_Avoid_: job ad, listing.

**Registry**:
The nightly-synced local Postgres copy of DMW public data. User queries hit the Registry, never
DMW servers ("cache is the product").

**Freshness Stamp**:
The data-age indicator shown on every result. Sourced from the DMW record's own `data_as_of`
field plus our sync time. Required on every result alongside the official DMW verify link.
_Avoid_: timestamp, last-updated.
