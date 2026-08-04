/**
 * Trigram string similarity, modeled on Postgres's pg_trgm extension (ADR-0001: agency
 * lookup is exact-normalized, then pg_trgm fuzzy). checkAgency() (@ligtas-ofw/core) still
 * scores fuzzy matches in-app with this rather than a live SQL `similarity()` query against
 * the normalized_name column pg_trgm indexes in schema.ts — swapping to that real query is
 * tracked in issue #24.
 *
 * Uses the Dice coefficient rather than pg_trgm's literal Jaccard formula: Jaccard
 * under-scores a short abbreviated query against a long canonical name (e.g. "XYZ Intl
 * Placement" vs "XYZ International Placement Agency, Inc." scores 0.425 under Jaccard, below
 * the 0.55 auto-match threshold verdict-cases.md R4 requires), while Dice scores it 0.596.
 */
import { normalizeAgencyName } from "./normalize";

function trigramSet(value: string): Set<string> {
  // pg_trgm pads with two leading blanks and one trailing blank before extracting 3-grams.
  const padded = `  ${value} `;
  const grams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

export function trigramSimilarity(a: string, b: string): number {
  const setA = trigramSet(normalizeAgencyName(a));
  const setB = trigramSet(normalizeAgencyName(b));
  if (setA.size === 0 || setB.size === 0) return 0;

  let common = 0;
  for (const gram of setA) {
    if (setB.has(gram)) common++;
  }
  return (2 * common) / (setA.size + setB.size);
}
