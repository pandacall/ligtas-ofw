import type { KbEntry } from "@ligtas-ofw/core";
import { ExternalLinkIcon } from "../Icon";

/**
 * An Advisor KB answer, rendered verbatim with its source (ADR-0005).
 *
 * The model selected this entry; it did not write it. That distinction is the reason the
 * source link is not fine print but a first-class part of the card — every claim here is one
 * the reader can go and check.
 */
export function KbAnswerCard({ entry }: { entry: KbEntry }) {
  return (
    <article className="rounded-lg border border-hairline bg-surface-raised px-4 py-3.5">
      <h3 className="font-display text-[0.95rem] font-bold leading-snug text-ink">{entry.topic}</h3>
      {/* whitespace-pre-line: several entries are hand-written numbered steps. */}
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{entry.answer}</p>
      <a
        href={entry.source}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-narra underline decoration-narra/35 underline-offset-4 hover:decoration-narra"
      >
        Tingnan ang sanggunian
        <ExternalLinkIcon size={14} />
      </a>
    </article>
  );
}
