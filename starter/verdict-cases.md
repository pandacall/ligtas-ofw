# Verdict Engine — Table-Driven Test Cases

Verdict = worst of (registry_verdict, post_verdict). Severity: VERIFIED < CAUTION < HIGH_RISK.
Registry verdicts come from the DB lookup; post verdicts from red-flag scoring. Every verdict carries `reasons[]`.

## Registry lookup cases (deterministic, no LLM)

Registry lookup is **name-only** (ADR-0001: the DMW API exposes no license-number field).
A claimed license number is format-validated only — it is never a lookup key, and a
valid format never counts *toward* VERIFIED (trivially forgeable). Only an invalid format
moves the verdict (Critical `invalid_license_format`).

| # | Input | DB state | Expected verdict | Expected reasons |
|---|---|---|---|---|
| R1 | name match valid + claimed license "DMW-072-LB-09262023-UL" (valid format) | name row valid, expires 2027 | VERIFIED (from name lookup alone) | license shown as Info with format-only disclaimer; no flag, no boost |
| R2 | claimed license "dmw 072 lb 09262023 ul" (messy) | n/a (format check is pre-DB) | no flag | normalizer strips case/spaces/dashes before format check ⇒ still valid format |
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
| ~~R15~~ | _dropped (ADR-0001)_ — license-hijack cross-reference needs license-number registry data that doesn't exist | | | impersonation is caught at the post layer instead: `page_hijack_pattern`, case P3 / fixture scam-15 |
| R16 | two rows both sim ≥0.55 (branch offices) | ambiguous | CAUTION | show both, never auto-pick |

## Post-analysis cases (LLM extraction → deterministic scoring)

| # | Fixture | Post verdict | Why |
|---|---|---|---|
| P1 | scam-01 | HIGH_RISK | ≥1 critical flag (upfront_fee) |
| P2 | scam-03 | HIGH_RISK | trafficking corridor = always critical |
| P3 | scam-15 (impersonation) | HIGH_RISK | page_hijack + informal payment, EVEN IF registry says VERIFIED → combined = HIGH_RISK (worst-of) |
| P4 | legit-01 | VERIFIED (no post flags — there is no separate "pass" token) | combined verdict falls through to registry verdict |
| P5 | legit-04 | VERIFIED | "URGENT" alone must NOT flag |
| P6 | legit-05 | NOT_A_JOB_POST | render info message, no verdict banner |
| P7 | extraction schema parse fails twice | UNANALYZABLE | "couldn't analyze — check manually" + manual search links; never guess |

## Flag severity table (encode as data, not code)

Every `RedFlag` enum member has exactly one tier (decided 2026-07-25; enum ↔ table coverage
is itself a unit test).

- **Critical (any one ⇒ HIGH_RISK):** upfront_fee, excessive_placement_fee, tourist_visa_deployment, trafficking_corridor_destination, trafficking_risk_profile, atm_card_collateral, fake_certificate_offer, entertainer_visa_bypass, page_hijack_pattern, no_passport_needed_claim, invalid_license_format (when a license is claimed), pay_before_info, secondhand_license_claim, business_permit_as_license_claim, irregular_travel_route, avoid_official_contact_instruction, fee_for_hsw_or_seafarer *(Derived Flag — engine-computed from fees[] + position keyword table)*, private_agency_korea_e9 *(Derived Flag — engine-computed from destination + position/visa keywords + agency presence)*
- **Warning (≥2 ⇒ HIGH_RISK, 1 ⇒ CAUTION):** telegram_only_contact, whatsapp_only_contact, informal_payment_channel, urgency_pressure, no_agency_identified, individual_recruiter_not_agency, chat_only_interview, no_physical_office, meetup_offsite, private_residence_meeting, salary_anomaly, salary_deduction_scheme, too_good_package, vague_online_role, suspicious_license_number, no_credentials_needed_claim, loan_tieup, cash_salary, guaranteed_approval_claim, insider_connection_claim, visa_assistance_disguise
- **Info (surface but don't score):** direct_hire_claim (legit direct hire exists via DMW Direct Hire route — link to it), social_proof_flood, testimonial_bait

## Copy rules (test the strings too)

- Every verdict string names its evidence: "🚨 Humihingi ng ₱15,000 'processing fee' — bawal ang bayad bago ang pirmadong job order."
- A valid-format license claim is never presented as reassurance: "License number format matches the DMW pattern — this checks the format only, hindi ito kumpirmasyon na totoo ang lisensya. Verify on the official DMW site."
- Every result ends with: data freshness line + official DMW verify link + DMW hotline. Snapshot-test this footer.
- HIGH_RISK results additionally show "Paano mag-report" (DMW/IACAT hotlines).
