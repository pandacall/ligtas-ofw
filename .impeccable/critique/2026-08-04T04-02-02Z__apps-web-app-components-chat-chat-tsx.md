---
target: the Bantatay chat surface
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-04T04-02-02Z
slug: apps-web-app-components-chat-chat-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Results are never announced to assistive tech (only live region is the typing indicator); chips give no visible armed state; chipless actions render an empty 28×20 message bubble |
| 2 | Match System / Real World | 3 | Salakot, Taglish, ₱, GCash, 1348 all land — then the verdict reads `HIGH_RISK`, a snake_case enum, and record fields stay English inside Taglish cards |
| 3 | User Control and Freedom | 2 | "Did you mean" candidates are inert `<li>`s — you cannot tap the agency you meant. No retry, re-run, edit, copy, or clear-conversation |
| 4 | Consistency and Standards | 3 | Card grammar held tightly; but escape hatches wear the same manila document stock as adjudicated verdicts, and the textarea is the only focusable control with no 2px ring |
| 5 | Error Prevention | 3 | Best category — LICENSE_FORMAT_NEUTRAL_COPY pre-empts "valid format = valid licence". Undone by the nested green VERIFIED badge |
| 6 | Recognition Rather Than Recall | 3 | Chips and footers repeat reliably; re-checking a candidate requires retyping it from memory |
| 7 | Flexibility and Efficiency | 2 | Enter/Shift+Enter is right; nothing else. No clipboard-paste of a screenshot, no camera, no copy/share of a verdict |
| 8 | Aesthetic and Minimalist Design | 3 | The stamp is a real idea, disciplined restraint around it; but a HIGH_RISK card is ~2,000px of uniform-weight content with no progressive disclosure |
| 9 | Error Recovery | 3 | Four distinct, honest, non-fabricating escape hatches. But no retry on transport failure, no wait time on rate-limit, no recovery on not-found |
| 10 | Help and Documentation | 3 | "Ano ito?" chip, KB cards linking sources as first-class. Nothing explains what the DMW list actually covers, or why not-found ≠ scam |
| **Total** | | **27/40** | **Acceptable — significant improvements needed** |

Assessment A scored 28. I lowered heuristic 1 from 3 to 2 on Assessment B's runtime evidence: the conversation state has **zero headings**, results are inserted into a plain `<div>` with no live region, and chipless actions emit an empty bubble. That drops the total into the Acceptable band rather than Good.

## Design Specificity Verdict

**Authored — with one category-interchangeable screen, and it's the first one.**

The verdict world could not be lifted into another product. Manila stock because the paper is named after the city where DMW files live. Narra brown for the persona, deliberately excluded from red/amber/green so the voice can never be misread as a verdict. A salakot — literally a thing that shelters you. The double rule under a record header, straight off a paper form. The copy table reasons in Philippine recruitment law, not generic scam vocabulary.

The exception is the arrival screen. Strip the Tagalog and it is indistinguishable from every AI chat empty state shipped in 2025: grey ground, circular avatar, display headline, outline pill chips, bottom composer with paperclip and circular send. **Zero manila, zero mono, zero stamp** — the entire committed visual world is withheld until a result arrives. At 1440 it's worse: a 672px column stranded in a 1440px field with the right two-thirds empty.

**Deterministic scan: CLEAN.** `detect.mjs` returned `[]`, exit 0, across `apps/web/app/components`, `page.tsx`, and `layout.tsx`. Re-run with `--no-config` and over the whole tree: same. No config suppressing anything. Worth stating plainly — a clean detector caught **none** of the issues below. It confirms the absence of slop patterns; it cannot see a green badge undermining a red verdict.

## Overall Impression

The engine-facing half is genuinely well made and the stamp is a real design idea — it encodes an architectural guarantee as a visual one, which almost nothing manages. The measured fundamentals hold: zero console errors, zero horizontal overflow at any viewport, every text contrast passing, reduced-motion correctly clamping all nine animated elements.

The single biggest opportunity is that **the card most likely to save someone money ends on the most reassuring pixel on the page.**

## What's Working

**1. The stamp is a structural argument, not decoration.** `VerdictStamp` renders only for `checkAgency` and `scorePost`; Bantatay's own words stay in soft bubbles. The user learns without being told that the machine that talks and the machine that judges are different machines.

**2. Contrast was solved against the real surface, and the numbers hold.** Measured on rendered pixels: risk red on manila 4.75:1, verified green 5.33:1, caution brown 5.05:1, evidence ink 9.75:1. Verdict meaning never rides on colour alone — emoji plus word plus bordered box survive greyscale.

**3. Four escape hatches that refuse to fabricate, in four distinct voices.** UNANALYZABLE names *both* failure directions ("huwag ipagpalagay na ligtas o peke"). QUOTA_EXHAUSTED explains the limit is shared and notes agency check still works. Most products collapse all four into "Something went wrong."

## Priority Issues

### [P0] The HIGH_RISK scan card ends on a green VERIFIED badge

**What.** The nested registry section renders last in `ScanResultCard.tsx`, and `VerdictInline` draws a green-bordered pill with a full-saturation ✅ and the word VERIFIED — immediately above a bold agency name and `LICENSE STATUS: Valid License`. Its code comment claims it is "quiet on purpose." It is the only green pixel on an all-manila card.

**Why it matters.** This is `scam-15`, the impersonation case — the exact scenario worst-of() exists for. A frightened person skims a 2,000px card and the last substantive thing they see is a green check and "Valid License." The card never says the sentence it needs to: *the agency is real, this post is not.*

**Fix.** Move the registry section above the red flags so the card ends on danger, not reassurance. Drop the ✅ and the green from `VerdictInline` — render nested registry status as neutral manila-ink mono. Add a mandatory reconciliation line when `registry.verdict !== result.verdict`.

**Suggested command:** `$impeccable polish`

### [P1] The verdict is invisible to assistive technology

**What.** Runtime-verified: the conversation state has **zero headings** — `Arrival` owns the only `h1` and unmounts on first send, so the document loses every heading for the rest of the session. Result components start at `h3`. There is no `<main>` landmark on `/`. The only live regions in the app are the typing indicator and the connection-error alert; results are inserted into a plain `<div>`, so a screen reader announces "Bantatay is thinking" and then goes silent permanently.

**Why it matters.** A blind OFW gets this product with the verdict removed.

**Fix.** Wrap results in `role="status" aria-live="polite"`. Render the verdict as the card's `h2` with a text prefix. Keep a persistent `h1` (visually hidden after arrival). Add `<main>`.

**Suggested command:** `$impeccable harden`

### [P1] No actionable next step after HIGH_RISK — the hotlines are dead text

**What.** Fourteen links across a full result stream; **zero `tel:` links.** `DMW Hotline: 1348`, `IACAT 1343`, and `(02) 8722-1144` are plain `<li>` text at 0.7rem mono at the bottom of a 2,000px card. `VERDICT_BANNER.HIGH_RISK` says "i-report ito" and provides no way to do it.

**Why it matters.** Casey is one-handed, has just been told this is a scam, and reporting requires memorising a number and leaving the app. Every friction step is a person who doesn't report.

**Fix.** Make all three numbers `tel:` links. Add one narra button directly beneath the HIGH_RISK stamp — "Tumawag sa DMW 1348" — at ≥44px, before the flags. Raise the report block to body size on HIGH_RISK.

**Suggested command:** `$impeccable clarify`

### [P1] The interaction is silent — chips, focus, and a phantom bubble

Three separately-measured defects, one felt experience:

- **Chips arm invisibly.** `selectChip` sets state and returns. No `aria-pressed`, no fill change, no focus moved to the textarea (confirmed: `activeElement` stays the button), so no keyboard opens on mobile. The only feedback is a small pill at the bottom edge while the user's eyes are 300px higher.
- **The textarea is the only control with no focus ring.** `outline-none` at `Composer.tsx:114`; the other 7 tab stops all get a 2px ring at 6.85–8.77:1. Its only indication is a 1px container border — high contrast (6.57:1 state change) but under-thick and inconsistent.
- **Chipless actions emit an empty bubble.** "Mga hotline" sends `text: ""`, rendering a 28×20 solid narra div with no content and no accessible name.

**Why it matters.** Jordan taps a chip, sees nothing happen, taps again, tries another, leaves.

**Fix.** Focus the textarea on arm (this alone opens the keyboard). Give the armed chip `aria-pressed` and a filled state. Restore a focus ring on the textarea. Suppress the user bubble when there is no user text.

**Suggested command:** `$impeccable polish`

### [P2] Touch targets are below 44px across the primary CTAs

**What.** Measured at both viewports: all five quick-action chips are **34.5px** tall (9.5 under), send and attach are **36×36** (8 under). Four standalone block links inside cards are 20px tall. (Inline links inside sentences are exempt under WCAG 2.5.8 — those are correctly false positives.)

**Why it matters.** These are the arrival screen's primary CTAs, for a one-handed user on a cheap phone.

**Fix.** Chips to `py-2.5` minimum, icon buttons to 44×44 with the icon staying 20px.

**Suggested command:** `$impeccable adapt`

### [P2] The data model leaks into the interface

**What.** The stamp reads `HIGH_RISK` — an English snake_case enum — to a Filipino domestic worker, on a card where everything else is Taglish. Record fields are untranslated too: `LICENSE STATUS`, `VALIDITY`, `JOB ORDERS`, `No approved Job Orders on file.` `VerdictStamp` defends this as CONTEXT.md vocabulary "verbatim" — but CONTEXT.md is an engineering glossary, not user copy. Separately, `not_found` and `ambiguous` are dead ends: candidates are untappable, and a dropped "Services Inc." stamps 🚨 HIGH_RISK on a real agency.

**Why it matters.** A false 🚨 on an agency the user knows is legitimate teaches them to distrust the tool immediately before they most need it.

**Fix.** `MAPANGANIB` / `MAG-INGAT` / `LIGTAS` stamp just as well and need no English. Translate the record labels. Make candidates tappable buttons that re-run the check.

**Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Casey (one-handed, cheap Android, slow connection).** 2,000px HIGH_RISK card = 2.4 full screens of thumb-scrolling to reach hotline numbers she cannot tap. Chips at 34.5px, send at 36×36. No camera option and no clipboard-paste, so "screenshot the recruiter's message" means picker → gallery → find → select. Chips row wraps to two lines at 390px with "Ano ito?" orphaned, and re-renders in full after every turn, pushing the composer down mid-conversation.

**Jordan (confused first-timer).** Eight interactive targets on arrival. Taps a chip, nothing visibly happens. Reaches a verdict and is shown `HIGH_RISK` — English, snake_case — surrounded by Taglish.

**Sam (screen reader / keyboard-only / low vision).** Verdict is a `<p>`. No live region on results. Zero headings after the first turn. No `<main>`. Escape hatches have no heading. Evidence items are `<li>`s with no severity marker, so Critical and Info are indistinguishable in speech. Mono record labels render at **10.4px** with 0.16em tracking — a legibility problem independent of contrast. Header avatar announces "Bantatay, Bantatay".

## Minor Observations

- **Shipped typo in user-facing copy:** `NOT_A_JOB_POST_COPY` reads "ma-anaylize" — should be "ma-analyze".
- **Info-tier flags are visually scored.** `direct_hire_claim` renders in the same `.evidence` band as `upfront_fee`. Invariant 3 says Info should surface but not score; the UI scores it by giving it equal weight.
- **Escape hatches wear document stock.** A rate-limit apology on manila with a freshness footer is a category error in this design's own grammar.
- **Non-text contrast:** hairline `#d3dbd6` on `#eef1ee` = **1.24:1**. On the composer wrapper that 1px border is the input's only boundary, so 1.4.11 bites there.
- **Disabled send button** paints at 1.85:1 — WCAG-exempt, but measurably illegible.
- **`isPending` disables the whole composer**, so a user cannot start typing the next question while waiting.
- **Desktop never uses its width** — a 672px card in a 1440px field. The verdict card would take a two-column layout well at ≥1024px.
- **The stamp's `transform-origin: left center`** pins its left edge flush to the record rule; a rubber stamp reads better fully off-axis.

## Questions to Consider

1. If the deterministic engine is the product's whole claim to trustworthiness, why does the first screen show none of the engine's visual language — is the chat frame earning its place, or borrowing credibility from ChatGPT?
2. Whose vocabulary is a glossary — the engineers', or the woman with ₱15,000 in her GCash?
3. What is the real false-positive rate of `not_found` → HIGH_RISK against genuine DMW name variants?
4. The card delivering "you are about to be scammed" is the coldest artefact in the design — all mono, all paperwork, ending in phone numbers. Should the HIGH_RISK card break the "verdicts are documents" rule and speak?
5. Five identical chips reappear after every turn, including "Ano ito?" after a HIGH_RISK verdict. Why is the next-step affordance context-free when the system knows exactly what just happened?
