import type { ScanResult } from "@ligtas-ofw/core";
import { FLAG_COPY, LICENSE_FORMAT_NEUTRAL_COPY, NOT_A_JOB_POST_COPY, UNANALYZABLE_COPY, VERDICT_BANNER } from "@ligtas-ofw/core/copy";
import { RegistryResultDetails, VERDICT_LABEL } from "../../components/RegistryResultDetails";
import { DMW_VERIFY_URL, ResultFooter } from "../../components/ResultFooter";

export function ScanResultCard({ result, syncedAt }: { result: ScanResult; syncedAt: Date }) {
  if (result.kind === "not_a_job_post") {
    return (
      <section>
        <p>{NOT_A_JOB_POST_COPY}</p>
        <ResultFooter dataAsOf={null} syncedAt={syncedAt} showReportBlock={false} />
      </section>
    );
  }

  if (result.kind === "unanalyzable") {
    return (
      <section>
        <p>{UNANALYZABLE_COPY}</p>
        <p>
          <a href={DMW_VERIFY_URL} target="_blank" rel="noreferrer">
            Manual na maghanap sa DMW website
          </a>
        </p>
        <ResultFooter dataAsOf={null} syncedAt={syncedAt} showReportBlock={false} />
      </section>
    );
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
