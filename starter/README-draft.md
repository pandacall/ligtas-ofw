# LigtasOFW 🛡️

**I-check bago mag-apply.** Instantly verify Philippine recruitment agencies against the DMW's official licensed-agency registry — and scan job posts for illegal-recruitment red flags.

> 🚨 The Department of Migrant Workers took down **71,653 fake overseas job posts** in a single year — some funneling victims into Cambodia/Myanmar scam farms. The data to check a recruiter is public, but buried in a slow government site nobody checks. LigtasOFW makes it a 5-second habit.

<!-- demo GIF here: scam post pasted → 🚨 HIGH RISK with reasons -->

## What it does

- 🔎 **Agency check** — type a name or license number → license status (Valid / Suspended / Cancelled / Banned), validity dates, address, and approved job orders, synced nightly from DMW public data
- 📄 **Job-post scan** — paste text or a screenshot of a Facebook/TikTok job offer → AI extracts the claims, a deterministic rules engine checks them against the registry and 30+ illegal-recruitment patterns (upfront fees, tourist-visa deployment, trafficking-corridor destinations, license-format forgery…)
- 🧾 **Every result** shows its evidence, data freshness, and a link to verify on the official DMW site

## How it works

```
DMW SPA API + advisory PDFs + workabroad.ph  ──nightly sync──▶  Postgres (pg_trgm fuzzy search)
                                                                      │
paste/screenshot ──▶ Claude (extraction only, Zod-validated) ──▶ deterministic verdict engine ──▶ ✅/⚠️/🚨 + reasons
```

Design principles: **deterministic first** (the LLM never issues verdicts, only extracts), **cache is the product** (user queries never hit government servers), **evidence or it didn't happen** (every flag quotes the post verbatim).

## Stack

Next.js · TypeScript · Postgres/Drizzle · Playwright (data sync) · Anthropic API · GitHub Actions (nightly sync + fixture-based LLM evals in CI)

## ⚠️ Disclaimer

LigtasOFW republishes publicly available DMW data with timestamps. It is **not affiliated with the DMW** and is not legal advice. Always verify on the [official DMW website](https://dmw.gov.ph) and report illegal recruiters to the DMW hotline. Data can lag the registry — check the freshness stamp on every result.

## Contributing / Roadmap

- [ ] Messenger bot (meet users where the scams are)
- [ ] Weekly auto-digest of newly suspended/cancelled agencies
- [ ] Scam-trend dashboard from anonymized check logs
- [ ] Cebuano/Ilocano copy

MIT licensed. Kung nakatulong ito sa kakilala mo, share mo lang. 🇵🇭
