import type { ScanResult, Verdict } from "@ligtas-ofw/core";
import {
  FLAG_COPY,
  LICENSE_FORMAT_NEUTRAL_COPY,
  NOT_A_JOB_POST_COPY,
  QUOTA_EXHAUSTED_COPY,
  RATE_LIMITED_COPY,
  REGISTRY_CONTRADICTS_POST_COPY,
  UNANALYZABLE_COPY,
  VERDICT_BANNER,
} from "@ligtas-ofw/core/copy";
import { RegistryResultDetails } from "./RegistryResultDetails";
import { DMW_VERIFY_URL, ResultFooter } from "./ResultFooter";
import { TarpCard } from "./RecordCard";
import { VerdictInline } from "./VerdictStamp";
import { ExternalLinkIcon } from "./Icon";

// The escape-hatch states: a message plus the mandatory footer, optionally with a manual-search
// link. These pass no verdict to TarpCard, so they get an ink header band rather than a
// coloured field — an unanalyzable post must never look adjudicated.
function EscapeHatchNotice({
  label,
  copy,
  syncedAt,
  showManualSearchLink,
}: {
  label: string;
  copy: string;
  syncedAt: Date;
  showManualSearchLink: boolean;
}) {
  return (
    <TarpCard label={label}>
      <p className="text-[0.95rem]">{copy}</p>
      {showManualSearchLink && (
        <p className="mt-3">
          <a
            href={DMW_VERIFY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-ink bg-tarp px-3 font-bold text-ink transition-transform hover:-translate-y-px"
          >
            Maghanap sa DMW website
            <ExternalLinkIcon size={16} />
          </a>
        </p>
      )}
      <ResultFooter dataAsOf={null} syncedAt={syncedAt} showReportBlock={false} />
    </TarpCard>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">{children}</h3>;
}

export function ScanResultCard({ result, syncedAt }: { result: ScanResult; syncedAt: Date }) {
  if (result.kind === "not_a_job_post") {
    return (
      <EscapeHatchNotice
        label="Walang verdict"
        copy={NOT_A_JOB_POST_COPY}
        syncedAt={syncedAt}
        showManualSearchLink={false}
      />
    );
  }

  if (result.kind === "unanalyzable") {
    return (
      <EscapeHatchNotice label="Hindi na-analyze" copy={UNANALYZABLE_COPY} syncedAt={syncedAt} showManualSearchLink />
    );
  }

  if (result.kind === "quota_exhausted") {
    return (
      <EscapeHatchNotice
        label="Abot na ang limit ngayon"
        copy={QUOTA_EXHAUSTED_COPY}
        syncedAt={syncedAt}
        showManualSearchLink
      />
    );
  }

  if (result.kind === "rate_limited") {
    return (
      <EscapeHatchNotice
        label="Sandaling maghintay"
        copy={RATE_LIMITED_COPY}
        syncedAt={syncedAt}
        showManualSearchLink={false}
      />
    );
  }

  const { verdict, post, registry, validFormatLicenseClaim } = result;
  const showReportBlock = verdict === "HIGH_RISK";
  const dataAsOf = registry?.kind === "matched" ? registry.agency.dataAsOf : null;

  // The impersonation shape (verdict-cases.md P3 / scam-15): the agency checks out but the post
  // does not. Previously the card simply ended on the registry's green mark and left the user
  // to reconcile the contradiction — which they do in the reassuring direction, because that is
  // what the scammer is counting on. Now the card says it outright.
  //
  // `verdict` is worst-of(registry, post), so it is never less severe than the registry's. Any
  // difference therefore means the post dragged the card down, which is the whole condition —
  // no severity comparison needed, and no value import from the core index, which would pull
  // `pg` into this client bundle.
  const registryContradictsPost = registry !== undefined && registry.verdict !== verdict;

  return (
    <TarpCard label="Job post scan" verdict={verdict}>
      <p className="text-[0.95rem] leading-relaxed">{VERDICT_BANNER[verdict]}</p>

      {/*
        Registry sits ABOVE the red flags so the card ends on the evidence of danger rather than
        on a licence status. Ordering is load-bearing here, not cosmetic.
      */}
      {registry && (
        <section className="mt-4 border-t-2 border-dashed border-paper-edge pt-3">
          <SectionLabel>Ahensya sa DMW registry</SectionLabel>
          <div className="mt-2">
            <VerdictInline verdict={registry.verdict as Verdict} />
          </div>
          {/*
            A ruled band of the same tarp, like the evidence strips — not a keylined box inside
            an already-keylined card, which is the nesting this file's own rule forbids.
            The BABALA chip carries the severity; the banner stays the only place a card spends
            a saturated field, so this note cannot contradict its own opening clause ("the
            agency is genuine and licensed").
          */}
          {registryContradictsPost && (
            <div className="mt-3 border-t-2 border-dashed border-paper-edge pt-3">
              <p className="mb-1.5 inline-block bg-risk px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-paper">
                Babala
              </p>
              <p className="text-[0.9rem] font-medium leading-relaxed text-ink">
                {REGISTRY_CONTRADICTS_POST_COPY}
              </p>
            </div>
          )}
          <div className="mt-3">
            <RegistryResultDetails result={registry} />
          </div>
        </section>
      )}

      <section className="mt-4 border-t-2 border-dashed border-paper-edge pt-3">
        <SectionLabel>Mga red flag sa post</SectionLabel>
        {post.flags.length === 0 ? (
          <p className="mt-1.5 text-[0.9rem]">Walang nakitang red flag sa post na ito.</p>
        ) : (
          // Evidence or it didn't happen: each flag shows the verbatim quote that triggered it,
          // printed on paper stock so it reads as pasted-on proof. The rule colour carries the
          // severity tier the engine assigned — Info stays neutral, because invariant 3 says
          // Info surfaces but never scores.
          <ol className="mt-2">
            {post.flags.map((flag, index) => (
              <li key={`${flag.flag}-${index}`} className="evidence py-2.5 text-[0.88rem] leading-relaxed">
                {/*
                  Severity rides on a printed tier chip, not a coloured edge. Info stays ink on
                  paper because invariant 3 says Info surfaces but never scores — giving it a
                  colour would score it in the UI.
                */}
                <span
                  className={`mb-1.5 inline-block px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${
                    flag.tier === "CRITICAL"
                      ? "bg-risk text-paper"
                      : flag.tier === "WARNING"
                        ? "bg-caution text-paper"
                        : "border-2 border-ink bg-paper text-ink"
                  }`}
                >
                  {flag.tier}
                </span>
                <span className="block">{FLAG_COPY[flag.flag](flag.evidence)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {validFormatLicenseClaim && (
        <p className="mt-4 border-t-2 border-dashed border-paper-edge pt-3 text-[0.88rem]">
          {LICENSE_FORMAT_NEUTRAL_COPY} <span className="font-bold">({validFormatLicenseClaim})</span>
        </p>
      )}

      <ResultFooter dataAsOf={dataAsOf} syncedAt={registry?.syncedAt ?? syncedAt} showReportBlock={showReportBlock} />
    </TarpCard>
  );
}
