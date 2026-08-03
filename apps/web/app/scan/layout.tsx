import type { ReactNode } from "react";

// Slow free-tier vision-LLM inference (ADR-0002) can run long — raise this route's
// function duration above the framework default. Vercel Hobby now defaults to 300s via
// Fluid Compute, but this stays explicit so a platform default change can't silently
// shrink it back down.
export const maxDuration = 60;

export default function ScanLayout({ children }: { children: ReactNode }) {
  return children;
}
