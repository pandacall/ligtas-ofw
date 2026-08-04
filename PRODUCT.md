# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Overseas Filipino Workers and aspiring OFWs, plus the family members who check on their behalf.

The primary user arrives **mid-doubt, from a shared link** — someone posted it in an OFW Facebook group, or a friend sent it, at the exact moment a recruiter is asking for money. They already have a specific agency name or a job post in hand. They are frightened, often on a cheap Android phone on prepaid mobile data, frequently at night, and they need an answer in under a minute. Many are about to hand over ₱15,000–₱80,000, often borrowed against family land or a salary loan.

They read Taglish natively. English-only interface text is a barrier, not a neutral default.

## Product Purpose

Verify whether a Philippine recruitment agency is licensed by the DMW, and scan overseas job posts for signs of illegal recruitment, so a worker can tell a real opportunity from a scam **before** paying anyone.

Success has two confirmed definitions, both routed through the verdict:

1. **Someone doesn't send the money.** A user reads a HIGH_RISK verdict and walks away. This requires the verdict to land hard and be believed.
2. **Reports reach the DMW.** Illegal recruiters get reported and shut down, so one person's check protects many. This requires the path from verdict to filed complaint to actually work.

## Positioning

A deterministic verdict engine, not a chatbot that opines. An LLM extracts claims and observed red flags from a post; a separate rules engine — encoding actual Philippine recruitment law — issues the ✅/⚠️/🚨. Every red flag carries a verbatim quote from the post that triggered it. A competitor wrapping a general-purpose model cannot truthfully make that claim, and cannot show the evidence.

Independent and explicitly **not** affiliated with the DMW. That disclaimer is a standing legal requirement and appears on screen at all times.

## Operating Context

- **The scam arrives as a Facebook or Messenger post**, often a screenshot of a screenshot. Pasting text and uploading a screenshot are both first-class inputs.
- **Registry data is a nightly-synced local copy** of DMW public data — 3,793 agencies and 134,734 job orders as of 2026-08-03. User queries never touch DMW servers. Every result carries a freshness stamp and a link to verify officially.
- **Agency lookup is name-only.** The DMW API exposes no license numbers (ADR-0001), so a claimed license number is format-validated and never used as a lookup key.
- **Reporting routes**: DMW Hotline 1348, DMW Anti-Illegal Recruitment Branch (02) 8722-1144 / 8722-1155, IACAT 1343 Actionline for trafficking.

## Capabilities and Constraints

- Three capabilities, reached through one conversational surface: **agency check** (no LLM), **job-post scan** (vision LLM extraction), and **cited advice** from a hand-written corpus.
- **Free, no account, nothing to install.** A confirmed product commitment, not a budget default.
- **Hard upstream ceiling: 50 free LLM requests per day** across the whole account (OpenRouter free tier). Most turns must resolve with zero model calls; a deterministic pre-router handles chips, screenshots, pasted posts, and keyword-matched questions.
- **The LLM never issues a verdict.** Non-negotiable. It extracts; the rules engine adjudicates.
- **Degrade, never fabricate.** Extraction failure, quota exhaustion, and rate limiting each have their own honest state; none ever guesses a verdict.
- **Conversations are not persisted server-side.** Users paste contracts, salaries, and recruiter numbers.
- Domain vocabulary is fixed in `CONTEXT.md` and used verbatim in code and copy.

## Brand Commitments

- **Name:** LigtasOFW. **Assistant persona:** Bantatay — *Bantay* (guardian) + *Tatay* (father). Confirmed and in use.
- **Voice:** Taglish, plain, never alarmist and never reassuring beyond the evidence. Errors name the problem and the recovery.
- **Standing disclaimer:** independent, unofficial, not affiliated with or endorsed by the DMW.
- **Volunteered visual constraint (2026-08-04):** the user asked for a bright, soft, friendly direction for the redesign. Recorded as stated, not expanded.

## Evidence on Hand

- Live registry data in production Neon (counts above), nightly sync via GitHub Actions.
- `starter/fixtures-posts.json` — 20 labelled job posts (15 scam, 5 legitimate). Scam entries use **synthetic agency names only**; no real agency is named as fraudulent.
- `starter/verdict-cases.md` — the R1–R16 / P1–P7 decision matrix the engine is tested against.
- Measured extraction accuracy: 19/20 (95%) verdict-level on the fixture set.
- **No real user testimonials, usage numbers, press, or partnerships exist.** Future work must not fabricate them.

## Product Principles

1. **The evidence is the product.** Every verdict names the verbatim quote that caused it. Never assert without showing.
2. **Wrong-and-reassuring is the only unacceptable failure.** A false alarm costs a user time; a false all-clear costs them their savings. When uncertain, degrade honestly rather than comfort.
3. **The panicked minute is the design target.** Someone arrives from a shared link with a name in hand and needs an answer before they lose their nerve. Explanation is secondary to answering.
4. **A verdict that cannot be acted on is half a product.** Both success definitions end in an action — walking away, or reporting — so the path from verdict to next step is part of the verdict.
5. **Free and account-less is a promise to the user, not a cost decision.** Engineer within the ceiling rather than around the promise.

## Accessibility & Inclusion

- Mobile-first and small-screen-first; assume a cheap Android phone, prepaid data, and outdoor daylight.
- Taglish throughout. English-only interface text excludes part of the audience.
- Verdict meaning must never rely on colour alone.
- Text contrast is measured against the surface it actually sits on, not assumed.
- Known open gap (2026-08-04 critique): results are not announced to screen readers and the conversation state has no heading structure. Must be fixed in the redesign.
