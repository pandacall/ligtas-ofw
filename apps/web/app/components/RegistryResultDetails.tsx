import type { JobOrder, RegistryVerdictResult } from "@ligtas-ofw/core";
import { formatDate } from "@ligtas-ofw/core/format";
import { VerifiedMark } from "./Icon";

function formatNullableDate(date: Date | null): string {
  return date ? formatDate(date) : "—";
}

/** Why the engine landed where it did. These are the reasons, never decoration. */
function Reasons({ reasons }: { reasons: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-[0.9rem]">
      {reasons.map((reason) => (
        <li key={reason} className="flex gap-2">
          <span aria-hidden className="mt-[0.5em] h-1.5 w-1.5 shrink-0 bg-ink" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}

/** A printed label above its value, the way a form is set. Tracked caps, not monospace. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[0.9rem] font-medium text-ink">{children}</dd>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">{children}</h3>;
}

/**
 * The registry result's body. The verdict itself is rendered by the enclosing TarpCard's
 * banner, so nothing here draws one — including when nested inside a scan, where a second
 * verdict mark would undercut the card's own.
 */
export function RegistryResultDetails({ result }: { result: RegistryVerdictResult }) {
  if (result.kind === "not_found") {
    return <Reasons reasons={result.reasons} />;
  }

  if (result.kind === "ambiguous") {
    return (
      <>
        <Reasons reasons={result.reasons} />
        <div className="mt-4">
          <SectionLabel>Malapit na tugma sa listahan</SectionLabel>
          {/* Bordered slips, not side-tabbed rows — same printed vocabulary as everything else. */}
          <ul className="mt-2 space-y-1.5">
            {result.candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="border-2 border-ink bg-paper px-2.5 py-1.5 text-[0.9rem] font-medium text-ink"
              >
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
      <h3 className="shout text-[1.5rem] leading-[0.95] text-ink lg:text-[2.4rem]">{agency.name}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:gap-x-8">
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
    <section className="mt-4 border-t-2 border-dashed border-paper-edge pt-3">
      <SectionLabel>Job Orders</SectionLabel>
      {jobOrders.length === 0 ? (
        <p className="mt-1.5 text-[0.9rem]">Walang aprubadong Job Order sa listahan.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {jobOrders.map((jobOrder) => {
            const isClaimedMatch = claimedMatch != null && claimedMatch.id === jobOrder.id;
            return (
              <li key={jobOrder.id} className="text-[0.9rem]">
                <span className="font-bold">{jobOrder.position}</span> &mdash; {jobOrder.jobsite}{" "}
                <span className="text-ink-soft">(principal: {jobOrder.principal})</span>
                {/*
                  Ink, not green. This component also renders nested inside a job-post scan, and
                  a green affirmation printed inside a HIGH_RISK card argues against the warning
                  the card exists to deliver — the same failure as a coloured VerdictInline, via a
                  different route. The mark and the words carry the meaning; only the deterministic
                  verdict banner spends colour.
                */}
                {isClaimedMatch && (
                  <span className="ml-1 inline-flex items-center gap-1 font-bold text-ink">
                    <VerifiedMark size={14} className="shrink-0" />
                    tugma sa sinabi mo
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
