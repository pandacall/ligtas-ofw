import type { ScanResult } from "@ligtas-ofw/core";
import {
  FLAG_COPY,
  LICENSE_FORMAT_NEUTRAL_COPY,
  NOT_A_JOB_POST_COPY,
  QUOTA_EXHAUSTED_COPY,
  RATE_LIMITED_COPY,
  UNANALYZABLE_COPY,
  VERDICT_BANNER,
} from "@ligtas-ofw/core/copy";
import { RegistryResultDetails } from "./RegistryResultDetails";
import { DMW_VERIFY_URL, ResultFooter } from "./ResultFooter";
import { RecordCard } from "./RecordCard";
import { VerdictStamp } from "./VerdictStamp";
import { ExternalLinkIcon } from "./Icon";

// Shared shape for the escape-hatch states that show a message + footer, optionally with
// a manual-search link (not_a_job_post, unanalyzable, quota_exhausted, rate_limited).
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
    <RecordCard label={label}>
      <p className="text-sm">{copy}</p>
      {showManualSearchLink && (
        <p className="mt-3">
          <a
            href={DMW_VERIFY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-narra underline decoration-manila-rule underline-offset-4 hover:decoration-narra"
          >
            Manual na maghanap sa DMW website
            <ExternalLinkIcon size={14} />
          </a>
        </p>
      )}
      <ResultFooter dataAsOf={null} syncedAt={syncedAt} showReportBlock={false} />
    </RecordCard>
  );
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
      <EscapeHatchNotice
        label="Hindi na-analyze"
        copy={UNANALYZABLE_COPY}
        syncedAt={syncedAt}
        showManualSearchLink={true}
      />
    );
  }

  if (result.kind === "quota_exhausted") {
    return (
      <EscapeHatchNotice
        label="Abot na ang limit"
        copy={QUOTA_EXHAUSTED_COPY}
        syncedAt={syncedAt}
        showManualSearchLink={true}
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

  return (
    <RecordCard label="Job Post Scan">
      <VerdictStamp verdict={verdict} />
      <p className="mt-4 text-sm leading-relaxed">{VERDICT_BANNER[verdict]}</p>

      <section className="mt-4 border-t border-manila-rule/60 pt-3">
        <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-manila-ink/85">
          Mga red flag sa post
        </h3>
        {post.flags.length === 0 ? (
          <p className="mt-1.5 text-sm">Walang nakitang red flag sa post na ito.</p>
        ) : (
          // Evidence or it didn't happen: every flag shows the verbatim quote that triggered
          // it, set apart like a highlighted line on a printed page.
          <ol className="mt-2 space-y-2.5">
            {post.flags.map((flag, index) => (
              <li key={`${flag.flag}-${index}`} className="evidence py-1.5 pl-3 pr-2 text-manila-ink">
                {FLAG_COPY[flag.flag](flag.evidence)}
              </li>
            ))}
          </ol>
        )}
      </section>

      {validFormatLicenseClaim && (
        <p className="mt-4 border-t border-manila-rule/60 pt-3 text-sm">
          {LICENSE_FORMAT_NEUTRAL_COPY}{" "}
          <span className="font-mono text-[0.8rem]">({validFormatLicenseClaim})</span>
        </p>
      )}

      {registry && (
        <section className="mt-4 border-t border-manila-rule/60 pt-3">
          <h3 className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-manila-ink/85">
            Ahensya sa DMW registry
          </h3>
          {/* Inline, not stamped — the record already carries its own combined verdict. */}
          <RegistryResultDetails result={registry} verdictDisplay="inline" />
        </section>
      )}

      <ResultFooter dataAsOf={dataAsOf} syncedAt={registry?.syncedAt ?? syncedAt} showReportBlock={showReportBlock} />
    </RecordCard>
  );
}
