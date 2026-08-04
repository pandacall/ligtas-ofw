"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ChatTurnResult, QuickAction } from "@ligtas-ofw/core";
import { BANTATAY_GREETING } from "@ligtas-ofw/core/copy";
import { chatTurnAction, type ChatActionState } from "../../actions/chat";
import { MAX_IMAGE_BYTES, type ImageValidationError } from "../../../lib/image-upload";
import { BantatayAvatar } from "../BantatayAvatar";
import { ResultCard } from "../ResultCard";
import { ScanResultCard } from "../ScanResultCard";
import { BantatayMessage, TypingIndicator, UserMessage } from "./ChatMessage";
import { Composer } from "./Composer";
import { DEFAULT_CHIPS, QuickActionChips, type ChipSpec } from "./QuickActionChips";
import { KbAnswerCard } from "./KbAnswerCard";

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

const FILE_ERROR_COPY: Record<ImageValidationError, string> = {
  unsupported_type: "Hindi suportado ang file type na ito. Gumamit ng PNG, JPEG, o WebP na screenshot.",
  too_large: `Masyadong malaki ang file (max ${MAX_IMAGE_MB}MB).`,
};

/**
 * Messages live in React state only and are never persisted server-side — people paste
 * contracts, salaries, and recruiter phone numbers in here, and none of that needs to
 * outlive the tab (ADR-0005).
 */
type NewMessage =
  | { role: "user"; text?: string; imageName?: string }
  | { role: "bantatay"; text?: string; turn?: ChatTurnResult; syncedAt?: Date; isError?: boolean };

// Intersection rather than repeating `id` per variant — Omit over a bare union would collapse
// to the keys they share.
type Message = NewMessage & { id: number };

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingChip, setPendingChip] = useState<ChipSpec | null>(null);
  const [isPending, startTransition] = useTransition();
  const nextId = useRef(0);
  const streamEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    streamEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  const append = useCallback((message: NewMessage) => {
    setMessages((current) => [...current, { ...message, id: nextId.current++ }]);
  }, []);

  const send = useCallback(
    (input: { text: string; image: File | null; action?: QuickAction }) => {
      append({ role: "user", text: input.text || undefined, imageName: input.image?.name });
      setPendingChip(null);

      const formData = new FormData();
      if (input.text) formData.set("text", input.text);
      if (input.image) formData.set("image", input.image);
      if (input.action) formData.set("action", input.action);

      startTransition(async () => {
        let state: ChatActionState;
        try {
          state = await chatTurnAction(null, formData);
        } catch {
          // Never guess an outcome on a transport failure — say so plainly.
          append({
            role: "bantatay",
            text: "May problema sa koneksyon. Pakisubukan ulit sa ilang sandali.",
            isError: true,
          });
          return;
        }

        if (state === null) return;
        if (state.kind === "file_error") {
          append({ role: "bantatay", text: FILE_ERROR_COPY[state.fileError], isError: true });
          return;
        }
        if (state.result.kind === "empty") return;

        append({ role: "bantatay", turn: state.result, syncedAt: state.syncedAt });
      });
    },
    [append],
  );

  function selectChip(chip: ChipSpec) {
    // Chips that need the user's text arm the composer; the rest fire immediately.
    if (chip.prompt) {
      setPendingChip(chip);
      return;
    }
    send({ text: "", image: null, action: chip.action });
  }

  const isFirstTurn = messages.length === 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />

      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4">
        {isFirstTurn ? (
          <Arrival onSelect={selectChip} />
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-5">
            {messages.map((message) =>
              message.role === "user" ? (
                <UserMessage key={message.id} text={message.text} imageName={message.imageName} />
              ) : (
                <BantatayTurn key={message.id} message={message} />
              ),
            )}

            {isPending && <TypingIndicator />}

            {!isPending && (
              <div className="pt-1">
                <QuickActionChips chips={DEFAULT_CHIPS} onSelect={selectChip} disabled={isPending} />
              </div>
            )}

            <div ref={streamEnd} />
          </div>
        )}
      </div>

      <Composer
        onSubmit={({ text, image }) => send({ text, image, action: pendingChip?.action })}
        disabled={isPending}
        placeholder={pendingChip?.prompt ?? "Magtanong, o i-paste ang job post…"}
        pendingAction={pendingChip?.label}
        onClearAction={() => setPendingChip(null)}
      />
    </div>
  );
}

/**
 * The arrival state. Centred rather than top-anchored, because on a phone the alternative is
 * a greeting stranded above two-thirds of empty screen.
 *
 * It also has to do real work: someone lands here already frightened, so the two things
 * worth saying immediately are what Bantatay can actually check and — because this tool is
 * not the DMW and must never be mistaken for it — where the official answer lives.
 */
function Arrival({ onSelect }: { onSelect: (chip: ChipSpec) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-6">
      <BantatayAvatar size={60} />
      <h1 className="mt-4 font-display text-[1.6rem] leading-tight font-bold tracking-[-0.02em] text-ink sm:text-3xl">
        Bago ka magbayad, itanong mo muna.
      </h1>
      <p className="mt-3 max-w-prose whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-soft">
        {BANTATAY_GREETING}
      </p>

      <div className="mt-6">
        <QuickActionChips chips={DEFAULT_CHIPS} onSelect={onSelect} />
      </div>

      <p className="mt-8 max-w-prose border-t border-hairline pt-4 text-[0.75rem] leading-relaxed text-ink-faint">
        Libre, walang account, at hindi nase-save ang usapan natin. Hindi ito opisyal na tool ng DMW —
        panimulang pagsusuri lang ito, kaya laging i-verify sa{" "}
        <a
          href="https://dmw.gov.ph"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-narra underline decoration-narra/35 underline-offset-2 hover:decoration-narra"
        >
          dmw.gov.ph
        </a>{" "}
        o sa DMW Hotline 1348 bago ka magdesisyon.
      </p>
    </div>
  );
}

function BantatayTurn({ message }: { message: Extract<Message, { role: "bantatay" }> }) {
  if (message.isError) {
    return (
      <BantatayMessage>
        <p className="rounded-2xl rounded-tl-sm bg-risk-wash px-3.5 py-2.5 text-[0.925rem] text-risk" role="alert">
          {message.text}
        </p>
      </BantatayMessage>
    );
  }

  const turn = message.turn;
  if (!turn) return <BantatayMessage text={message.text} />;

  switch (turn.kind) {
    case "advice":
      return (
        <BantatayMessage text={turn.reply || undefined}>
          {turn.entries.map((entry) => (
            <KbAnswerCard key={entry.id} entry={entry} />
          ))}
        </BantatayMessage>
      );

    case "agency_check":
      return (
        <BantatayMessage text={turn.reply || undefined}>
          <ResultCard result={turn.registry} query={turn.query} />
        </BantatayMessage>
      );

    case "scan":
      return (
        <BantatayMessage text={turn.reply || undefined}>
          <ScanResultCard result={turn.result} syncedAt={message.syncedAt ?? new Date()} />
        </BantatayMessage>
      );

    case "out_of_scope":
    case "router_unavailable":
      return <BantatayMessage text={turn.reply} />;

    case "empty":
      return null;
  }
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-surface/90 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <BantatayAvatar size={32} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-[1.05rem] font-bold leading-tight tracking-[-0.01em] text-ink">
              Bantatay
            </p>
            <p className="truncate text-[0.75rem] leading-tight text-ink-faint">
              Bantay mo sa recruitment, tulad ng tatay.
            </p>
          </div>
        </div>
        {/* The disclaimer is a standing legal requirement, not a footnote — it stays on screen. */}
        <p className="shrink-0 text-right text-[0.65rem] font-medium leading-tight text-ink-faint">
          Hindi opisyal
          <br />
          na DMW tool
        </p>
      </div>
    </header>
  );
}
