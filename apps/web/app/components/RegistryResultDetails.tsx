import type { JobOrder, RegistryVerdictResult } from "@ligtas-ofw/core";
import { formatDate } from "@ligtas-ofw/core/format";
import { VerdictInline, VerdictStamp } from "./VerdictStamp";

// Shared by ResultCard (agency check) and the scan card's registry section — both render the
// identical RegistryVerdictResult shape, only the surrounding footer differs.
// VERDICT_LABEL now lives with the stamp that renders it; re-exported so existing importers
// keep working.
export { VERDICT_LABEL } from "./VerdictStamp";

function formatNullableDate(date: Date | null): string {
  return date ? formatDate(date) : "—";
}

/** Why the engine landed where it did. Never decorative — these are the reasons. */
function Reasons({ reasons }: { reasons: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm">
      {reasons.map((reason) => (
        <li key={reason} className="flex gap-2">
          <span aria-hidden className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-manila-rule" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}

/** A record field: mono label above mono value, the way a printed form sets them. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-manila-ink/85">{label}</dt>
      <dd className="mt-0.5 font-mono text-[0.8rem] text-manila-ink">{children}</dd>
    </div>
  );
}

/**
 * `verdictDisplay` controls how loud this result's verdict is. A record shows exactly one
 * stamp — its own — so a registry result nested inside a job-post scan renders "inline".
 */
export function RegistryResultDetails({
  result,
  verdictDisplay = "stamp",
}: {
  result: RegistryVerdictResult;
  verdictDisplay?: "stamp" | "inline";
}) {
  const Verdict = verdictDisplay === "stamp" ? VerdictStamp : VerdictInline;

  if (result.kind === "not_found") {
    return (
      <>
        <Verdict verdict={result.verdict} />
        <Reasons reasons={result.reasons} />
      </>
    );
  }

  if (result.kind === "ambiguous") {
    return (
      <>
        <Verdict verdict={result.verdict} />
        <Reasons reasons={result.reasons} />
        <div className="mt-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-manila-ink/85">
            Malapit na tugma sa listahan
          </p>
          <ul className="mt-1.5 space-y-1">
            {result.candidates.map((candidate) => (
              <li key={candidate.id} className="font-mono text-[0.8rem]">
                {candidate.name}
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }

  const { agency } = result;
  return (
    <>
      <Verdict verdict={result.verdict} />
      <h3 className="mt-4 font-display text-lg leading-snug font-bold text-manila-ink">{agency.name}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="License status">{agency.licenseStatus}</Field>
        <Field label="Validity">
          {formatNullableDate(agency.licenseStatusDate)} &ndash; {formatNullableDate(agency.licenseExpirationDate)}
        </Field>
        <div className="col-span-2">
          <Field label="Address">{agency.address ?? "—"}</Field>
        </div>
      </dl>
      <Reasons reasons={result.reasons} />
      <JobOrdersSection jobOrders={result.jobOrders} claimedMatch={result.claimedMatch} />
    </>
  );
}

function JobOrdersSection({ jobOrders, claimedMatch }: { jobOrders: JobOrder[]; claimedMatch?: JobOrder | null }) {
  return (
    <section className="mt-4 border-t border-manila-rule/60 pt-3">
      <h4 className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-manila-ink/85">Job Orders</h4>
      {jobOrders.length === 0 ? (
        <p className="mt-1.5 text-sm">No approved Job Orders on file.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {jobOrders.map((jobOrder) => {
            const isClaimedMatch = claimedMatch != null && claimedMatch.id === jobOrder.id;
            return (
              <li key={jobOrder.id} className="text-sm">
                <span className="font-semibold">{jobOrder.position}</span> &mdash; {jobOrder.jobsite}{" "}
                <span className="text-manila-ink/85">(principal: {jobOrder.principal})</span>
                {isClaimedMatch && <span className="ml-1 font-semibold text-verified">✅ matches your claim</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
