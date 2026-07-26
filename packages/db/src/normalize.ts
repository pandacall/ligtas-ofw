/**
 * Shared name normalization for exact-match registry lookup (ADR-0001). Lives in db,
 * not core, because both core (query-side, checkAgency) and sync (storage-side,
 * seeding/ingestion) need it, and both are allowed to depend on db.
 */
export function normalizeAgencyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
