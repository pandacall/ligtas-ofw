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
import { RegistryResultDetails, VERDICT_LABEL } from "../../components/RegistryResultDetails";
import { DMW_VERIFY_URL, ResultFooter } from "../../components/ResultFooter";

// Shared shape for the escape-hatch states that show a message + footer, optionally with
// a manual-search link (not_a_job_post, unanalyzable, quota_exhausted, rate_limited).
function EscapeHatchNotice({
  copy,
  syncedAt,
  showManualSearchLink,
}: {
  copy: string;
  syncedAt: Date;
  showManualSearchLink: boolean;
}) {
  return (
    <section>
      <p>{copy}</p>
      {showManualSearchLink && (
        <p>
          <a href={DMW_VERIFY_URL} target="_blank" rel="noreferrer">
            Manual na maghanap sa DMW website
          </a>
        </p>
      )}
      <ResultFooter dataAsOf={null} syncedAt={syncedAt} showReportBlock={false} />
    </section>
  );
}

export function ScanResultCard({ result, syncedAt }: { result: ScanResult; syncedAt: Date }) {
  if (result.kind === "not_a_job_post") {
    return <EscapeHatchNotice copy={NOT_A_JOB_POST_COPY} syncedAt={syncedAt} showManualSearchLink={false} />;
  }

  if (result.kind === "unanalyzable") {
    return <EscapeHatchNotice copy={UNANALYZABLE_COPY} syncedAt={syncedAt} showManualSearchLink={true} />;
  }

  if (result.kind === "quota_exhausted") {
    return <EscapeHatchNotice copy={QUOTA_EXHAUSTED_COPY} syncedAt={syncedAt} showManualSearchLink={true} />;
  }

  if (result.kind === "rate_limited") {
    return <EscapeHatchNotice copy={RATE_LIMITED_COPY} syncedAt={syncedAt} showManualSearchLink={false} />;
  }

  const { verdict, post, registry, validFormatLicenseClaim } = result;
  const showReportBlock = verdict === "HIGH_RISK";
  const dataAsOf = registry?.kind === "matched" ? registry.agency.dataAsOf : null;

  return (
    <section>
      <h2>{VERDICT_LABEL[verdict]}</h2>
      <p>{VERDICT_BANNER[verdict]}</p>

      <h3>Mga red flag sa post</h3>
      {post.flags.length === 0 ? (
        <p>Walang nakitang red flag sa post na ito.</p>
      ) : (
        <ul>
          {post.flags.map((flag, index) => (
            <li key={`${flag.flag}-${index}`}>{FLAG_COPY[flag.flag](flag.evidence)}</li>
          ))}
        </ul>
      )}

      {validFormatLicenseClaim && (
        <p>
          {LICENSE_FORMAT_NEUTRAL_COPY} ({validFormatLicenseClaim})
        </p>
      )}

      {registry && (
        <section>
          <h3>Ahensya sa DMW registry</h3>
          <RegistryResultDetails result={registry} />
        </section>
      )}

      <ResultFooter dataAsOf={dataAsOf} syncedAt={registry?.syncedAt ?? syncedAt} showReportBlock={showReportBlock} />
    </section>
  );
}
