import type { ReactNode } from "react";
import { BantatayAvatar } from "../BantatayAvatar";
import { ImageIcon } from "../Icon";

/**
 * One turn in the stream. User speech sits right and tight; Bantatay's sits left under the
 * avatar. Cards (records, KB answers) are passed as children and render full-width beneath
 * the spoken line — a verdict is never squeezed into a bubble.
 */
export function UserMessage({ text, imageName }: { text?: string; imageName?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-narra px-3.5 py-2.5 text-[0.925rem] leading-relaxed text-white">
        {imageName && (
          <p className="mb-1 flex items-center gap-1.5 text-[0.75rem] text-white/75">
            <ImageIcon size={14} className="shrink-0" />
            <span className="truncate">{imageName}</span>
          </p>
        )}
        {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
      </div>
    </div>
  );
}

export function BantatayMessage({ text, children }: { text?: string; children?: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <BantatayAvatar size={34} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2.5">
        {text && (
          <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-surface-raised px-3.5 py-2.5 text-[0.925rem] leading-relaxed text-ink shadow-[0_2px_6px_-2px_rgba(27,36,32,0.14)]">
            <p className="whitespace-pre-line break-words">{text}</p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5" aria-live="polite" aria-label="Nag-iisip si Bantatay">
      <BantatayAvatar size={34} className="mt-0.5 shrink-0" />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-surface-raised px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="thinking-dot h-1.5 w-1.5 rounded-full bg-ink-faint"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
