/**
 * Taglish copy tables — data, not code (same spirit as verdict.ts's FLAG_SEVERITY).
 * Every Critical/Warning template names its evidence (verdict-cases.md's "Copy rules");
 * Info templates stay neutral since they never move the verdict.
 */
import type { RedFlag } from "./extraction";
import type { DerivedFlag, Verdict } from "./verdict";

export type FlagCopyTemplate = (evidence: string) => string;

export const FLAG_COPY: Record<RedFlag | DerivedFlag, FlagCopyTemplate> = {
  upfront_fee: (evidence) =>
    `Humihingi ng bayad bago pa man ma-deploy: "${evidence}" — bawal ang bayad bago ang pirmadong job order.`,
  excessive_placement_fee: (evidence) =>
    `Lampas na sa isang buwang sahod ang hinihinging placement fee: "${evidence}" — bawal ito ayon sa patakaran ng DMW/POEA.`,
  salary_deduction_scheme: (evidence) =>
    `May balak i-deduct sa unang sahod mo ang placement fee: "${evidence}" — dapat buo ang unang sahod, walang ganitong deduction.`,
  salary_anomaly: (evidence) =>
    `Kakaiba o hindi makatotohanan ang sahod na inaalok: "${evidence}" — i-verify muna bago maniwala.`,
  too_good_package: (evidence) =>
    `Sobrang ganda ng alok, halos hindi kapani-paniwala: "${evidence}" — karaniwang senyales ito ng scam.`,
  tourist_visa_deployment: (evidence) =>
    `"Tourist visa muna, i-convert na lang later": "${evidence}" — ilegal na deployment ito.`,
  trafficking_corridor_destination: (evidence) =>
    `Patutunguhan ay kilalang trafficking corridor: "${evidence}" — maraming OFW na ang na-scam papunta dito.`,
  vague_online_role: (evidence) =>
    `Malabo ang trabahong online na inaalok: "${evidence}" — karaniwang pantakip ito ng mga scam farm.`,
  telegram_only_contact: (evidence) =>
    `Telegram lang ang paraan ng pakikipag-ugnayan: "${evidence}" — walang opisina o landline na masusubaybayan.`,
  whatsapp_only_contact: (evidence) =>
    `WhatsApp lang ang paraan ng pakikipag-ugnayan: "${evidence}" — walang ibang paraan para i-verify ang recruiter.`,
  informal_payment_channel: (evidence) =>
    `Hihingan ka ng bayad sa GCash o remittance imbes na opisyal na resibo: "${evidence}" — walang record ang ganitong bayad.`,
  urgency_pressure: (evidence) =>
    `May pressure na magmadali kasabay ng bayad o reservation: "${evidence}" — ginagamit ito para hindi ka makapag-isip nang maayos.`,
  no_agency_identified: (evidence) =>
    `Walang pinangalanang ahensya sa post: "${evidence}" — walang malinaw na makakausap kung sakaling magkaproblema.`,
  individual_recruiter_not_agency: (evidence) =>
    `Isang indibidwal, hindi lisensyadong ahensya, ang nagre-recruit: "${evidence}" — bawal mag-recruit nang hiwalay sa isang lisensyadong ahensya.`,
  direct_hire_claim: (evidence) =>
    `Direct hire umano ang alok: "${evidence}" — may legal na Direct Hire route sa DMW; i-verify pa rin dito bago sumali.`,
  invalid_license_format: (evidence) =>
    `Hindi tugma sa opisyal na format ng DMW/POEA license ang binanggit na numero: "${evidence}" — malamang gawa-gawa lang ito.`,
  suspicious_license_number: (evidence) =>
    `Kahina-hinala ang binanggit na license number: "${evidence}" — i-verify muna sa opisyal na DMW website.`,
  secondhand_license_claim: (evidence) =>
    `Sabi-sabi lang na lisensyado raw sila, hindi mula sa sarili nilang patunay: "${evidence}" — i-verify mismo sa DMW website.`,
  no_physical_office: (evidence) =>
    `Walang binanggit na opisyal na opisina: "${evidence}" — ang mga legit na ahensya ay may opisinang puwedeng bisitahin.`,
  meetup_offsite: (evidence) =>
    `Nagpapatawag ng meet-up sa labas ng opisina (hal. coffee shop): "${evidence}" — hindi ito karaniwang gawain ng lisensyadong ahensya.`,
  private_residence_meeting: (evidence) =>
    `Nagpapatawag ng interbyu o audition sa isang pribadong bahay: "${evidence}" — mapanganib ito, lalo na sa mga bagong aplikante.`,
  chat_only_interview: (evidence) =>
    `Chat o video call lang ang buong proseso ng interbyu: "${evidence}" — walang face-to-face na proseso na karaniwan sa lisensyadong ahensya.`,
  no_passport_needed_claim: (evidence) =>
    `Sabi nila kahit walang passport ay puwede: "${evidence}" — imposible ito para sa legal na deployment.`,
  no_credentials_needed_claim: (evidence) =>
    `Sabi nila kahit walang kredensyal o karanasan ay tatanggapin ka: "${evidence}" — hindi ito karaniwang pamantayan ng legit na trabaho.`,
  insider_connection_claim: (evidence) =>
    `May sinasabing "kakilala" o insider connection para mapabilis ang proseso: "${evidence}" — karaniwang panloloko ito.`,
  pay_before_info: (evidence) =>
    `Hihingan ka ng bayad bago pa man makita ang buong detalye ng trabaho: "${evidence}" — huwag magbayad bago makita ang job order.`,
  atm_card_collateral: (evidence) =>
    `Hihingin ang ATM card mo bilang collateral: "${evidence}" — bawal ito, at delikado dahil ma-access nila ang pera mo.`,
  loan_tieup: (evidence) =>
    `May kasunod na lending company para sa placement fee: "${evidence}" — karaniwang paraan ito para pautangin ka nang labis.`,
  fake_certificate_offer: (evidence) =>
    `Nag-aalok sila ng certificate (hal. TESDA) kahit hindi ka pumasok sa training: "${evidence}" — peke ang ibinibigay nilang katibayan.`,
  visa_assistance_disguise: (evidence) =>
    `Nagpapanggap na "visa assistance lang" imbes na recruitment agency: "${evidence}" — paraan ito para makaiwas sa regulasyon ng DMW.`,
  guaranteed_approval_claim: (evidence) =>
    `Ginagarantiyang 100% ang approval ng visa o trabaho: "${evidence}" — walang sinuman ang makakapangako nito nang tiyak.`,
  testimonial_bait: (evidence) =>
    `May kasamang testimonial ang post: "${evidence}" — impormasyon lang ito, hindi ito ang basehan sa pagtitiwala; i-verify pa rin sa DMW.`,
  social_proof_flood: (evidence) =>
    `Marami silang ipinapakitang larawan o testimonial ng "successful deployments": "${evidence}" — impormasyon lang ito, hindi patunay ng lehitimong ahensya.`,
  business_permit_as_license_claim: (evidence) =>
    `Business permit ang ipinapakita nila bilang "lisensya": "${evidence}" — hindi ito kapalit ng tunay na DMW license.`,
  entertainer_visa_bypass: (evidence) =>
    `May inaalok na "ibang route" para makaiwas sa entertainer visa requirements: "${evidence}" — mapanganib ito at posibleng ilegal.`,
  irregular_travel_route: (evidence) =>
    `May binabanggit na hindi karaniwang travel route: "${evidence}" — karaniwang paraan ito ng mga trafficker para maiwasan ang detection.`,
  cash_salary: (evidence) =>
    `Cash lang ang sahod na inaalok, walang bank record: "${evidence}" — walang paper trail kung sakaling magkaproblema.`,
  trafficking_risk_profile: (evidence) =>
    `Ang profile ng alok ay tugma sa kilalang pattern ng human trafficking: "${evidence}" — mag-ingat.`,
  page_hijack_pattern: (evidence) =>
    `Sinasabing "bagong page" dahil na-hack umano ang luma: "${evidence}" — karaniwang paraan ito para gamitin ang pangalan ng tunay na ahensya.`,
  avoid_official_contact_instruction: (evidence) =>
    `Iniiwasan kang tumawag sa opisyal na numero o landline: "${evidence}" — sinasadya nilang hindi ka makausap ng tunay na ahensya.`,

  // Derived Flags (verdict.ts computes these; evidence is the extracted facts that triggered them).
  fee_for_hsw_or_seafarer: (evidence) =>
    `${evidence} — bawal ang anumang bayad para sa domestic worker (HSW) o seafarer; dapat walang bayad na kolektahin.`,
  private_agency_korea_e9: (evidence) =>
    `${evidence} — ang Korea E-9 factory work ay sa pamahalaan-sa-pamahalaan (EPS) lang dumadaan, hindi sa pribadong ahensya.`,
};

export const VERDICT_BANNER: Record<Verdict, string> = {
  VERIFIED:
    "Walang kritikal na senyales ng iligal na recruitment na nakita sa post na ito. Mag-ingat pa rin at i-verify sa opisyal na DMW website bago sumali.",
  CAUTION:
    "May mga bagay dito na dapat mong i-verify muna bago sumali. Huwag magbayad o magbigay ng personal na detalye hanggang hindi ka sigurado.",
  HIGH_RISK:
    "Maraming senyales ng iligal na recruitment o scam ang nakita sa post na ito. Huwag munang magbayad o magbigay ng detalye — i-report ito.",
};

export const NOT_A_JOB_POST_COPY =
  "Ang na-paste mong text ay hindi mukhang job post. Walang verdict na ipinapakita dahil walang trabahong ma-anaylize dito.";

export const UNANALYZABLE_COPY =
  "Hindi namin na-analyze ang post na ito. Huwag ipagpalagay na ligtas o peke ito — mangyaring i-check nang mano-mano sa opisyal na DMW website o tumawag sa DMW Hotline 1348.";

// Quota Exhausted (CONTEXT.md): the shared daily scan budget is spent for everyone —
// honest "come back tomorrow" copy, never implying the post itself couldn't be analyzed.
// The Agency check is unaffected (no LLM involved), so it's mentioned as still available.
export const QUOTA_EXHAUSTED_COPY =
  "Naabot na ang araw-araw na libreng scan limit namin — subukan ulit bukas. Puwede ka pa ring mag-check ng ahensya sa DMW registry.";

// Rate Limited (CONTEXT.md): this one IP has been throttled, distinct from Quota
// Exhausted — a short wait, not a "come back tomorrow."
export const RATE_LIMITED_COPY =
  "Sobra-sobra ang mga scan request mula sa iyo sa maikling panahon — sandaling maghintay at subukan ulit.";

// A valid-format claimed license is never presented as reassurance (verdict-cases.md's
// Copy rules, quoted verbatim) — a valid format is trivially forgeable and never counts
// toward VERIFIED, so its copy stays deflationary.
export const LICENSE_FORMAT_NEUTRAL_COPY =
  "License number format matches the DMW pattern — this checks the format only, hindi ito kumpirmasyon na totoo ang lisensya. Verify on the official DMW site.";
