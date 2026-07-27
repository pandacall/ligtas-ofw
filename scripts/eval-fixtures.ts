// CI eval harness (issue #10 / ADR-0003 "measure first"): runs every fixture in
// starter/fixtures-posts.json through the real Extractor (temperature 0) and the real
// verdict engine, gates on >=90% post-verdict accuracy, and reports (non-gating)
// flag precision/recall, extraction-field accuracy, and evidence-substring violations.
// One full run = 20 requests against OpenRouter's free-tier 50/day cap (ADR-0003),
// up to 40 if any fixture triggers the retry-once-on-failure wrapper (scan.ts).
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { flattenFixtures, runFixtureEval } from "@ligtas-ofw/core";
import type { EvalFixtureFile, EvalReport } from "@ligtas-ofw/core";
import { createOpenRouterExtractorClient } from "../apps/web/lib/extractor-client";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function formatReport(report: EvalReport): string {
  const lines: string[] = [];
  for (const grade of report.grades) {
    const status = grade.verdictMatch ? "PASS" : "FAIL";
    lines.push(`[${status}] ${grade.id}: expected=${grade.expectedVerdict} actual=${grade.actualVerdict}`);
  }

  const pct = (report.accuracy * 100).toFixed(1);
  lines.push("");
  lines.push(`Accuracy: ${report.correct}/${report.total} (${pct}%) — ${report.passed ? "PASS" : "FAIL"} (bar: >=90%)`);
  lines.push("");
  lines.push("Diagnostics (reported, does not gate):");
  lines.push(`  Flag precision: ${(report.diagnostics.flagPrecision * 100).toFixed(1)}%`);
  lines.push(`  Flag recall: ${(report.diagnostics.flagRecall * 100).toFixed(1)}%`);
  lines.push(`  Evidence-substring violations: ${report.diagnostics.totalEvidenceViolations}`);
  lines.push(`  Extraction-field accuracy: ${(report.diagnostics.fieldAccuracy * 100).toFixed(1)}%`);

  return lines.join("\n");
}

async function main() {
  const raw = readFileSync(path.join(REPO_ROOT, "starter/fixtures-posts.json"), "utf-8");
  const file = JSON.parse(raw) as EvalFixtureFile;
  const fixtures = flattenFixtures(file);

  const extractor = createOpenRouterExtractorClient({ temperature: 0 });
  const report = await runFixtureEval(fixtures, extractor);

  const output = formatReport(report);
  console.log(output);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `## Fixture eval\n\n\`\`\`\n${output}\n\`\`\`\n`);
  }

  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
