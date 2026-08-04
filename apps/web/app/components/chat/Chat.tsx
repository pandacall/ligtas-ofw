"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ChatTurnResult, QuickAction } from "@ligtas-ofw/core";
import { HISTORY_LIMIT, summarizeTurnResult, type ChatHistoryEntry } from "@ligtas-ofw/core/chat-history";
import { formatDate } from "@ligtas-ofw/core/format";
import { BANTATAY_GREETING } from "@ligtas-ofw/core/copy";
import { chatTurnAction, type ChatActionState } from "../../actions/chat";
import { MAX_IMAGE_BYTES, type ImageValidationError } from "../../../lib/image-upload";
import { ResultCard } from "../ResultCard";
import { ScanResultCard } from "../ScanResultCard";
import { Logo } from "../Logo";
import { BantatayMessage, TypingIndicator, UserMessage } from "./ChatMessage";
import { Composer, type ComposerHandle } from "./Composer";
import { DEFAULT_CHIPS, QuickActionChips, type ChipSpec } from "./QuickActionChips";
import { KbAnswerCard } from "./KbAnswerCard";

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

const FILE_ERROR_COPY: Record<ImageValidationError, string> = {
  unsupported_type: "Hindi suportado ang file type na ito. Gumamit ng PNG, JPEG, o WebP na screenshot.",
  too_large: `Masyadong malaki ang file (max ${MAX_IMAGE_MB}MB).`,
};

type NewMessage =
  | { role: "user"; text?: string; imageName?: string }
  | { role: "bantatay"; text?: string; turn?: ChatTurnResult; syncedAt?: Date; isError?: boolean };

type Message = NewMessage & { id: number };

export function Chat({ syncedAt }: { syncedAt?: Date }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingChip, setPendingChip] = useState<ChipSpec | null>(null);
  const [isPending, startTransition] = useTransition();
  const nextId = useRef(0);
  const streamEnd = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);

  useEffect(() => {
    streamEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  const append = useCallback((message: NewMessage) => {
    setMessages((current) => [...current, { ...message, id: nextId.current++ }]);
  }, []);

  const send = useCallback(
    (input: { text: string; image: File | null; action?: QuickAction }) => {
      const history = toHistory(messages);

      // Only render a user bubble when the user actually said something. A chip with no text
      // used to emit an empty 28x20 block with no content and no accessible name.
      if (input.text || input.image) {
        append({ role: "user", text: input.text || undefined, imageName: input.image?.name });
      }
      setPendingChip(null);

      const formData = new FormData();
      if (input.text) formData.set("text", input.text);
      if (input.image) formData.set("image", input.image);
      if (input.action) formData.set("action", input.action);
      if (history.length > 0) formData.set("history", JSON.stringify(history));

      startTransition(async () => {
        let state: ChatActionState;
        try {
          state = await chatTurnAction(null, formData);
        } catch {
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
    [append, messages],
  );

  function selectChip(chip: ChipSpec) {
    if (chip.prompt) {
      setPendingChip(chip);
      // Focusing the input is the feedback: it opens the keyboard on mobile and scrolls the
      // composer into view, so arming a chip visibly does something.
      requestAnimationFrame(() => composer.current?.focus());
      return;
    }
    send({ text: "", image: null, action: chip.action });
  }

  const isFirstTurn = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <Header />

      {/*
        One message stream, always. The opening greeting is Bantatay's first turn rather than a
        separate poster screen, and the composer is pinned from the very first paint — this has to
        read as a conversation the moment it loads, which an earlier full-viewport arrival did not.
        The tarpaulin idea lives in the banner above and in the verdict cards, not in replacing
        the dialogue with a landing page.
      */}
      <main
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Usapan kay Bantatay"
      >
        <TarpBanner syncedAt={syncedAt} />

        <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-4 sm:px-4 lg:max-w-3xl">
          <BantatayMessage text={BANTATAY_GREETING} />

          {messages.map((message) =>
            message.role === "user" ? (
              <UserMessage key={message.id} text={message.text} imageName={message.imageName} />
            ) : (
              <BantatayTurn key={message.id} message={message} />
            ),
          )}

          {isPending && <TypingIndicator />}

          {/* Suggested replies, sitting where a chat puts them: under the last turn. */}
          {!isPending && (
            <div className="pl-[2.65rem]">
              <QuickActionChips
                chips={DEFAULT_CHIPS}
                onSelect={selectChip}
                disabled={isPending}
                armed={pendingChip?.action}
              />
            </div>
          )}

          <div ref={streamEnd} />
        </div>
      </main>

      <Composer
        ref={composer}
        onSubmit={({ text, image }) => send({ text, image, action: pendingChip?.action })}
        disabled={isPending}
        placeholder={pendingChip?.prompt ?? "Pangalan ng ahensya, o i-paste ang job post…"}
        pendingAction={pendingChip?.label}
        onClearAction={() => setPendingChip(null)}
      />
    </div>
  );
}

/**
 * The tarp, now a banner at the top of the conversation rather than a full screen.
 *
 * It still carries the shout and the standing facts — the freshness stamp is this product's core
 * trust claim — but it scrolls away with the stream instead of standing between the user and the
 * input. Someone arriving mid-panic sees the promise, the greeting, and the field together.
 */
/** A stamped fact on the tarp: tracked label above its value. */
function TarpFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {/* ink/80 measures 6.9:1 on tarp yellow; ink/60 was 3.96:1 and failed AA. */}
      <dt className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink/80">{label}</dt>
      <dd className="mt-0.5 text-[0.85rem] font-bold text-ink">{children}</dd>
    </div>
  );
}

function TarpBanner({ syncedAt }: { syncedAt?: Date }) {
  return (
    <section className="stock halftone grommet relative shrink-0 border-b-2 border-ink bg-tarp px-4 pb-3 pt-4 sm:px-8 sm:pb-4 sm:pt-6">
      <div className="relative z-1 mx-auto w-full max-w-2xl lg:max-w-3xl">
        <p className="shout misregister max-w-[18ch] text-[clamp(1.45rem,6.2vw,2.6rem)] leading-[0.96] text-ink">
          Bago ka magbayad, itanong mo muna.
        </p>
        <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-t-2 border-ink/25 pt-2">
          <TarpFact label="Bayad">Libre, walang account</TarpFact>
          <div className="hidden min-[360px]:block">
            <TarpFact label="Listahan ng DMW">
              {syncedAt ? `As of ${formatDate(syncedAt)}` : "Sinusuri kada gabi"}
            </TarpFact>
          </div>
          <TarpFact label="DMW Hotline">
            <a href="tel:1348" className="underline decoration-2 underline-offset-2">
              1348
            </a>
          </TarpFact>
        </dl>
      </div>
    </section>
  );
}

/**
 * Builds the digest sent with the next request so a follow-up like "oo" has a referent
 * (ADR-0005). Derived from `messages` rather than kept as separate state, so what the Router
 * sees can never drift from what the user is looking at.
 */
function toHistory(messages: Message[]): ChatHistoryEntry[] {
  const entries: ChatHistoryEntry[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      const content = message.text ?? (message.imageName ? "sent a screenshot of a job post" : "");
      if (content) entries.push({ role: "user", content });
      continue;
    }
    if (message.isError || !message.turn) continue;
    const summary = summarizeTurnResult(message.turn);
    if (summary) entries.push({ role: "bantatay", content: summary });
  }
  return entries.slice(-HISTORY_LIMIT);
}


function BantatayTurn({ message }: { message: Extract<Message, { role: "bantatay" }> }) {
  if (message.isError) {
    return (
      <div className="border-2 border-risk bg-risk/10 p-3" role="alert">
        <p className="text-[0.92rem] font-medium text-ink">{message.text}</p>
      </div>
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

/**
 * The header carries the standing "not the DMW" disclaimer, which is a legal requirement rather
 * than a footnote. On arrival it stays out of the way of the shout; once the conversation
 * starts it holds the only persistent h1 the page has.
 */
function Header() {
  return (
    <header className="shrink-0 border-b-2 border-ink bg-ink px-3 py-2 text-tarp sm:px-4">
      <div className="mx-auto flex max-w-2xl items-center lg:max-w-3xl">
        <h1>
          <Logo />
          <span className="sr-only">LigtasOFW — Bantatay</span>
        </h1>
      </div>
    </header>
  );
}
