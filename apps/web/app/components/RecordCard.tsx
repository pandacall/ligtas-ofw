import type { ReactNode } from "react";

/**
 * The document shell every verdict is delivered in.
 *
 * Manila stock, a mono header line, and a double rule — the visual grammar of the official
 * paperwork this product checks against. Deliberately unlike the chat bubbles around it: a
 * verdict is a record handed to you, not something the assistant said.
 */
export function RecordCard({
  label,
  reference,
  children,
}: {
  label: string;
  /** What the record is about — an agency name, usually. Shown in the header line. */
  reference?: string;
  children: ReactNode;
}) {
  return (
    <article className="record px-4 py-3.5 sm:px-5">
      <header className="record-rule flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pb-2">
        <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-manila-ink/85">
          {label}
        </span>
        {reference && (
          <span className="truncate font-mono text-[0.65rem] uppercase tracking-[0.1em] text-manila-ink/85">
            / {reference}
          </span>
        )}
      </header>
      <div className="pt-3.5">{children}</div>
    </article>
  );
}
