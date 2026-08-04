import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton, Archivo } from "next/font/google";
import { BANTATAY_NAME, BANTATAY_TAGLINE } from "@ligtas-ofw/core/copy";
import "./globals.css";

// The tarpaulin shout. Verdicts and the arrival line only — never body copy.
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

// Archivo was drawn for signage and high-performance print legibility, which is the same job
// a tarp does. Carries everything else, including the small tracked labels that used to be
// monospace.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BANTATAY_NAME} — LigtasOFW`,
  description: `${BANTATAY_TAGLINE} I-check ang recruitment agency sa listahan ng DMW, o suriin ang isang job post para sa mga senyales ng illegal recruitment.`,
};

export const viewport: Viewport = {
  themeColor: "#f5c518",
  viewportFit: "cover",
};

/**
 * The direction contract, emitted as a real HTML comment in the served markup.
 *
 * It has to be `dangerouslySetInnerHTML`: React strips JSX comments at compile time, so a
 * `{/* ... *\/}` block never reaches the build and a contract nobody can grep is a contract
 * nobody can audit.
 */
const DIRECTION_CONTRACT = `<!--
THESIS: A verdict is a community warning banner, not a chat reply. Refuses the AI-chat empty
state (centred avatar, greeting, suggestion chips, bottom composer) and its predictable
opposite, the navy government portal.
OWN-WORLD: Philippine large-format tarpaulin. Saturated CMYK fields - tarp yellow #F5C518,
risk #C8210F, caution #B4560A, verified #0E6B52 - on paper #FFF8EC. Anton at shouting scale
with a hard offset shadow; Archivo for everything else. Hard 2px ink keylines, 4px offset
block shadows, brass grommets. No monospace, no soft blur, no rounded corners.
STORY: Someone arrives mid-panic from a shared link with an agency name already in hand,
types it as the first and only act, and reads a verdict they can act on.
FIRST VIEWPORT: Full-bleed tarp yellow. One huge drop-shadowed line - BAGO KA MAGBAYAD,
ITANONG MO MUNA - with the input directly beneath it as the sole control, grommets pinning
the corners. No avatar, no greeting, no chips above the fold.
FORM: Tarpaulin Babala, candidate 3 of 7 grounded directions, seed key ee9257a1.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review,
the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fil" className={`${anton.variable} ${archivo.variable}`}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
