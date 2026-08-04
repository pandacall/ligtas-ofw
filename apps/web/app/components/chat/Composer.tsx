"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_IMAGE_BYTES } from "../../../lib/image-upload";
import { CloseIcon, ImageIcon, PaperclipIcon, SendIcon } from "../Icon";

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

/**
 * The composer: a growing textarea, a screenshot attach, and send.
 *
 * Pinned to the bottom with safe-area padding — most users are on a phone, and the thing
 * they came to do is paste something. Enter sends, Shift+Enter breaks the line, and the
 * textarea grows to a cap so a long pasted job post stays readable while typing.
 */
export function Composer({
  onSubmit,
  disabled,
  placeholder,
  pendingAction,
  onClearAction,
}: {
  onSubmit: (input: { text: string; image: File | null }) => void;
  disabled: boolean;
  placeholder: string;
  /** Label of the chip that armed the composer, shown as a removable tag. */
  pendingAction?: string;
  onClearAction: () => void;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Grow with content, up to ~8 lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  const canSend = !disabled && (text.trim().length > 0 || image !== null);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSubmit({ text: text.trim(), image });
    setText("");
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      onSubmit={submit}
      className="border-t border-hairline bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-4"
    >
      {(pendingAction || image) && (
        <div className="mx-auto mb-2 flex max-w-2xl flex-wrap gap-2">
          {pendingAction && (
            <button
              type="button"
              onClick={onClearAction}
              className="inline-flex items-center gap-1.5 rounded-full bg-narra-soft py-1 pl-3 pr-2 text-[0.75rem] font-semibold text-narra transition-colors hover:bg-narra/15"
            >
              {pendingAction}
              <CloseIcon size={14} />
              <span className="sr-only">Alisin</span>
            </button>
          )}
          {image && (
            <button
              type="button"
              onClick={() => {
                setImage(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-narra-soft py-1 pl-2.5 pr-2 text-[0.75rem] font-medium text-narra transition-colors hover:bg-narra/15"
            >
              <ImageIcon size={14} className="shrink-0" />
              <span className="truncate">{image.name}</span>
              <CloseIcon size={14} className="shrink-0" />
              <span className="sr-only">Alisin ang larawan</span>
            </button>
          )}
        </div>
      )}

      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-hairline bg-surface-raised p-1.5 focus-within:border-narra">
        <label className="cursor-pointer rounded-xl p-2 text-ink-faint transition-colors hover:bg-narra-soft hover:text-narra has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-narra">
          <PaperclipIcon size={20} />
          <span className="sr-only">Mag-attach ng screenshot (max {MAX_IMAGE_MB}MB)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
        </label>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-[180px] flex-1 resize-none bg-transparent py-2 text-[0.925rem] leading-relaxed text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
          aria-label="Mensahe kay Bantatay"
        />

        <button
          type="submit"
          disabled={!canSend}
          className="rounded-xl bg-narra p-2 text-white transition-colors hover:bg-narra-bright disabled:cursor-not-allowed disabled:bg-ink-faint/40"
        >
          <SendIcon size={20} />
          <span className="sr-only">Ipadala</span>
        </button>
      </div>
    </form>
  );
}
