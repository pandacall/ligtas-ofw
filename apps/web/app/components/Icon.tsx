/**
 * The icon set. One family, 24px grid, 1.75 stroke, round caps — drawn rather than borrowed
 * from the emoji table, so weight and optical size stay consistent next to the type.
 *
 * The verdict marks (✅ ⚠️ 🚨) are deliberately NOT here: those are the product's own
 * vocabulary from CONTEXT.md, and they carry the verdict's meaning alongside colour so it
 * survives greyscale and colour-blindness. They are content, not iconography.
 */
type IconProps = { size?: number; className?: string };

function Svg({
  size = 20,
  className = "",
  strokeWidth = 1.75,
  children,
}: IconProps & { strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function PaperclipIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 11.5 12 20a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.9-7.8" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5" />
      <path d="m5.5 11.5 6.5-6.5 6.5 6.5" />
    </Svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m3.5 17 4.5-4.5a2 2 0 0 1 2.8 0l3.7 3.7" />
      <path d="m14 14.5 1.8-1.8a2 2 0 0 1 2.8 0l1.9 1.9" />
    </Svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 6.5 6.5 17.5" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 3.5h-2A2 2 0 0 0 3.5 5.7C4.2 12.6 11.4 19.8 18.3 20.5a2 2 0 0 0 2.2-2v-2a1.6 1.6 0 0 0-1.3-1.6l-2.7-.5a1.6 1.6 0 0 0-1.6.7l-.7 1a13.6 13.6 0 0 1-5.8-5.8l1-.7a1.6 1.6 0 0 0 .7-1.6l-.5-2.7A1.6 1.6 0 0 0 7.5 3.5Z" />
    </Svg>
  );
}

/*
 * Verdict marks, drawn in the same family as every other icon.
 *
 * These replace ✅ ⚠️ 🚨, which rendered as vendor colour emoji: rounded, gradient-shaded,
 * specular-highlighted 3D pictograms welded to the one component of a world that declares no
 * rounded corners and no soft blur. Meaning still never rides on the mark alone — the word and
 * the colour field ride with it.
 */
export function VerifiedMark(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.4}>
      <path d="M4 12.5 9.5 18 20 6.5" />
    </Svg>
  );
}

export function CautionMark(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.2}>
      <path d="M12 3.5 22 20.5H2Z" />
      <path d="M12 10v4.2" />
      <path d="M12 17.6v.1" />
    </Svg>
  );
}

export function RiskMark(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.2}>
      <path d="M5 19.5v-7a7 7 0 0 1 14 0v7Z" />
      <path d="M2.5 19.5h19" />
      <path d="M12 2.5v2" />
      <path d="M4 6 2.6 4.6" />
      <path d="M20 6l1.4-1.4" />
    </Svg>
  );
}
