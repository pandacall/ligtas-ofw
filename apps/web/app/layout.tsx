import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { BANTATAY_NAME, BANTATAY_TAGLINE } from "@ligtas-ofw/core/copy";
import "./globals.css";

// Display: carries the persona's voice and the verdict stamps.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Body: drawn for plain-language legibility at small sizes, which is the whole job here —
// long Taglish paragraphs read on cheap phone screens.
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

// Utility: record fields, license numbers, dates, evidence excerpts.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BANTATAY_NAME} — LigtasOFW`,
  description: `${BANTATAY_TAGLINE} I-check ang recruitment agency sa listahan ng DMW, o suriin ang isang job post para sa mga senyales ng illegal recruitment.`,
};

export const viewport: Viewport = {
  themeColor: "#eef1ee",
  // Most users arrive on a phone; the composer sits against the bottom edge.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fil" className={`${bricolage.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
