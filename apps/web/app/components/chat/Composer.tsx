"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from "react";
import { MAX_IMAGE_BYTES } from "../../../lib/image-upload";
import { CloseIcon, ImageIcon, PaperclipIcon, SendIcon } from "../Icon";

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

export type ComposerHandle = { focus: () => void };

/**
 * Real things a user might type, cycled as a typing animation in the placeholder.
 *
 * A static "Pangalan ng ahensya, o i-paste ang job post…" tells someone the categories but not
 * what a query actually looks like. These are shaped like the four things the product can do —
 * a conversational agency question, a bare registry name, a rules question, and the
 * after-the-fact case — so a first-timer can see the register as well as the topic.
 */
const EXAMPLE_QUERIES = [
  "legit ba ang Golden Star Manpower?",
  "1010 EPHESIANS HUMAN RESOURCES INC",
  "magkano ang legal na placement fee?",
  "na-scam ako, ano ang gagawin ko?",
];

const TYPE_MS = 55;
const ERASE_MS = 28;
const HOLD_MS = 1700;

/**
 * Types an example, holds it, erases it, moves to the next.
 *
 * Stops permanently the moment the user engages — focus, a keystroke, an attached image, or an
 * armed chip — because an animating placeholder under a cursor is a distraction, not a hint.
 * Under `prefers-reduced-motion` it renders the first example statically instead: the teaching
 * value is in the example itself, not the motion.
 */
function useTypedPlaceholder(active: boolean): string {
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(reduced ? EXAMPLE_QUERIES[0]! : "");

  useEffect(() => {
    if (!active || reduced) return;

    let phrase = 0;
    let chars = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const full = EXAMPLE_QUERIES[phrase]!;
      if (!erasing) {
        chars += 1;
        setShown(full.slice(0, chars));
        if (chars === full.length) {
          erasing = true;
          timer = setTimeout(step, HOLD_MS);
          return;
        }
      } else {
        chars -= 1;
        setShown(full.slice(0, chars));
        if (chars === 0) {
          erasing = false;
          phrase = (phrase + 1) % EXAMPLE_QUERIES.length;
        }
      }
      timer = setTimeout(step, erasing ? ERASE_MS : TYPE_MS);
    };

    timer = setTimeout(step, 600);
    return () => clearTimeout(timer);
  }, [active, reduced]);

  return shown;
}

/**
 * The input. In this world it is the tarp's own form field: a hard-keylined box on paper, with
 * a solid ink send block.
 *
 * Three fixes from the 2026-08-04 critique are built in: every control clears 44px (chips and
 * icon buttons measured 34.5 and 36), the textarea has a real focus ring (it was the only
 * focusable control with `outline-none`), and the parent can focus it programmatically so
 * arming a chip opens the keyboard instead of appearing to do nothing.
 */
export const Composer = forwardRef<ComposerHandle, {
  onSubmit: (input: { text: string; image: File | null }) => void;
  disabled: boolean;
  placeholder: string;
  pendingAction?: string;
  onClearAction: () => void;
  /** On arrival the composer sits inside the tarp field, so it drops its own chrome. */
  onTarp?: boolean;
}>(function Composer({ onSubmit, disabled, placeholder, pendingAction, onClearAction, onTarp = false }, ref) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [engaged, setEngaged] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The demo runs only while the field is genuinely untouched and nothing else is pending.
  const demoActive = !engaged && !text && !image && !pendingAction && !disabled;
  const typed = useTypedPlaceholder(demoActive);

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

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
      className={
        onTarp
          ? ""
          : "border-t-2 border-ink bg-tarp px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4"
      }
    >
      {/* Pinned at the bottom it centres itself; inside the tarp it inherits that column. */}
      <div className={onTarp ? "" : "mx-auto w-full max-w-2xl"}>
      {(pendingAction || image) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingAction && (
            <button
              type="button"
              onClick={onClearAction}
              className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-ink bg-ink py-1 pl-3 pr-2 text-[0.78rem] font-bold text-paper"
            >
              {pendingAction}
              <CloseIcon size={15} />
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
              className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 border-2 border-ink bg-paper py-1 pl-2.5 pr-2 text-[0.78rem] font-bold text-ink"
            >
              <ImageIcon size={15} className="shrink-0" />
              <span className="truncate">{image.name}</span>
              <CloseIcon size={15} className="shrink-0" />
              <span className="sr-only">Alisin ang larawan</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-ink bg-paper text-ink transition-transform hover:-translate-y-px has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
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
          // An armed chip's own prompt always wins; otherwise the demo types real examples until
          // the user engages, then settles on the plain hint.
          placeholder={pendingAction ? placeholder : demoActive ? `${typed}|` : placeholder}
          onFocus={() => setEngaged(true)}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-[180px] min-h-[44px] flex-1 resize-none border-2 border-ink bg-paper px-3 py-2.5 text-[0.95rem] font-medium leading-relaxed text-ink placeholder:font-normal placeholder:text-ink-faint focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
          aria-label="Mensahe kay Bantatay"
        />

        {/*
          Disabled reads as an empty box on the tarp rather than a dimmed ink block: ink at
          reduced alpha over yellow renders as a muddy olive that looks broken, not inactive.
        */}
        <button
          type="submit"
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-ink text-paper transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink/35"
        >
          <SendIcon size={20} />
          <span className="sr-only">Ipadala</span>
        </button>
      </div>
      </div>
    </form>
  );
});
