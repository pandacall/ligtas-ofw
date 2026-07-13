# Verdict Engine — Table-Driven Test Cases

Verdict = worst of (registry_verdict, post_verdict). Severity: VERIFIED < CAUTION < HIGH_RISK.
Registry verdicts come from the DB lookup; post verdicts from red-flag scoring. Every verdict carries `reasons[]`.

## Registry lookup cases (deterministic, no LLM)

| # | Input | DB state | Expected verdict | Expected reasons |
|---|---|---|---|---|
| R1 | license "DMW-072-LB-09262023-UL" | exact match, status=valid, expires 2027 | VERIFIED | matched by license |
| R2 | license "dmw 072 lb 09262023 ul" (messy) | same row | VERIFIED | normalizer strips case/spaces/dashes |
| R3 | name "XYZ International Placement Agency, Inc." | exact normalized name match, valid | VERIFIED | |
| R4 | name "XYZ Intl Placement" | trigram sim 0.68 vs canonical | VERIFIED (with "matched to: <canonical>") | fuzzy ≥0.55 |
| R5 | name "XYZ Placement" | sim 0.48 | CAUTION | "did you mean" top-3 list shown, no auto-match |
| R6 | name "Totally Unknown Agency" | no row ≥0.4 | HIGH_RISK | "not found in DMW list as of <sync_date>" |
| R7 | any match | status=suspended, status_date present | HIGH_RISK | "suspended since <date>" |
| R8 | any match | status=cancelled | HIGH_RISK | |
| R9 | any match | status=banned | HIGH_RISK | |
| R10 | valid match | license_validity < today | HIGH_RISK | "license expired <date>" |
| R11 | valid match | license_validity < today+60d | CAUTION | "expires soon" |
| R12 | valid match + claimed destination "Japan", position "welder" | job_orders has (Japan, welder) | VERIFIED | job order shown |
| R13 | valid match + claimed "Japan"/"welder" | job_orders has rows but none for Japan | CAUTION | "no approved job order for Japan on file" |
| R14 | valid match | job_orders empty for agency | CAUTION | "no job orders on file — data may lag; verify" |
| R15 | license matches row A, name matches row B | conflict | CAUTION | "license belongs to <A>, not <claimed name>" — likely license hijack |
| R16 | two rows both sim ≥0.55 (branch offices) | ambiguous | CAUTION | show both, never auto-pick |

## Post-analysis cases (LLM extraction → deterministic scoring)

| # | Fixture | Post verdict | Why |
|---|---|---|---|
| P1 | scam-01 | HIGH_RISK | ≥1 critical flag (upfront_fee) |
| P2 | scam-03 | HIGH_RISK | trafficking corridor = always critical |
| P3 | scam-15 (impersonation) | HIGH_RISK | page_hijack + informal payment, EVEN IF registry says VERIFIED → combined = HIGH_RISK (worst-of) |
| P4 | legit-01 | PASS (no post flags) | combined verdict = registry verdict |
| P5 | legit-04 | PASS | "URGENT" alone must NOT flag |
| P6 | legit-05 | NOT_A_JOB_POST | render info message, no verdict banner |
| P7 | extraction schema parse fails twice | UNANALYZABLE | "couldn't analyze — check manually" + manual search links; never guess |

## Flag severity table (encode as data, not code)

- **Critical (any one ⇒ HIGH_RISK):** upfront_fee, excessive_placement_fee, tourist_visa_deployment, trafficking_corridor_destination, atm_card_collateral, fake_certificate_offer, entertainer_visa_bypass, page_hijack_pattern, no_passport_needed_claim, invalid_license_format (when a license is claimed), fee for HSW/seafarer roles, private-agency Korea E-9 post
- **Warning (≥2 ⇒ HIGH_RISK, 1 ⇒ CAUTION):** telegram/whatsapp_only_contact, informal_payment_channel, urgency_pressure, no_agency_identified, individual_recruiter_not_agency, chat_only_interview, no_physical_office, salary_anomaly, guaranteed_approval_claim, insider_connection_claim, visa_assistance_disguise
- **Info (surface but don't score):** direct_hire_claim (legit direct hire exists via DMW Direct Hire route — link to it), social_proof_flood, testimonial_bait

## Copy rules (test the strings too)

- Every verdict string names its evidence: "🚨 Humihingi ng ₱15,000 'processing fee' — bawal ang bayad bago ang pirmadong job order."
- Every result ends with: data freshness line + official DMW verify link + DMW hotline. Snapshot-test this footer.
- HIGH_RISK results additionally show "Paano mag-report" (DMW/IACAT hotlines).
