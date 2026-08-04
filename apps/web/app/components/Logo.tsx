/**
 * The LigtasOFW mark and lockup.
 *
 * The mark is Bantatay's head cut as a single flat stencil — one path group, `currentColor`, no
 * frame — so it prints on ink, on tarp yellow, or on paper without a variant. That is how a
 * tarpaulin shop would actually hold a logo: one stencil, any ink.
 *
 * Ears deliberately break the head's silhouette rather than sitting inside a containing shape.
 * At 20px that's what still reads as a dog rather than a blob.
 */
export function BantatayMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/*
        Ears sit low and wide rather than tall and centred, and the snout projects past the
        skull — the two things that separate a dog from a cat at 20px. An earlier version had
        tall pointed ears over a round muzzle and read unmistakably feline.
      */}
      <path d="M12.5 14.5 7.5 6l10 4.5Z" />
      <path d="M35.5 14.5 40.5 6l-10 4.5Z" />
      {/* Skull and snout as one silhouette, with eyes and muzzle knocked out */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 9c7.7 0 13.2 5.4 13.2 12.6 0 3.2-.7 5.6-2 7.6-1 1.5-1.5 2.4-1.8 4.2-.5 3.3-3.9 5.8-9.4 5.8s-8.9-2.5-9.4-5.8c-.3-1.8-.8-2.7-1.8-4.2-1.3-2-2-4.4-2-7.6C10.8 14.4 16.3 9 24 9Zm-5.9 9.9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm11.8 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM24 27.4c-3.4 0-6.1 2-6.1 4.5s2.7 4.1 6.1 4.1 6.1-1.6 6.1-4.1-2.7-4.5-6.1-4.5Z"
      />
      {/* Nose, in the knocked-out snout */}
      <ellipse cx="24" cy="30.6" rx="2.5" ry="1.9" />
    </svg>
  );
}

/**
 * The lockup: mark, wordmark, and the persona name as a tracked kicker beneath.
 *
 * "LigtasOFW" is the product; "Bantatay" is who answers. Keeping both visible means the name a
 * user was told in a Facebook group and the name that replies to them are the same thing.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BantatayMark size={26} className="shrink-0" />
      <span className="leading-none">
        <span className="shout block text-[1.15rem] leading-none">LigtasOFW</span>
        <span className="mt-0.5 block font-sans text-[0.55rem] font-bold uppercase tracking-[0.22em] opacity-75">
          Bantatay
        </span>
      </span>
    </span>
  );
}
