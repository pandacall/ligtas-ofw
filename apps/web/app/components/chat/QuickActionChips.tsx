"use client";

import type { QuickAction } from "@ligtas-ofw/core";

/**
 * Chips carry their intent explicitly, so they cost no LLM call (router.ts). That also makes
 * them the working path when the routing budget is spent.
 *
 * `scan_post` and `check_agency` need text, so they arm the composer rather than firing a turn.
 * The armed chip is now visibly and semantically pressed — the 2026-08-04 critique found that
 * tapping a chip produced no visible change at all, so first-timers tapped it repeatedly and
 * then left.
 */
export type ChipSpec = {
  action: QuickAction;
  label: string;
  /** Placeholder for the chips that need the user to type. */
  prompt?: string;
};

export const DEFAULT_CHIPS: ChipSpec[] = [
  { action: "check_agency", label: "I-check ang ahensya", prompt: "Pangalan ng ahensya…" },
  { action: "scan_post", label: "Suriin ang job post", prompt: "I-paste ang buong job post dito…" },
  { action: "what_to_do_if_scammed", label: "Na-scam ako" },
  { action: "hotlines", label: "Mga hotline" },
  { action: "about", label: "Ano ito?" },
];

export function QuickActionChips({
  chips = DEFAULT_CHIPS,
  onSelect,
  disabled = false,
  armed,
}: {
  chips?: ChipSpec[];
  onSelect: (chip: ChipSpec) => void;
  disabled?: boolean;
  /** The currently armed action, if any. */
  armed?: QuickAction;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isArmed = armed === chip.action;
        return (
          <button
            key={chip.action}
            type="button"
            disabled={disabled}
            aria-pressed={chip.prompt ? isArmed : undefined}
            onClick={() => onSelect(chip)}
            className={`min-h-[44px] border-2 border-ink px-3.5 text-[0.85rem] font-bold transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${
              isArmed
                ? "bg-ink text-paper shadow-[2px_2px_0_rgba(26,22,20,0.25)]"
                : "bg-paper text-ink shadow-[2px_2px_0_rgba(26,22,20,0.14)]"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
