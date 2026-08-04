import type { ReactNode } from "react";
import { ImageIcon } from "../Icon";

/**
 * Speech in the tarpaulin world.
 *
 * The user's words are handwritten-on-tape: a tarp-yellow strip with a hard ink keyline.
 * Bantatay's words sit on plain paper. Neither is a soft rounded chat bubble — nothing in this
 * world has a soft edge, and the contrast with the verdict banner is the whole point: speech is
 * paper, adjudication is a printed field.
 */
export function UserMessage({ text, imageName }: { text?: string; imageName?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] border-2 border-ink bg-tarp px-3.5 py-2.5 text-[0.95rem] leading-relaxed text-ink shadow-[3px_3px_0_rgba(26,22,20,0.16)]">
        {imageName && (
          <p className="mb-1 flex items-center gap-1.5 text-[0.78rem] font-bold">
            <ImageIcon size={15} className="shrink-0" />
            <span className="truncate">{imageName}</span>
          </p>
        )}
        {text && <p className="whitespace-pre-wrap break-words font-medium">{text}</p>}
      </div>
    </div>
  );
}

export function BantatayMessage({ text, children }: { text?: string; children?: ReactNode }) {
  return (
    <div className="space-y-3">
      {text && (
        <div className="max-w-[92%]">
          <p className="whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-ink-soft">{text}</p>
        </div>
      )}
      {children}
    </div>
  );
}

/** The tarp flexing in wind while the engine works — not three bouncing dots. */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" aria-live="polite" aria-label="Sinusuri ni Bantatay">
      <span className="flap inline-block border-2 border-ink bg-tarp px-3 py-1.5 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-ink">
        Sinusuri…
      </span>
    </div>
  );
}
