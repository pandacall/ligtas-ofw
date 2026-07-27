// Pure, zero-dependency date formatting shared by registry.ts and the mandatory footer.
// Kept in its own module (with its own package.json "exports" subpath) so client
// components can format dates without pulling in registry.ts's @ligtas-ofw/db import
// chain (pg needs Node builtins unavailable in the browser).
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
