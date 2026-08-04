"use client";

import type { QuickAction } from "@ligtas-ofw/core";

/**
 * Chips carry their intent explicitly, so they cost no LLM call (router.ts). That also makes
 * them the working path when the routing budget is spent — which is why the
 * router_unavailable message points back here.
 *
 * `scan_post` and `check_agency` need text, so they focus the composer with a prompt rather
 * than firing a turn on their own.
 */
export type ChipSpec = {
  action: QuickAction;
  label: string;
  /** Placeholder to put in the composer for the chips that need the user to type. */
  prompt?: string;
};

export const DEFAULT_CHIPS: ChipSpec[] = [
  { action: "check_agency", label: "I-check ang ahensya", prompt: "Ipasok ang pangalan ng ahensya…" },
  { action: "scan_post", label: "Suriin ang job post", prompt: "I-paste ang buong job post dito…" },
  { action: "what_to_do_if_scammed", label: "Na-scam ako" },
  { action: "hotlines", label: "Mga hotline" },
  { action: "about", label: "Ano ito?" },
];

export function QuickActionChips({
  chips = DEFAULT_CHIPS,
  onSelect,
  disabled = false,
}: {
  chips?: ChipSpec[];
  onSelect: (chip: ChipSpec) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.action}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip)}
          className="rounded-full border border-hairline bg-surface-raised px-3.5 py-1.5 text-[0.8rem] font-medium text-ink-soft transition-colors hover:border-narra hover:text-narra disabled:cursor-not-allowed disabled:opacity-50"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
