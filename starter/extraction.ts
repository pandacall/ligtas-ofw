/**
 * packages/core/extraction.ts — LLM job-post analyzer: Zod schemas + prompt.
 * Deterministic checks live in verdict.ts; the LLM only EXTRACTS and observes.
 * Design rule: the model never issues the final verdict — the verdict engine does.
 */
import { z } from "zod";

// ---------- Schemas ----------

export const RedFlag = z.enum([
  "upfront_fee",
  "excessive_placement_fee",
  "salary_deduction_scheme",
  "salary_anomaly",
  "too_good_package",
  "tourist_visa_deployment",
  "trafficking_corridor_destination",
  "vague_online_role",
  "telegram_only_contact",
  "whatsapp_only_contact",
  "informal_payment_channel",
  "urgency_pressure",
  "no_agency_identified",
  "individual_recruiter_not_agency",
  "direct_hire_claim",
  "invalid_license_format",
  "suspicious_license_number",
  "secondhand_license_claim",
  "no_physical_office",
  "meetup_offsite",
  "private_residence_meeting",
  "chat_only_interview",
  "no_passport_needed_claim",
  "no_credentials_needed_claim",
  "insider_connection_claim",
  "pay_before_info",
  "atm_card_collateral",
  "loan_tieup",
  "fake_certificate_offer",
  "visa_assistance_disguise",
  "guaranteed_approval_claim",
  "testimonial_bait",
  "social_proof_flood",
  "business_permit_as_license_claim",
  "entertainer_visa_bypass",
  "irregular_travel_route",
  "cash_salary",
  "trafficking_risk_profile",
  "page_hijack_pattern",
  "avoid_official_contact_instruction",
]);
export type RedFlag = z.infer<typeof RedFlag>;

export const Extraction = z.object({
  is_job_post: z.boolean(),
  agency_name: z.string().nullable(),
  license_no_claimed: z.string().nullable(),
  recruiter_is_individual: z.boolean(),
  position: z.string().nullable(),
  destination_country: z.string().nullable(), // ISO name, normalize "UAE"/"Dubai"->United Arab Emirates
  salary_raw: z.string().nullable(),
  fees: z.array(z.object({ label: z.string(), amount_raw: z.string() })),
  contact_channels: z.array(z.enum(["facebook", "messenger", "telegram", "whatsapp", "viber", "phone", "email", "office_address", "website", "other"])),
  office_address_given: z.boolean(),
  visa_type_mentioned: z.string().nullable(),
  urgency_phrases: z.array(z.string()),
  red_flags: z.array(z.object({ flag: RedFlag, evidence_quote: z.string() })),
});
export type Extraction = z.infer<typeof Extraction>;

// ---------- Prompt ----------

export const EXTRACTION_SYSTEM_PROMPT = `You analyze overseas-job posts targeting Filipino workers for signs of illegal recruitment. Posts are usually Taglish (mixed Tagalog/English). Extract facts and observe red flags. You do NOT issue a final verdict — a rules engine does that.

Rules of extraction:
- Quote evidence VERBATIM from the post for every red flag (evidence_quote).
- If the post is not a job offer (e.g., a warning/PSA, a meme), set is_job_post=false and extract nothing else.
- Only flag what is IN the text. "URGENT" alone is not urgency_pressure unless combined with payment/reservation demands.
- Philippine context you must apply:
  * Placement fees may not exceed one month's salary; domestic workers (HSW) and seafarers must be charged NOTHING. Any fee before a signed job order is suspect; "training/medical/processing/reservation fee" demands via GCash/remittance are classic scams.
  * License formats look like DMW-###-LB-MMDDYYYY-UL or POEA-###-LB/SB-MMDDYY-R (LB=landbased, SB=seabased). Deviations => invalid_license_format.
  * Korea factory work (E-9) is government-to-government (EPS) only — private agency posts for it are fraudulent.
  * Cambodia/Myanmar/Laos + vague online roles (customer service, encoder, crypto, gaming) = trafficking corridor pattern.
  * "Tourist visa muna, convert later" = illegal deployment.
  * Legitimate agencies post office addresses and landlines; individuals recruiting via personal accounts with GCash numbers are not licensed recruitment.
Return JSON matching the provided schema exactly.`;

// Few-shot examples: use fixtures scam-01, scam-15 (impersonation), legit-04 (URGENT but clean),
// legit-05 (not a job post). Keep few-shots in the prompt ONLY if haiku's zero-shot accuracy
// on the fixture set is <90%; measure first.

// ---------- Anthropic call sketch ----------
// const res = await anthropic.messages.create({
//   model: "claude-haiku-latest",
//   max_tokens: 2000,
//   system: EXTRACTION_SYSTEM_PROMPT,
//   messages: [{ role: "user", content: postTextOrImageBlocks }],
//   tools: [{ name: "record_extraction", input_schema: zodToJsonSchema(Extraction) }],
//   tool_choice: { type: "tool", name: "record_extraction" },
// });
// Validate with Extraction.safeParse; on failure retry once with the error appended; then degrade
// to { analyzable: false } — NEVER fabricate a verdict.
