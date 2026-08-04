/**
 * Bantatay — Bantay (guardian) + Tatay (father).
 *
 * Drawn as a figure under a salakot, the wide-brimmed Filipino farmer's hat. It reads
 * instantly to the audience, and it is literally a thing that shelters you — which is the
 * whole promise of the persona. Kept to flat shapes so it stays crisp at 32px on a cheap
 * screen and costs nothing to load.
 */
export function BantatayAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
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
      <circle cx="24" cy="24" r="24" fill="var(--color-narra-soft)" />
      {/* Shoulders */}
      <path d="M9 48c0-8.5 6.7-13.5 15-13.5S39 39.5 39 48H9Z" fill="var(--color-narra)" />
      {/* Face */}
      <ellipse cx="24" cy="25.5" rx="8.5" ry="9" fill="#e8bd9a" />
      {/* Salakot brim */}
      <path
        d="M6.5 19.5c0-1.2 1-2 2.2-2h30.6c1.2 0 2.2.8 2.2 2 0 1.3-1 2.2-2.2 2.2H8.7c-1.2 0-2.2-.9-2.2-2.2Z"
        fill="var(--color-narra)"
      />
      {/* Salakot crown */}
      <path d="M24 5.5c5.2 0 9.6 5.1 11 12H13c1.4-6.9 5.8-12 11-12Z" fill="var(--color-narra-bright)" />
      {/* Crown seam — the woven ridge of a real salakot */}
      <path d="M24 5.5v12" stroke="var(--color-narra)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="20.8" cy="25" r="1.5" fill="var(--color-ink)" />
      <circle cx="27.2" cy="25" r="1.5" fill="var(--color-ink)" />
      {/* A small, steady smile — reassuring, not cheerful. */}
      <path
        d="M21 29.5c.9.9 4.1.9 5 0"
        stroke="var(--color-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
