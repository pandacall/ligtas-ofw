// Mechanically enforces that packages/core has zero Next.js/HTTP imports
// and no dependencies beyond @ligtas-ofw/db. Run via `npm test` (wired as
// the root `pretest` script) and in CI.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CORE_DIR = "packages/core";
const ALLOWED_CORE_DEPS = ["@ligtas-ofw/db"];
const BANNED_PREFIXES = ["next", "http", "https", "node:http", "node:https", "express"];

const IMPORT_PATTERN = /(?:import\s*\(|import\s+(?:[^"'()]*?\s+from\s+)?|require\()\s*["']([^"']+)["']/g;

function isBanned(specifier: string): boolean {
  return BANNED_PREFIXES.some(
    (prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
  );
}

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkTsFiles(fullPath));
    } else if (/\.tsx?$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkDependencies(): string[] {
  const pkgPath = join(CORE_DIR, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps: Record<string, string> = pkg.dependencies ?? {};
  return Object.keys(deps)
    .filter((dep) => !ALLOWED_CORE_DEPS.includes(dep))
    .map((dep) => `${pkgPath}: disallowed dependency "${dep}" (core may only depend on ${ALLOWED_CORE_DEPS.join(", ")})`);
}

function checkImports(): string[] {
  const violations: string[] = [];
  const srcDir = join(CORE_DIR, "src");
  for (const file of walkTsFiles(srcDir)) {
    const contents = readFileSync(file, "utf-8");
    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(IMPORT_PATTERN)) {
        const specifier = match[1];
        if (specifier && isBanned(specifier)) {
          violations.push(`${relative(".", file)}:${index + 1} — banned import "${specifier}"`);
        }
      }
    });
  }
  return violations;
}

const violations = [...checkDependencies(), ...checkImports()];

if (violations.length > 0) {
  console.error("core boundary violated:");
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log("core boundary OK");
process.exit(0);
