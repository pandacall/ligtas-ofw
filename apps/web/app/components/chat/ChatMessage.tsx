import type { ReactNode } from "react";
import { BantatayAvatar } from "../BantatayAvatar";
import { ImageIcon } from "../Icon";

/**
 * Speech in the tarpaulin world.
 *
 * Both sides get a real speech container and Bantatay gets an avatar, because this has to read
 * as a conversation at a glance — an earlier pass rendered Bantatay's words as bare paragraphs
 * with no container and no avatar, which turned the stream into a document feed. The tarpaulin
 * idea belongs to the *verdict*, not to the dialogue: a verdict is a printed record handed to
 * you, and speech is a note passed across the table.
 *
 * They stay hard-edged — 2px ink keylines, offset ink shadow, no rounded corners — so the world
 * holds. The user's words are on tarp-yellow tape, Bantatay's on paper.
 */
export function UserMessage({ text, imageName }: { text?: string; imageName?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] border-2 border-ink bg-tarp px-3.5 py-2.5 text-[0.95rem] leading-relaxed text-ink shadow-[3px_3px_0_var(--color-ink)]">
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

/**
 * Bantatay's turn: avatar, then a paper speech slip, then whatever cards the turn produced.
 *
 * Cards sit outside the slip and run full width — a verdict is not something Bantatay *says*,
 * it is a record the engine printed and Bantatay handed over.
 */
export function BantatayMessage({ text, children }: { text?: string; children?: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <BantatayAvatar size={34} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        {text && (
          <div className="max-w-[92%] border-2 border-ink bg-paper px-3.5 py-2.5 shadow-[3px_3px_0_var(--color-ink)]">
            <p className="whitespace-pre-line break-words text-[0.95rem] font-medium leading-relaxed text-ink">
              {text}
            </p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** The tarp flexing in wind while the engine works — not three bouncing dots. */
export function TypingIndicator() {
  return (
    <div className="flex gap-2.5" aria-live="polite" aria-label="Sinusuri ni Bantatay">
      <BantatayAvatar size={34} className="mt-0.5 shrink-0" />
      <span className="flap inline-block self-start border-2 border-ink bg-tarp px-3 py-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-ink shadow-[3px_3px_0_var(--color-ink)]">
        Sinusuri…
      </span>
    </div>
  );
}
