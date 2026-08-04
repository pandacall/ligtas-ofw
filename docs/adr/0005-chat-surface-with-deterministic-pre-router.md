# 0005 — The Web Surface is a chat, routed deterministically first

- Status: Accepted
- Date: 2026-08-04
- Extends the Surface definition in `CONTEXT.md` (a Surface adapts the Core to a channel and
  never issues verdicts). Does not amend ADR-0001/0002/0003/0004 — agency lookup stays
  name-only, and the Extractor's model, transport, and no-OCR decisions are untouched.

## Context

The v1 Web Surface shipped as two bare HTML forms — an agency-name lookup at `/` and a
job-post scan at `/scan` — with no stylesheet of any kind in `apps/web`. Two problems, one
structural and one presentational:

1. **It made the user do the routing.** Someone who has just been asked for ₱15,000 by a
   recruiter on Messenger does not arrive knowing whether their question is an "agency check"
   or a "job-post scan". Forcing that choice at the front door is the product asking the
   frightened person to classify their own problem.
2. **It could not answer a question.** The registry lookup and the scan were the only two
   things the Surface could do. "Magkano ba ang legal na placement fee?" and "na-scam na ako,
   ano gagawin ko?" had nowhere to go, even though those answers are the difference between a
   screening tool and something actually useful.

The obvious reading of "make it a chatbot" is a tool-calling LLM agent. That reading conflicts
with the project's first invariant (*the LLM never issues verdicts — it only extracts*) and
with the free-tier constraint, so it is not what this ADR adopts.

## Decision

**The Web Surface is a single conversational front door.** `/` is the chat; `/scan` is
removed. The agency check and the job-post scan become things the conversation does.

Four decisions make that safe and affordable:

### 1. Structured-output routing, not tool calling

The Router is one OpenAI-compatible call with `response_format: json_schema` returning a
Zod-validated `{ intent, agency_name, kb_ids, reply }` — the same mechanism the Extractor
already runs at 95% fixture-eval accuracy (ADR-0002/0004). Native tool calling is rejected:
ADR-0004 is a record of free-tier flakiness, and tool calling is the least reliable thing to
ask a small free model to do. Failure handling mirrors `scan.ts`: validate, retry once with
the error appended, then degrade — never a third attempt, never a guessed route.

### 2. A deterministic pre-router runs first, and usually wins

`routeTurn` is pure and synchronous, and resolves the turns whose intent is structural: a
tapped chip, an attached screenshot, text long enough (or marker-dense enough) to be a pasted
advertisement, or an explicit Advisor KB keyword hit. Only genuinely ambiguous turns reach the
Router. This is a cost decision as much as a latency one — see below.

### 3. The model selects; it never authors

Advice is answered from the **Advisor KB**: a hand-written corpus in `packages/core`, data in
the same sense as `FLAG_SEVERITY` and `FLAG_COPY`. Every entry carries a `source` URL. The
Router returns entry *ids*; the Surface renders those entries' text verbatim. Three guards
enforce it:

- unresolvable `kb_ids` are dropped, and an advice turn left with nothing to cite degrades to
  `out_of_scope` rather than improvising;
- the Router's free-text `reply` **may not contain a digit** — every hotline, fee cap, date,
  and license number therefore comes from a KB entry or a deterministic card, never from model
  prose. A digit means invention, so the whole reply is replaced with canned copy;
- `reply` is capped and only ever rendered as a lead-in *above* a card, never in place of one.

### 4. The two LLM roles are metered separately

`scan_quota_events` gains a `kind` column (`'scan' | 'chat'`, default `'scan'`). Vision
extraction keeps `SCAN_DAILY_BUDGET=50`; text routing gets its own `CHAT_DAILY_BUDGET=500`.
A vision call and a routing call cost wildly different amounts, and — more importantly —
exhausting one must not disable the other.

## Consequences

- **The invariant holds and is now visible in the layout.** Verdicts still come only from
  `checkAgency` and `scorePost`; `extraction.ts`, `verdict.ts`, `registry.ts`, and `scan.ts`
  are unmodified, so the 95% eval and the R1–R16 / P1–P7 matrix stand. The design encodes
  this: Bantatay speaks in soft chat bubbles, while a verdict arrives as a stamped record
  card. Exactly one stamp per record — a registry verdict nested inside a scan renders as a
  quiet inline badge, so a registry-VERIFIED agency can never appear to argue against a
  HIGH_RISK post (the `scam-15` impersonation case).
- **Most turns cost nothing.** Chips, screenshots, pasted posts, and keyword-matched questions
  all resolve with zero LLM calls, which is what makes a chat viable on a 50/day vision budget.
- **Degradation is honest and partial.** When the chat budget is spent or the Router fails
  twice, the turn returns `router_unavailable` — a distinct state from `quota_exhausted` —
  and the copy points back at the chips, because the chips, the agency check, and keyword
  advice all still work. The Agency check never needed a model at all.
- **The KB only covers what we write.** A question outside it is answered with a redirect to
  DMW Hotline 1348, not a guess. Coverage grows by adding cited entries, and
  `advisor-kb.test.ts` fails any entry lacking a source.
- **Conversations are not persisted server-side.** Users paste contracts, salaries, and
  recruiter numbers; none of that needs to outlive the tab. Messages live in React state only.
  The quota table keeps storing IPs, as it already did.
- **The persona is now product vocabulary.** "Bantatay" (*Bantay* + *Tatay*) appears in copy
  and metadata, and is added to `CONTEXT.md`.

## Alternatives considered

- **Keep the two forms, just add CSS.** Rejected: styling fixes the presentational complaint
  but not the structural one — the user is still asked to classify their own problem, and
  general questions still have nowhere to go.
- **Native tool calling with an LLM agent.** Rejected: unreliable on the free tier (ADR-0004),
  and it invites the model toward authoring the verdict rather than routing to it.
- **A paid model for the conversation, free tier for extraction.** Recommended during design
  and explicitly declined — the free-tier constraint is a product commitment. The
  structured-output router and the zero-LLM fast path are the engineering consequences of
  honouring it.
- **RAG over scraped DMW advisories instead of a hand-written KB.** Rejected for now:
  `dmw.gov.ph` is the catch-all SPA that forced Phase 0's runtime endpoint discovery, so
  ingestion is fragile, and it adds a vector store plus a freshness pipeline to operate. A
  small cited corpus is auditable and unit-testable; revisit if coverage becomes the binding
  constraint.
- **Prompt guardrails with no corpus.** Rejected: it reduces the advisor to a deflection
  machine that can only say "tumawag sa 1348".
