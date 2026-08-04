/**
 * Bantatay — Bantay (guardian) + Tatay (father).
 *
 * Drawn the way a tarpaulin prints a figure: flat spot colours, a hard ink keyline, no
 * gradients and no soft shading. The salakot reads instantly to this audience and is literally
 * a thing that shelters you.
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
      <rect x="1.5" y="1.5" width="45" height="45" fill="var(--color-tarp)" stroke="var(--color-ink)" strokeWidth="3" />
      {/* Shoulders */}
      <path d="M8 46.5c0-8 7.2-12.5 16-12.5s16 4.5 16 12.5" fill="var(--color-ink)" />
      {/* Face */}
      <ellipse cx="24" cy="25" rx="8.5" ry="9" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.5" />
      {/* Salakot brim — the shelter */}
      <path
        d="M5 19.5h38"
        stroke="var(--color-ink)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Salakot crown */}
      <path d="M24 6c5.4 0 10 5.4 11.4 12.5H12.6C14 11.4 18.6 6 24 6Z" fill="var(--color-ink)" />
      {/* Eyes */}
      <circle cx="20.8" cy="25" r="1.7" fill="var(--color-ink)" />
      <circle cx="27.2" cy="25" r="1.7" fill="var(--color-ink)" />
      {/* A steady mouth — reassuring, not cheerful */}
      <path d="M20.8 29.8c1.2 1.1 5.2 1.1 6.4 0" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
