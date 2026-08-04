"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ChatTurnResult, QuickAction } from "@ligtas-ofw/core";
import { HISTORY_LIMIT, summarizeTurnResult, type ChatHistoryEntry } from "@ligtas-ofw/core/chat-history";
import { formatDate } from "@ligtas-ofw/core/format";
import { chatTurnAction, type ChatActionState } from "../../actions/chat";
import { MAX_IMAGE_BYTES, type ImageValidationError } from "../../../lib/image-upload";
import { ResultCard } from "../ResultCard";
import { ScanResultCard } from "../ScanResultCard";
import { BantatayAvatar } from "../BantatayAvatar";
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

  const composerEl = (
    <Composer
      ref={composer}
      onSubmit={({ text, image }) => send({ text, image, action: pendingChip?.action })}
      disabled={isPending}
      placeholder={pendingChip?.prompt ?? "Pangalan ng ahensya, o i-paste ang job post…"}
      pendingAction={pendingChip?.label}
      onClearAction={() => setPendingChip(null)}
      onTarp={isFirstTurn}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <Header compact={!isFirstTurn} />

      <main className="flex flex-1 flex-col overflow-y-auto">
        {isFirstTurn ? (
          <Arrival onSelect={selectChip} armed={pendingChip?.action} composer={composerEl} syncedAt={syncedAt} />
        ) : (
          <div
            className="mx-auto w-full max-w-2xl space-y-6 px-3 py-5 sm:px-4 lg:max-w-4xl lg:px-0 lg:py-8"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Usapan kay Bantatay"
          >
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
        )}
      </main>

      {/* Once the conversation starts the composer pins to the bottom, in the thumb zone. On
          arrival it lives inside the tarp instead — see Arrival. */}
      {!isFirstTurn && composerEl}
    </div>
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

/** A stamped fact on the tarp's lower matter: tracked label above its value. */
function TarpFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {/*
        ink/80 at 0.68rem measures 6.9:1 on tarp yellow. The first pass used ink/60 at 0.6rem,
        which is 3.96:1 — under AA, at 9.6px, on the brightest field in the product, for people
        reading in daylight. The ink-faint token is measured against paper, not against yellow,
        so it cannot be reused here.
      */}
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/80">{label}</dt>
      <dd className="mt-0.5 text-[0.88rem] font-bold text-ink">{children}</dd>
    </div>
  );
}

function Arrival({
  onSelect,
  armed,
  composer,
  syncedAt,
}: {
  onSelect: (chip: ChipSpec) => void;
  armed?: QuickAction;
  composer: React.ReactNode;
  syncedAt?: Date;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/*
        The whole first viewport is one tarp: the shout owns the upper field, the input sits
        against the bottom edge, and everything else falls below the fold by construction rather
        than by luck. The composer lives HERE on arrival rather than pinned to the window bottom —
        an earlier version put the avatar, greeting and chip row above the fold with a
        bottom-pinned input, which is the AI-chat empty state this direction exists to refuse.

        `justify-between` closes the dead lower half that a top-anchored full-height section left
        behind, and puts the one control in the thumb zone. `dvh` so an open mobile keyboard
        shrinks it correctly.

        The headline is set to fill the field, not to fit a line — a tarpaulin is mostly type, and
        a polite headline in a full-viewport yellow section reads as an empty rectangle with a
        sentence in it. It wraps naturally, so one clamp covers 320 through 1440.
      */}
      <section className="stock halftone grommet relative flex min-h-[calc(100dvh-3.25rem)] flex-col justify-between border-b-2 border-ink bg-tarp px-4 pb-9 pt-[7vh] sm:px-8">
        <div className="relative z-1 mx-auto w-full max-w-2xl lg:max-w-5xl">
          <h1 className="shout misregister max-w-[16ch] text-[clamp(3.1rem,15vw,7rem)] leading-[0.96] text-ink lg:text-[clamp(7rem,9.5vw,9.5rem)]">
            Bago ka magbayad, itanong mo muna.
          </h1>
          <p className="mt-5 max-w-xl text-[0.95rem] font-medium leading-relaxed text-ink sm:text-[1.05rem] lg:text-[1.2rem]">
            Ilagay ang pangalan ng recruitment agency, o i-paste ang job post.
          </p>
        </div>

        <div className="relative z-1 mx-auto mt-8 w-full max-w-2xl lg:max-w-5xl">
          {composer}
          {/*
            The field's lower matter, and the reason it is no longer empty. A barangay notice
            always carries what it is and who to call; here that doubles as this product's core
            trust claim — the registry is a dated local copy, and the freshness stamp is the
            product ("cache is the product"). Rendered without the stamp when the registry can't
            be reached, so the homepage never fails on a database round-trip.
          */}
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-ink/25 pt-4 sm:grid-cols-4">
            <TarpFact label="Bayad">Libre, walang account</TarpFact>
            <TarpFact label="Usapan">Hindi nase-save</TarpFact>
            <TarpFact label="Listahan ng DMW">
              {syncedAt ? `As of ${formatDate(syncedAt)}` : "Sinusuri kada gabi"}
            </TarpFact>
            <TarpFact label="DMW Hotline">
              <a href="tel:1348" className="underline decoration-2 underline-offset-2">
                1348
              </a>
            </TarpFact>
          </dl>
        </div>
      </section>

      {/* Everything below the fold, for the smaller number of people who came to understand
          rather than to check. */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-5 lg:max-w-5xl">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-faint">O pumili dito</p>
        <div className="mt-3">
          <QuickActionChips chips={DEFAULT_CHIPS} onSelect={onSelect} armed={armed} />
        </div>

        <div className="mt-8 flex items-start gap-3 border-t-2 border-dashed border-paper-edge pt-5">
          <BantatayAvatar size={44} className="shrink-0" />
          <p className="max-w-prose text-[0.8rem] leading-relaxed text-ink-soft">
            Ako si <strong className="font-bold text-ink">Bantatay</strong>. Libre ito, walang account, at hindi
            nase-save ang usapan natin. Hindi ito opisyal na tool ng DMW — panimulang pagsusuri lang, kaya laging
            i-verify sa{" "}
            <a
              href="https://dmw.gov.ph"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-ink underline decoration-2 underline-offset-2"
            >
              dmw.gov.ph
            </a>{" "}
            o sa DMW Hotline{" "}
            <a href="tel:1348" className="font-bold text-ink underline decoration-2 underline-offset-2">
              1348
            </a>{" "}
            bago ka magdesisyon.
          </p>
        </div>
      </div>
    </div>
  );
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
function Header({ compact }: { compact: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b-2 border-ink bg-ink px-3 py-2 sm:px-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        {compact ? (
          <h1 className="shout text-[1.05rem] leading-none text-tarp">
            LigtasOFW
            <span className="ml-2 font-sans text-[0.62rem] font-bold uppercase tracking-[0.14em] text-paper/70">
              Bantatay
            </span>
          </h1>
        ) : (
          <p className="shout text-[1.05rem] leading-none text-tarp">
            LigtasOFW
            <span className="ml-2 font-sans text-[0.62rem] font-bold uppercase tracking-[0.14em] text-paper/70">
              Bantatay
            </span>
          </p>
        )}
        <p className="shrink-0 text-right text-[0.62rem] font-bold uppercase leading-tight tracking-[0.06em] text-paper/80">
          Hindi opisyal
          <br />
          na DMW tool
        </p>
      </div>
    </header>
  );
}
