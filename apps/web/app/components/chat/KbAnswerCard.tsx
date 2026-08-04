import type { KbEntry } from "@ligtas-ofw/core";
import { ExternalLinkIcon } from "../Icon";

/**
 * An Advisor KB answer, rendered verbatim with its source (ADR-0005).
 *
 * A posted notice rather than a banner: this is information, not adjudication, so it wears the
 * ink header band and never a verdict field. The model selected this entry; it did not write
 * it, which is why the source is a first-class action and not a footnote.
 */
export function KbAnswerCard({ entry }: { entry: KbEntry }) {
  return (
    <article className="tarp grommet relative bg-paper">
      <h3 className="border-b-2 border-ink bg-ink py-2.5 pl-9 pr-9 text-[0.95rem] font-bold leading-snug text-paper">
        {entry.topic}
      </h3>
      <div className="px-4 py-3.5">
        <KbAnswerBody answer={entry.answer} />
        <a
          href={entry.source}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 border-2 border-ink bg-tarp px-3 text-[0.85rem] font-bold text-ink transition-transform hover:-translate-y-px"
        >
          Tingnan ang sanggunian
          <ExternalLinkIcon size={15} />
        </a>
      </div>
    </article>
  );
}

const NUMBERED_STEP = /^\s*(\d+)\.\s+(.*)$/;

/**
 * Several KB entries are hand-written numbered procedures — how to file a DMW complaint, what to
 * do after being scammed. Rendering the whole answer as one `whitespace-pre-line` paragraph ran
 * those steps together into prose, which is the worst possible treatment for the one block a
 * frightened reader has to follow in order.
 *
 * Consecutive "N. " lines become a real ordered list with hanging indent; everything else stays
 * a paragraph. The entry text is still rendered verbatim — this only groups it.
 */
function KbAnswerBody({ answer }: { answer: string }) {
  const blocks: Array<{ kind: "text"; lines: string[] } | { kind: "steps"; items: string[] }> = [];

  for (const raw of answer.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const step = line.match(NUMBERED_STEP);
    const last = blocks.at(-1);

    if (step) {
      if (last?.kind === "steps") last.items.push(step[2]!);
      else blocks.push({ kind: "steps", items: [step[2]!] });
    } else if (last?.kind === "text") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "text", lines: [line] });
    }
  }

  return (
    <div className="space-y-3 text-[0.92rem] leading-relaxed text-ink">
      {blocks.map((block, index) =>
        block.kind === "steps" ? (
          <ol key={index} className="space-y-2 pl-1">
            {block.items.map((item, i) => (
              <li key={i} className="grid grid-cols-[1.6rem_1fr] items-start">
                <span className="font-bold tabular-nums text-ink-faint">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p key={index} className="whitespace-pre-line">
            {block.lines.join("\n")}
          </p>
        ),
      )}
    </div>
  );
}
