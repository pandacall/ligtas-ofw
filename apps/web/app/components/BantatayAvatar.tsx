/**
 * Bantatay — the guardian dog.
 *
 * Named for the Filipino series where a father dies and returns as a dog to keep watching over
 * his family, which is exactly this product's promise: something that stays beside you and barks
 * before you hand over money. *Bantay* (to guard) with *tatay* (father) inside it.
 *
 * Drawn as a flat spot-colour stencil, the way a tarpaulin shop would cut it — hard ink keyline,
 * no gradient, no shading, no perspective. Deliberate on two counts: a screen-printed banner
 * contains no soft rendering, and a shaded SVG pretending to be a photograph is the surest tell
 * of machine-made design. This is geometry, and it holds at 34px on a cheap phone.
 *
 * Ears sit low and wide and the snout projects past the skull. Those two things are what read as
 * a dog rather than a cat at small sizes.
 */
export function BantatayAvatar({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Bantatay"
    >
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        fill="var(--color-tarp)"
        stroke="var(--color-ink)"
        strokeWidth="3"
      />

      {/* Ears — low, wide, alert */}
      <path d="M12.5 15.5 7.5 6.5l10 4.5Z" fill="var(--color-ink)" />
      <path d="M35.5 15.5 40.5 6.5l-10 4.5Z" fill="var(--color-ink)" />

      {/* Skull and snout as one silhouette */}
      <path
        d="M24 9.5c7.6 0 13 5.3 13 12.4 0 3.1-.7 5.5-2 7.5-1 1.5-1.5 2.4-1.7 4.1-.5 3.2-3.9 5.7-9.3 5.7s-8.8-2.5-9.3-5.7c-.2-1.7-.7-2.6-1.7-4.1-1.3-2-2-4.4-2-7.5C11 14.8 16.4 9.5 24 9.5Z"
        fill="var(--color-ink)"
      />

      {/* Eyes */}
      <circle cx="18.1" cy="21.4" r="2.5" fill="var(--color-paper)" />
      <circle cx="29.9" cy="21.4" r="2.5" fill="var(--color-paper)" />

      {/* Snout */}
      <ellipse cx="24" cy="31.6" rx="6.1" ry="4.4" fill="var(--color-paper)" />
      <ellipse cx="24" cy="29.6" rx="2.5" ry="1.9" fill="var(--color-ink)" />
      <path
        d="M24 31.4v1.9M24 33.3c-.9.9-2.5.8-3-.3M24 33.3c.9.9 2.5.8 3-.3"
        stroke="var(--color-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
