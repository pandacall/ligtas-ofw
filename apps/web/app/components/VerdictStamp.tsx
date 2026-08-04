import type { Verdict } from "@ligtas-ofw/core";
import { CautionMark, RiskMark, VerifiedMark } from "./Icon";

/**
 * The verdict, printed as a tarpaulin banner.
 *
 * In this world a verdict is not a badge sitting on a card — it is the banner, a full-bleed
 * field of its own colour with the word at shouting scale. Only the deterministic engine gets
 * one: `checkAgency` and `scorePost`. Bantatay's own words stay on paper stock, so the user
 * learns without being told that the thing that talks and the thing that judges are different
 * things.
 *
 * Labels stay VERIFIED / CAUTION / HIGH_RISK — CONTEXT.md's vocabulary, kept verbatim at the
 * user's explicit direction (2026-08-04). Meaning never rides on colour alone: the colour field,
 * the word, and a drawn mark all carry it, so it survives greyscale and a screen read in
 * sunlight. The marks come from Icon.tsx — never the emoji table, whose vendor glyphs render as
 * rounded, gradient-shaded 3D pictograms in a world that has neither.
 */
export const VERDICT_WORD: Record<Verdict, string> = {
  VERIFIED: "VERIFIED",
  CAUTION: "CAUTION",
  HIGH_RISK: "HIGH_RISK",
};

const VERDICT_MARK: Record<Verdict, typeof VerifiedMark> = {
  VERIFIED: VerifiedMark,
  CAUTION: CautionMark,
  HIGH_RISK: RiskMark,
};

/** Spoken prefix so a screen reader announces a verdict, not a decorative string. */
const VERDICT_SPOKEN: Record<Verdict, string> = {
  VERIFIED: "Verdict: walang nakitang panganib.",
  CAUTION: "Verdict: mag-ingat.",
  HIGH_RISK: "Verdict: mataas na panganib.",
};

const FIELD: Record<Verdict, string> = {
  VERIFIED: "bg-verified",
  CAUTION: "bg-caution",
  HIGH_RISK: "bg-risk",
};

const SHADOW: Record<Verdict, string> = {
  VERIFIED: "[--shout-shadow:var(--color-verified-deep)]",
  CAUTION: "[--shout-shadow:var(--color-caution-deep)]",
  HIGH_RISK: "[--shout-shadow:var(--color-risk-deep)]",
};

/**
 * The banner. Renders as the card's `h2` so the verdict is the first waypoint a screen-reader
 * user lands on — previously it was a `<p>` and effectively invisible to them.
 */
export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const Mark = VERDICT_MARK[verdict];
  return (
    <h2
      className={`banner-drop stock halftone relative ${FIELD[verdict]} ${SHADOW[verdict]} border-b-2 border-ink px-4 py-4 sm:px-5 lg:px-6 lg:py-5`}
    >
      <span className="sr-only">{VERDICT_SPOKEN[verdict]}</span>
      <span aria-hidden className="relative z-1 flex items-center gap-2.5 text-paper">
        <Mark size={30} className="shrink-0 lg:h-9 lg:w-9" />
        <span className="shout shout-shadow text-[2.1rem] sm:text-[2.6rem] lg:text-[3.4rem]">
          {VERDICT_WORD[verdict]}
        </span>
      </span>
    </h2>
  );
}

/**
 * A verdict shown *inside* another record — the registry result nested in a job-post scan.
 *
 * Deliberately colourless. Only one banner per card, and it belongs to the card's own combined
 * verdict. This matters most in the impersonation case (verdict-cases.md P3), where a
 * registry-VERIFIED agency sits inside a HIGH_RISK scan: a green mark there argues against the
 * warning the card exists to deliver, which is exactly the misread the scammer engineers.
 */
export function VerdictInline({ verdict }: { verdict: Verdict }) {
  return (
    <p className="inline-block border-2 border-ink bg-paper px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-ink">
      Rehistro: {verdict.replace("_", " ")}
    </p>
  );
}
