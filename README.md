# LigtasOFW

**Live: https://ligtas-ofw.vercel.app**

Verifies Philippine recruitment agencies against the DMW's licensed-agency registry and scans
overseas job posts (usually Taglish) for illegal-recruitment red flags — free, no account
needed.

- **Agency check** — look up an agency by name against a nightly-synced copy of DMW public
  data, with a Freshness Stamp and a link to verify on the official DMW site.
- **Job-post scan** — paste text or upload a screenshot of a job post; a vision LLM extracts
  claims and red flags with verbatim evidence, and a deterministic verdict engine scores them.

**Disclaimer:** LigtasOFW is an independent, unofficial tool. It is not affiliated with or
endorsed by the DMW. Results are a screening aid, not legal or official confirmation — always
verify directly with the [official DMW website](https://dmw.gov.ph) or DMW Hotline **1348**
before making a decision.

See `CLAUDE.md` for project/architecture notes and `CONTEXT.md` for the project glossary.
