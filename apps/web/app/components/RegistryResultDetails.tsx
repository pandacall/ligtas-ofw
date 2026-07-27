import type { JobOrder, RegistryVerdictResult, Verdict } from "@ligtas-ofw/core";
import { formatDate } from "@ligtas-ofw/core/format";

// Shared by ResultCard (agency-check page) and the scan page's registry section — both
// render the identical RegistryVerdictResult shape, only the surrounding footer differs.
export const VERDICT_LABEL: Record<Verdict, string> = {
  VERIFIED: "✅ VERIFIED",
  CAUTION: "⚠️ CAUTION",
  HIGH_RISK: "🚨 HIGH_RISK",
};

function formatNullableDate(date: Date | null): string {
  return date ? formatDate(date) : "—";
}

export function RegistryResultDetails({ result }: { result: RegistryVerdictResult }) {
  if (result.kind === "not_found") {
    return (
      <>
        <h2>{VERDICT_LABEL[result.verdict]}</h2>
        <ul>
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </>
    );
  }

  if (result.kind === "ambiguous") {
    return (
      <>
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
      </>
    );
  }

  const { agency } = result;
  return (
    <>
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
    </>
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
