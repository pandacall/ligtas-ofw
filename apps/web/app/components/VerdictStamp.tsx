import type { Verdict } from "@ligtas-ofw/core";

/**
 * The verdict, struck across the record like a rubber stamp.
 *
 * This is the design's one loud gesture, and it marks a specific moment: the point where the
 * deterministic engine — not the assistant — spoke. Bantatay's own words are set in soft chat
 * bubbles; only checkAgency and scorePost get to leave a stamp.
 *
 * The labels stay exactly as CONTEXT.md names the verdicts — VERIFIED / CAUTION / HIGH_RISK
 * is the product's vocabulary, and the glossary asks for it verbatim. Colour never carries
 * the meaning alone: the emoji and the word ride along, so a verdict survives greyscale,
 * colour-blindness, and a screen read in direct sun.
 */
export const VERDICT_LABEL: Record<Verdict, string> = {
  VERIFIED: "✅ VERIFIED",
  CAUTION: "⚠️ CAUTION",
  HIGH_RISK: "🚨 HIGH_RISK",
};

const VERDICT_TONE: Record<Verdict, string> = {
  VERIFIED: "text-verified",
  CAUTION: "text-caution",
  HIGH_RISK: "text-risk",
};

export function VerdictStamp({ verdict }: { verdict: Verdict }) {
  return <p className={`stamp ${VERDICT_TONE[verdict]}`}>{VERDICT_LABEL[verdict]}</p>;
}

/**
 * A verdict shown *inside* another record — the registry result nested in a job-post scan.
 *
 * Quiet on purpose. Only one verdict per record gets the stamp, and it is the record's own
 * combined verdict. This matters most in the impersonation case (verdict-cases.md P3), where
 * a registry-VERIFIED agency sits inside a HIGH_RISK scan: a second green stamp there would
 * argue against the warning the card exists to deliver.
 */
export function VerdictInline({ verdict }: { verdict: Verdict }) {
  return (
    <p
      className={`inline-flex items-center rounded-sm border border-current px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide ${VERDICT_TONE[verdict]}`}
    >
      {VERDICT_LABEL[verdict]}
    </p>
  );
}
