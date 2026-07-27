import type { JobOrder, RegistryVerdictResult } from "@ligtas-ofw/core";
import { formatDate } from "@ligtas-ofw/core";
import { ResultFooter } from "./ResultFooter";

const VERDICT_LABEL: Record<RegistryVerdictResult["verdict"], string> = {
  VERIFIED: "✅ VERIFIED",
  CAUTION: "⚠️ CAUTION",
  HIGH_RISK: "🚨 HIGH_RISK",
};

function formatNullableDate(date: Date | null): string {
  return date ? formatDate(date) : "—";
}

export function ResultCard({ result }: { result: RegistryVerdictResult }) {
  const showReportBlock = result.verdict === "HIGH_RISK";

  if (result.kind === "not_found") {
    return (
      <section>
        <h2>{VERDICT_LABEL[result.verdict]}</h2>
        <ul>
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <ResultFooter dataAsOf={null} syncedAt={result.syncedAt} showReportBlock={showReportBlock} />
      </section>
    );
  }

  if (result.kind === "ambiguous") {
    return (
      <section>
        <h2>{VERDICT_LABEL[result.verdict]}</h2>
        <ul>
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <ul>
          {result.candidates.map((candidate) => (
            <li key={candidate.id}>{candidate.name}</li>
          ))}
        </ul>
        <ResultFooter dataAsOf={null} syncedAt={result.syncedAt} showReportBlock={showReportBlock} />
      </section>
    );
  }

  const { agency } = result;
  return (
    <section>
      <h2>{VERDICT_LABEL[result.verdict]}</h2>
      <h3>{agency.name}</h3>
      <dl>
        <dt>License Status</dt>
        <dd>{agency.licenseStatus}</dd>
        <dt>License validity</dt>
        <dd>
          {formatNullableDate(agency.licenseStatusDate)} &ndash; {formatNullableDate(agency.licenseExpirationDate)}
        </dd>
        <dt>Address</dt>
        <dd>{agency.address ?? "—"}</dd>
      </dl>
      <ul>
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <JobOrdersSection jobOrders={result.jobOrders} claimedMatch={result.claimedMatch} />
      <ResultFooter dataAsOf={agency.dataAsOf} syncedAt={result.syncedAt} showReportBlock={showReportBlock} />
    </section>
  );
}

function JobOrdersSection({
  jobOrders,
  claimedMatch,
}: {
  jobOrders: JobOrder[];
  claimedMatch?: JobOrder | null;
}) {
  return (
    <section>
      <h4>Job Orders</h4>
      {jobOrders.length === 0 ? (
        <p>No approved Job Orders on file.</p>
      ) : (
        <ul>
          {jobOrders.map((jobOrder) => {
            const isClaimedMatch = claimedMatch != null && claimedMatch.id === jobOrder.id;
            return (
              <li key={jobOrder.id}>
                {jobOrder.position} &mdash; {jobOrder.jobsite} (principal: {jobOrder.principal})
                {isClaimedMatch && " ✅ matches your claim"}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
