/**
 * Deterministic Post Verdict engine. The Extractor (LLM) only observes facts and
 * Red Flags — this module is the only thing that ever issues a verdict.
 */
import type { Extraction, RedFlag } from "./extraction";
import { licenseFormatIsValid } from "./extraction";

export type Verdict = "VERIFIED" | "CAUTION" | "HIGH_RISK";
export type FlagTier = "CRITICAL" | "WARNING" | "INFO";
export const DERIVED_FLAGS = ["fee_for_hsw_or_seafarer", "private_agency_korea_e9"] as const;
export type DerivedFlag = (typeof DERIVED_FLAGS)[number];
export type ScoredFlag = { flag: RedFlag | DerivedFlag; tier: FlagTier; evidence: string };

export type PostVerdictResult =
  | { kind: "not_a_job_post" }
  // Produced by the future extractor-retry wrapper (#8) after a second failed Zod
  // parse — never by scorePost, which only ever runs on an already-valid Extraction.
  | { kind: "unanalyzable" }
  | { kind: "scored"; verdict: Verdict; flags: ScoredFlag[]; reasons: string[] };

// Flag Severity Tier table (data, not code) — starter/verdict-cases.md.
export const FLAG_SEVERITY: Record<RedFlag | DerivedFlag, FlagTier> = {
  // Critical: any one => HIGH_RISK
  upfront_fee: "CRITICAL",
  excessive_placement_fee: "CRITICAL",
  tourist_visa_deployment: "CRITICAL",
  trafficking_corridor_destination: "CRITICAL",
  trafficking_risk_profile: "CRITICAL",
  atm_card_collateral: "CRITICAL",
  fake_certificate_offer: "CRITICAL",
  entertainer_visa_bypass: "CRITICAL",
  page_hijack_pattern: "CRITICAL",
  no_passport_needed_claim: "CRITICAL",
  invalid_license_format: "CRITICAL",
  pay_before_info: "CRITICAL",
  secondhand_license_claim: "CRITICAL",
  business_permit_as_license_claim: "CRITICAL",
  irregular_travel_route: "CRITICAL",
  avoid_official_contact_instruction: "CRITICAL",
  fee_for_hsw_or_seafarer: "CRITICAL",
  private_agency_korea_e9: "CRITICAL",

  // Warning: >=2 => HIGH_RISK, 1 => CAUTION
  telegram_only_contact: "WARNING",
  whatsapp_only_contact: "WARNING",
  informal_payment_channel: "WARNING",
  urgency_pressure: "WARNING",
  no_agency_identified: "WARNING",
  individual_recruiter_not_agency: "WARNING",
  chat_only_interview: "WARNING",
  no_physical_office: "WARNING",
  meetup_offsite: "WARNING",
  private_residence_meeting: "WARNING",
  salary_anomaly: "WARNING",
  salary_deduction_scheme: "WARNING",
  too_good_package: "WARNING",
  vague_online_role: "WARNING",
  suspicious_license_number: "WARNING",
  no_credentials_needed_claim: "WARNING",
  loan_tieup: "WARNING",
  cash_salary: "WARNING",
  guaranteed_approval_claim: "WARNING",
  insider_connection_claim: "WARNING",
  visa_assistance_disguise: "WARNING",

  // Info: surface but don't score
  direct_hire_claim: "INFO",
  social_proof_flood: "INFO",
  testimonial_bait: "INFO",
};

const SEVERITY_ORDER: Verdict[] = ["VERIFIED", "CAUTION", "HIGH_RISK"];

export function combineVerdict(registryVerdict: Verdict, postVerdict: Verdict): Verdict {
  return SEVERITY_ORDER.indexOf(postVerdict) > SEVERITY_ORDER.indexOf(registryVerdict)
    ? postVerdict
    : registryVerdict;
}

// ---------- Derived Flags (engine-computed from facts, never LLM-observed) ----------

const HSW_SEAFARER_POSITION_KEYWORDS = [
  "domestic worker",
  "household service worker",
  "hsw",
  "kasambahay",
  "maid",
  "household helper",
  "caregiver",
  "seafarer",
  "seaman",
  "seawoman",
  "cruise ship",
  "ship crew",
  "vessel crew",
];

const KOREA_KEYWORDS = ["korea", "south korea"];
const KOREA_FACTORY_KEYWORDS = ["factory", "manufacturing", "e-9", "e9", "eps", "industrial"];

function matchesKeyword(value: string | null, keywords: string[]): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function computeDerivedFlags(extraction: Extraction): ScoredFlag[] {
  const derived: ScoredFlag[] = [];

  const [fee] = extraction.fees;
  if (fee && matchesKeyword(extraction.position, HSW_SEAFARER_POSITION_KEYWORDS)) {
    derived.push({
      flag: "fee_for_hsw_or_seafarer",
      tier: FLAG_SEVERITY.fee_for_hsw_or_seafarer,
      evidence: `${extraction.position} + fee "${fee.label}: ${fee.amount_raw}" — HSW/seafarer positions must be charged nothing`,
    });
  }

  const agencyPresent = extraction.agency_name !== null || extraction.recruiter_is_individual;
  if (
    agencyPresent &&
    matchesKeyword(extraction.destination_country, KOREA_KEYWORDS) &&
    (matchesKeyword(extraction.position, KOREA_FACTORY_KEYWORDS) ||
      matchesKeyword(extraction.visa_type_mentioned, KOREA_FACTORY_KEYWORDS))
  ) {
    derived.push({
      flag: "private_agency_korea_e9",
      tier: FLAG_SEVERITY.private_agency_korea_e9,
      evidence: `agency/recruiter present + destination "${extraction.destination_country}" + position "${extraction.position}" — Korea E-9 factory work is government-to-government (EPS) only`,
    });
  }

  return derived;
}

// ---------- License-format flag (deterministic, overrides any LLM-emitted flag) ----------

function computeLicenseFlags(extraction: Extraction): ScoredFlag[] {
  // invalid_license_format is engine-owned, never trusted from the LLM's own
  // observation — see the filter in scorePost below.
  if (!extraction.license_no_claimed || licenseFormatIsValid(extraction.license_no_claimed)) {
    // No claimed license, or a valid format: neutral Info, never counts toward
    // VERIFIED (trivially forgeable) — "no flag, no boost".
    return [];
  }

  return [
    {
      flag: "invalid_license_format",
      tier: FLAG_SEVERITY.invalid_license_format,
      evidence: extraction.license_no_claimed,
    },
  ];
}

// ---------- Post Verdict scoring ----------

export function scorePost(extraction: Extraction): PostVerdictResult {
  if (!extraction.is_job_post) {
    return { kind: "not_a_job_post" };
  }

  const observedFlags: ScoredFlag[] = extraction.red_flags
    .filter((redFlag) => redFlag.flag !== "invalid_license_format")
    .map((redFlag) => ({
      flag: redFlag.flag,
      tier: FLAG_SEVERITY[redFlag.flag],
      evidence: redFlag.evidence_quote,
    }));

  const flags = [...observedFlags, ...computeLicenseFlags(extraction), ...computeDerivedFlags(extraction)];

  const criticalCount = flags.filter((f) => f.tier === "CRITICAL").length;
  const warningCount = flags.filter((f) => f.tier === "WARNING").length;

  let verdict: Verdict = "VERIFIED";
  if (criticalCount >= 1 || warningCount >= 2) {
    verdict = "HIGH_RISK";
  } else if (warningCount === 1) {
    verdict = "CAUTION";
  }

  const reasons = flags
    .filter((f) => f.tier === "CRITICAL" || f.tier === "WARNING")
    .map((f) => `${f.flag}: ${f.evidence}`);

  return { kind: "scored", verdict, flags, reasons };
}
