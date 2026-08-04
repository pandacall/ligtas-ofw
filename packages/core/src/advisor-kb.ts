/**
 * The Advisor KB — the grounded corpus behind Bantatay's advice turns (ADR-0005).
 *
 * Data, not code, in the same spirit as verdict.ts's FLAG_SEVERITY and copy.ts's FLAG_COPY.
 * The Router LLM only ever *selects* entry ids from this table; the Surface then renders the
 * hand-written `answer` VERBATIM alongside its `source`. The model never authors factual
 * content, which is what makes a free-tier advisor safe: it cannot invent a hotline number or
 * a fee rule because it never writes one (see chat-route.ts's no-digits guard on `reply`).
 *
 * Every entry needs a `source` — an entry without somewhere a user can go and check it is a
 * claim we are asking them to take on faith, which is the exact thing this product exists to
 * argue against. advisor-kb.test.ts enforces this mechanically.
 *
 * The domain rules encoded here are the same ones the verdict engine scores against
 * (CLAUDE.md's "Domain rules the verdict engine must encode") — this table is their
 * user-facing, explain-it-to-me counterpart, not a second source of truth for scoring.
 */

export type KbEntry = {
  /** Stable id — the Router cites these, so renaming one is a breaking change. */
  id: string;
  /** Short human label, used as the card heading. */
  topic: string;
  /**
   * Lowercase substrings that route a turn here with ZERO LLM calls (the fast path in
   * router.ts). Include Tagalog, English, and common Taglish spellings — a miss here just
   * costs one routing call, so err toward more.
   */
  keywords: string[];
  /** Taglish, hand-written, rendered verbatim. Never generated, never paraphrased. */
  answer: string;
  /** Where the user can verify this themselves. Required. */
  source: string;
};

const DMW = "https://dmw.gov.ph";
const DMW_ILLEGAL_RECRUITMENT = "https://dmw.gov.ph/programs/anti-illegal-recruitment";
const EPS_KOREA = "https://www.eps.go.kr";
const IACAT = "https://iacat.gov.ph";

export const ADVISOR_KB: readonly KbEntry[] = [
  {
    id: "placement-fee-cap",
    topic: "Magkano ang legal na placement fee",
    keywords: ["placement fee", "magkano ang bayad", "legal na bayad", "fee cap", "processing fee", "how much fee"],
    answer:
      "Hindi puwedeng lumampas sa katumbas ng isang buwang sahod ang placement fee na sisingilin sa iyo. " +
      "Kung mas mataas pa sa isang buwang sahod ang hinihingi nila, paglabag na iyon sa patakaran ng DMW. " +
      "Dapat ding may opisyal na resibo sa bawat babayaran mo — kung ayaw nilang magbigay ng resibo, iyon mismo ang senyales.",
    source: DMW,
  },
  {
    id: "hsw-seafarer-no-fee",
    topic: "Walang bayad para sa HSW at seafarer",
    keywords: ["hsw", "household service worker", "domestic helper", "kasambahay", "seafarer", "seaman", "marino"],
    answer:
      "Kung household service worker (HSW/domestic worker) o seafarer ang aplikasyon mo, WALANG placement fee na dapat singilin sa iyo — zero. " +
      "Hindi ito negosasyon at hindi ito 'discounted rate': anumang halagang hinihingi sa iyo para sa ganitong trabaho ay paglabag. " +
      "Kasama rito ang tinatawag nilang 'processing', 'medical', o 'training' fee kung ito ay kondisyon para matuloy ang aplikasyon mo.",
    source: DMW,
  },
  {
    id: "no-fee-before-job-order",
    topic: "Bayad bago ang pirmadong job order",
    keywords: ["bayad muna", "advance payment", "reservation fee", "downpayment", "bago ang job order", "pay first"],
    answer:
      "Huwag magbayad bago ka magkaroon ng pirmadong job order at bago mo makita ang buong detalye ng trabaho. " +
      "Ang paghingi ng bayad nang maaga — lalo na sa GCash, remittance, o Western Union — ay isa sa pinakakaraniwang pattern ng illegal recruitment. " +
      "Walang record ang ganitong bayad, kaya halos imposible nang mabawi kapag nawala na sila.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },
  {
    id: "salary-deduction-scheme",
    topic: "Kaltas sa unang sahod",
    keywords: ["salary deduction", "kaltas sa sahod", "bawas sa sweldo", "deduct sa unang sahod", "hulugan ang fee"],
    answer:
      "Kapag sinabi nilang 'libre muna, kakaltasin na lang sa unang sahod mo', hindi iyon libre — utang iyon na naka-disguise. " +
      "Dapat buo ang matatanggap mong unang sahod. Ang ganitong scheme ay madalas na paraan para lumobo ang babayaran mo nang wala kang malinaw na kasulatan.",
    source: DMW,
  },
  {
    id: "atm-collateral",
    topic: "ATM card bilang collateral",
    keywords: ["atm card", "collateral", "sanla", "hawakan ang atm", "prenda"],
    answer:
      "Bawal at napakadelikado ang paghingi ng ATM card mo bilang collateral. " +
      "Ibig sabihin nito, ma-access nila ang buong sahod mo nang wala kang kontrol — at maraming OFW na ang naiwang walang natitira. " +
      "Walang lehitimong ahensya ang hihingi nito.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },
  {
    id: "loan-tieup",
    topic: "Lending company para sa placement fee",
    keywords: ["lending", "loan", "utang para sa fee", "pautang", "financing"],
    answer:
      "Kung may kasunod silang lending company para pautangin ka ng placement fee, mag-ingat. " +
      "Karaniwang paraan ito para lumaki nang husto ang utang mo bago ka pa makaalis ng bansa, at madalas ang interes ay lampas sa kaya mong bayaran mula sa inaasahang sahod.",
    source: DMW,
  },

  {
    id: "korea-e9-eps-only",
    topic: "Korea E-9 factory work",
    keywords: ["korea", "e-9", "e9", "eps", "korea factory", "south korea"],
    answer:
      "Ang Korea E-9 factory work ay dumadaan LAMANG sa Employment Permit System (EPS) — isang government-to-government na programa sa pagitan ng Pilipinas at South Korea. " +
      "Walang pribadong ahensya ang puwedeng mag-recruit para dito. Kung may pribadong ahensya o indibidwal na nag-aalok ng Korea E-9 factory job, mapanlinlang iyon — walang eksepsiyon.",
    source: EPS_KOREA,
  },
  {
    id: "tourist-visa-deployment",
    topic: "Tourist visa muna, convert later",
    keywords: ["tourist visa", "convert later", "visit visa", "tourist muna", "convert sa abroad"],
    answer:
      "Ilegal ang deployment gamit ang tourist visa, kahit sabihin pa nilang 'i-convert na lang later'. " +
      "Kapag pumunta ka bilang turista tapos nagtrabaho, undocumented ka sa bansang iyon: walang kontrata, walang proteksyon, at walang matatakbuhang embahada kung may mangyari sa iyo. " +
      "Ito rin ang paraan na madalas gamitin sa trafficking.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },
  {
    id: "trafficking-corridor",
    topic: "Cambodia, Myanmar, Laos na alok",
    keywords: ["cambodia", "myanmar", "laos", "scam farm", "crypto job", "customer service abroad", "encoder abroad"],
    answer:
      "Ang mga alok na papuntang Cambodia, Myanmar, o Laos para sa malabong online na trabaho — customer service, encoder, crypto, gaming — ay tumutugma sa kilalang pattern ng human trafficking. " +
      "Maraming Pilipino ang nakulong sa mga scam compound sa ganitong paraan: kinukuha ang pasaporte, pinagtatrabaho nang sapilitan, at pinagbabayad ng 'ransom' bago payagang umuwi. " +
      "Kung ganito ang alok sa iyo, huwag tumuloy at i-report agad.",
    source: IACAT,
  },
  {
    id: "direct-hire",
    topic: "Direct hire",
    keywords: ["direct hire", "walang agency", "direktang hire", "no agency"],
    answer:
      "May legal na Direct Hire route sa DMW, pero may proseso itong dapat sundin at kailangan pa rin ng clearance mula sa DMW. " +
      "Hindi ibig sabihin ng 'direct hire' ay puwede nang laktawan ang dokumentasyon. Kung ginagamit nila ito para iwasan ang papeles, iyon ang problema — hindi ang direct hire mismo.",
    source: DMW,
  },
  {
    id: "individual-recruiter",
    topic: "Indibidwal na nagre-recruit",
    keywords: ["indibidwal", "walang agency", "sariling recruiter", "individual recruiter", "kakilala lang"],
    answer:
      "Bawal mag-recruit ang isang indibidwal nang hiwalay sa isang lisensyadong ahensya. " +
      "Kahit kakilala mo pa siya o kamag-anak ng kakilala, kung wala siyang koneksyon sa isang lisensyadong ahensya, illegal recruitment na iyon. " +
      "Ang pinakakaraniwang linya ay 'may kakilala ako sa loob' — iyan ay senyales, hindi kalamangan.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },

  {
    id: "license-format",
    topic: "Format ng DMW/POEA license",
    keywords: ["license number", "lisensya", "license format", "poea license", "dmw license"],
    answer:
      "Ang opisyal na format ng lisensya ay DMW-###-LB-MMDDYYYY-UL o POEA-###-LB/SB-MMDDYY-R, kung saan ang LB ay landbased at ang SB ay seabased. " +
      "Pero tandaan: madaling gumawa ng numerong mukhang tama. Ang tamang format ay HINDI patunay na totoo ang lisensya — ang pangalan ng ahensya ang dapat mong hanapin sa opisyal na listahan ng DMW.",
    source: DMW,
  },
  {
    id: "verify-agency",
    topic: "Paano i-verify ang ahensya",
    keywords: ["paano i-verify", "how to verify", "lisensyado ba", "legit ba ang agency", "check agency"],
    answer:
      "I-verify ang ahensya sa pangalan nito, hindi sa license number na binanggit nila. Puwede mong itanong sa akin ang pangalan ng ahensya at hahanapin ko ito sa kopya namin ng listahan ng DMW. " +
      "Pero laging tapusin ang pag-verify sa opisyal na website ng DMW o sa DMW Hotline 1348 bago ka magbayad ng kahit ano.",
    source: DMW,
  },
  {
    id: "business-permit-not-license",
    topic: "Business permit bilang 'lisensya'",
    keywords: ["business permit", "dti", "sec registration", "mayor's permit", "rehistrado sa dti"],
    answer:
      "Ang business permit, DTI, o SEC registration ay HINDI kapalit ng DMW license. " +
      "Nangangahulugan lang ito na rehistrado sila bilang negosyo — walang kinalaman iyon sa karapatan nilang magpadala ng manggagawa sa ibang bansa. " +
      "Isang DMW license lang ang binibilang.",
    source: DMW,
  },
  {
    id: "no-physical-office",
    topic: "Walang opisina, chat lang ang proseso",
    keywords: ["walang opisina", "no office", "chat lang", "telegram", "whatsapp", "online lang", "meet up sa coffee shop"],
    answer:
      "Ang mga lisensyadong ahensya ay may opisinang puwede mong bisitahin, at nakalista ang address nila sa DMW. " +
      "Kung Telegram o WhatsApp lang ang paraan ng pakikipag-usap, kung ayaw nilang magpakita ng opisina, o kung sa coffee shop o pribadong bahay ang gustong pagkitaan — huwag tumuloy nang mag-isa at huwag magdala ng pera o dokumento.",
    source: DMW,
  },

  {
    id: "na-scam-ano-gagawin",
    topic: "Na-scam na ako — ano ang gagawin",
    keywords: ["na-scam", "nascam", "niloko ako", "nabiktima", "ano gagawin", "i was scammed", "tinakbuhan ako"],
    answer:
      "Una, hindi ito kasalanan mo — sadyang mahusay silang manlinlang. Narito ang mga hakbang:\n\n" +
      "1. Huwag burahin ang kahit ano. I-screenshot ang lahat ng chat, resibo, receipt ng padala, at profile nila.\n" +
      "2. Tumawag sa DMW Hotline 1348, o sa DMW Anti-Illegal Recruitment Branch sa (02) 8722-1144 / 8722-1155.\n" +
      "3. Kung may posibleng human trafficking, tawagan ang IACAT 1343 Actionline.\n" +
      "4. Mag-file ng reklamo sa DMW. Dalhin ang lahat ng ebidensyang na-save mo at anumang valid ID.\n\n" +
      "Mag-report kahit maliit ang halagang nawala sa iyo — ang mga reklamo ang nagpapasara sa kanila bago pa sila makabiktima ng iba.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },
  {
    id: "file-complaint",
    topic: "Paano mag-file ng reklamo sa DMW",
    keywords: ["mag-file ng reklamo", "file complaint", "magsumbong", "ireport", "i-report", "reklamo"],
    answer:
      "Puwede kang mag-file ng reklamo sa DMW Anti-Illegal Recruitment Branch. Ihanda ang mga ito:\n\n" +
      "• Sulat ng reklamo na may pangalan mo at kung paano ka nila kinausap\n" +
      "• Lahat ng screenshot ng chat, post, at anunsyo\n" +
      "• Mga resibo o proof of payment (GCash, remittance, bank transfer)\n" +
      "• Kopya ng valid ID mo\n\n" +
      "Puwede itong ihain sa DMW regional office na pinakamalapit sa iyo, o simulan sa pagtawag sa DMW Hotline 1348 para sa gabay.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },
  {
    id: "hotlines",
    topic: "Mga hotline na matatawagan",
    keywords: ["hotline", "numero", "contact number", "saan tatawag", "who to call", "emergency number"],
    answer:
      "Mga opisyal na hotline:\n\n" +
      "• DMW Hotline — 1348\n" +
      "• DMW Anti-Illegal Recruitment Branch — (02) 8722-1144 / 8722-1155\n" +
      "• IACAT Actionline (human trafficking) — 1343\n\n" +
      "Kung nasa ibang bansa ka na at nanganganib, hanapin din ang pinakamalapit na Philippine Embassy o Consulate.",
    source: DMW,
  },
  {
    id: "already-abroad-in-trouble",
    topic: "Nasa ibang bansa na ako at may problema",
    keywords: ["nasa abroad na", "nakulong", "kinuha ang passport", "hindi makauwi", "stranded", "nasa ibang bansa"],
    answer:
      "Kung nasa ibang bansa ka na at kinuha ang pasaporte mo, hindi ka pinapasahod, o hindi ka pinapayagang umalis — sapilitang paggawa iyon at may karapatan kang humingi ng tulong.\n\n" +
      "• Kontakin ang pinakamalapit na Philippine Embassy o Consulate — sila ang may Migrant Workers Office.\n" +
      "• Tawagan o ipatawag ang DMW Hotline 1348.\n" +
      "• Para sa trafficking, ang IACAT 1343 Actionline.\n\n" +
      "Kung kaya mong itago ang kopya ng kontrata, pasaporte, at anumang mensahe, gawin mo — malaking tulong iyon sa pagsagip sa iyo.",
    source: IACAT,
  },

  {
    id: "guaranteed-approval",
    topic: "100% guaranteed na approval",
    keywords: ["guaranteed", "sigurado ang approval", "100%", "walang bagsak", "assured visa"],
    answer:
      "Walang sinuman ang makakapangako ng 100% approval sa visa o trabaho — hindi ito nasa kamay ng ahensya kundi ng embahada at ng employer. " +
      "Ang ganitong garantiya ay palaging pang-akit lang, at karaniwang kasunod nito ang paghingi ng bayad.",
    source: DMW,
  },
  {
    id: "no-passport-no-experience",
    topic: "'Kahit walang passport o karanasan'",
    keywords: ["walang passport", "no passport", "walang experience", "walang karanasan", "kahit walang requirements"],
    answer:
      "Imposible ang legal na deployment nang walang pasaporte — kailangan ito ng bawat visa at bawat immigration checkpoint. " +
      "Kapag sinabi nilang 'ayos lang kahit wala', ibig sabihin hindi legal ang balak nilang ruta para sa iyo. " +
      "Ganoon din ang 'kahit walang karanasan, tanggap ka agad' para sa trabahong karaniwang may kwalipikasyon.",
    source: DMW_ILLEGAL_RECRUITMENT,
  },
  {
    id: "fake-certificate",
    topic: "Peke na TESDA o training certificate",
    keywords: ["tesda", "certificate", "fake certificate", "training certificate", "walang training"],
    answer:
      "Kung nag-aalok sila ng TESDA o training certificate kahit hindi ka pumasok sa training, peke ang ibinibigay nila. " +
      "Bukod sa mabubuko ito sa verification, puwede ka ring madamay sa kaso — ikaw ang may hawak ng pekeng dokumento.",
    source: "https://www.tesda.gov.ph",
  },
  {
    id: "urgent-hiring-pressure",
    topic: "'Urgent hiring' at pagmamadali",
    keywords: ["urgent", "limited slots", "madaliin", "bilisan", "last 2 slots", "pressure"],
    answer:
      "Ang salitang 'urgent' mag-isa ay hindi naman senyales — maraming totoong job post ang minamadali rin. " +
      "Ang dapat mong pansinin ay kapag ang pagmamadali ay may kasabay na paghingi ng bayad, reservation, o personal na detalye. " +
      "Iyon ang paraan para hindi ka makapag-isip at makapag-verify muna.",
    source: DMW,
  },
  {
    id: "page-hijack",
    topic: "'Bagong page kami, na-hack ang luma'",
    keywords: ["bagong page", "na-hack", "new page", "hacked account", "backup page"],
    answer:
      "Karaniwang paraan ito para magamit ang pangalan at reputasyon ng isang tunay na ahensya. " +
      "Kung sinasabi nilang 'bagong page' sila, huwag mong gamitin ang contact details sa page na iyon — hanapin mo mismo ang opisyal na numero ng ahensya sa listahan ng DMW at doon ka tumawag.",
    source: DMW,
  },
  {
    id: "avoid-official-contact",
    topic: "'Huwag ka nang tumawag sa opisina'",
    keywords: ["huwag tumawag", "wag sa landline", "sa akin ka lang", "dont call the office", "iwasan ang opisina"],
    answer:
      "Kapag pinipigilan ka nilang tumawag sa opisyal na numero o landline ng ahensya, sinasadya nilang hindi ka makausap ng tunay na ahensya. " +
      "Gawin mo ang kabaligtaran: tawagan mo mismo ang opisyal na numero na nakalista sa DMW at tanungin kung kilala nila ang taong kausap mo.",
    source: DMW,
  },
  {
    id: "what-is-job-order",
    topic: "Ano ang job order",
    keywords: ["job order", "ano ang job order", "approved job order", "manpower request"],
    answer:
      "Ang job order ay ang aprubadong kahilingan ng dayuhang employer sa DMW: nakasaad dito ang posisyon, bansa, bilang ng manggagawa, at sahod. " +
      "Kung ang alok sa iyo ay walang katumbas na aprubadong job order, walang legal na basehan ang pagre-recruit sa iyo. " +
      "Puwede mong ipa-check sa akin ang ahensya at makikita mo ang mga nakarehistrong job order nila.",
    source: DMW,
  },
  {
    id: "what-is-ligtasofw",
    topic: "Ano ang LigtasOFW at si Bantatay",
    keywords: ["sino ka", "ano ka", "ano ito", "who are you", "what is this", "ligtasofw", "bantatay"],
    answer:
      "Ako si Bantatay — tumutulong akong suriin kung lisensyado ng DMW ang isang recruitment agency, at binabasa ko ang mga job post para hanapin ang senyales ng illegal recruitment.\n\n" +
      "Mahalagang malaman mo: ang LigtasOFW ay isang independiyenteng tool, hindi opisyal at walang kaugnayan sa DMW. " +
      "Panimulang pagsusuri lang ang ibinibigay ko — hindi ito legal na payo at hindi ito opisyal na kumpirmasyon. " +
      "Laging i-verify sa opisyal na DMW website o sa DMW Hotline 1348 bago ka magdesisyon.",
    source: DMW,
  },
];

const KB_BY_ID: ReadonlyMap<string, KbEntry> = new Map(ADVISOR_KB.map((entry) => [entry.id, entry]));

/** Resolves an id to its entry, or undefined. Used by the Router's kb_ids guard. */
export function kbEntryById(id: string): KbEntry | undefined {
  return KB_BY_ID.get(id);
}

/**
 * Drops any id the Router invented (ADR-0005's "the model selects, it never authors" —
 * a hallucinated id resolves to nothing rather than to fabricated advice). Order follows
 * the Router's ranking; duplicates collapse to the first occurrence.
 */
export function resolveKbIds(ids: readonly string[]): KbEntry[] {
  const seen = new Set<string>();
  const resolved: KbEntry[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const entry = KB_BY_ID.get(id);
    if (entry) {
      seen.add(id);
      resolved.push(entry);
    }
  }
  return resolved;
}

/**
 * The zero-LLM fast path (router.ts): a plain keyword scan over the turn text. Entries are
 * ranked by how many distinct keywords matched, so a question that names both "cambodia" and
 * "scam farm" surfaces the trafficking entry above a weaker single-keyword hit.
 *
 * Deliberately conservative — it only fires on explicit keyword presence. Anything vaguer
 * falls through to the Router, which costs one call but reads intent properly.
 */
export function matchKbEntries(text: string, limit = 2): KbEntry[] {
  const haystack = text.toLowerCase();
  const scored: { entry: KbEntry; hits: number }[] = [];

  for (const entry of ADVISOR_KB) {
    const hits = entry.keywords.filter((keyword) => haystack.includes(keyword)).length;
    if (hits > 0) {
      scored.push({ entry, hits });
    }
  }

  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((match) => match.entry);
}
