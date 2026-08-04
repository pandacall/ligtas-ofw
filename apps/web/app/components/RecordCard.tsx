import type { ReactNode } from "react";
import type { Verdict } from "@ligtas-ofw/core";
import { VerdictBanner } from "./VerdictStamp";

/**
 * The tarp every result is printed on.
 *
 * A banner across the top carrying the verdict at shouting scale, a paper body beneath it for
 * the reading, and grommets at the corners. Square, hard-keylined, offset-shadowed — the
 * physical object, not a soft app card.
 *
 * There is deliberately no label line above or below the heading. A tracked all-caps string
 * restating the heading is the craft floor's one outright ban, and relocating it under the body
 * was the same defect in a new position: it still repeated the agency name, and it truncated.
 * The banner says what the verdict is and the reasons name the query, which is enough.
 *
 * `verdict` is optional: escape hatches (unanalyzable, quota exhausted, rate limited, not a job
 * post) have no verdict to announce, so they get a plain ink header band instead of a coloured
 * field. Those states must never look adjudicated.
 */
export function TarpCard({
  label,
  verdict,
  children,
}: {
  label: string;
  verdict?: Verdict;
  children: ReactNode;
}) {
  return (
    <article className="tarp grommet relative bg-paper">
      {verdict ? (
        <VerdictBanner verdict={verdict} />
      ) : (
        // pl-9/pr-9 clears the grommets, which used to overprint the first letter of the title.
        <h2 className="border-b-2 border-ink bg-ink py-2.5 pl-9 pr-9 text-[0.8rem] font-bold uppercase tracking-[0.1em] text-paper">
          {label}
        </h2>
      )}

      <div className="px-4 pb-5 pt-3.5 sm:px-5 lg:px-7 lg:pb-7 lg:pt-5 lg:text-[1.05rem]">{children}</div>
    </article>
  );
}
