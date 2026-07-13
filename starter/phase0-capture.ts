/**
 * Phase 0: Capture the DMW SPA's hidden JSON API.
 *
 * dmw.gov.ph is a catch-all SPA — every path (even *.json) returns the same JS shell,
 * so the data endpoint can only be discovered at runtime. This script loads the
 * inquiry pages in headless Chromium, records every XHR/fetch, interacts with the
 * search UI to trigger data calls, and dumps findings to phase0-findings/.
 *
 * Run:  npx tsx phase0-capture.ts   (needs: npm i -D playwright tsx && npx playwright install chromium)
 */
import { chromium, type Response } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT = path.join(__dirname, "phase0-findings");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  "https://dmw.gov.ph/inquiry/licensed-recruitment-agencies",
  "https://dmw.gov.ph/inquiry/approved-job-orders",
];

// Heuristic: responses we care about (JSON or anything that smells like data)
function looksLikeData(url: string, contentType: string) {
  if (/\.(png|jpe?g|svg|woff2?|ttf|css|ico|gif)(\?|$)/i.test(url)) return false;
  return (
    contentType.includes("json") ||
    /api|graphql|inquiry|agenc|jobord|search|list|query/i.test(url)
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  const captured: Array<Record<string, unknown>> = [];

  page.on("response", async (res: Response) => {
    const url = res.url();
    const ct = res.headers()["content-type"] ?? "";
    if (!looksLikeData(url, ct)) return;
    const req = res.request();
    const entry: Record<string, unknown> = {
      url,
      method: req.method(),
      status: res.status(),
      contentType: ct,
      requestHeaders: await req.allHeaders().catch(() => ({})),
      postData: req.postData() ?? null,
    };
    // Save JSON bodies (truncated) — this reveals the response shape for the schema
    if (ct.includes("json")) {
      try {
        const body = await res.text();
        entry.bodyPreview = body.slice(0, 5000);
        const fname = url.replace(/[^a-z0-9]/gi, "_").slice(0, 120) + ".json";
        fs.writeFileSync(path.join(OUT, fname), body);
      } catch {
        entry.bodyPreview = "<unreadable>";
      }
    }
    captured.push(entry);
    console.log(`[captured] ${req.method()} ${res.status()} ${url}`);
  });

  for (const target of PAGES) {
    console.log(`\n=== Loading ${target} ===`);
    await page.goto(target, { waitUntil: "networkidle", timeout: 60_000 }).catch((e) => console.warn("goto:", e.message));
    await page.waitForTimeout(5_000);

    // Also grab the JS bundle URLs — grep them for API base URLs as a backup signal
    const scripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[src]")).map((s) => (s as HTMLScriptElement).src)
    );
    fs.appendFileSync(path.join(OUT, "script-bundles.txt"), scripts.join("\n") + "\n");

    // Try to trigger a search so list/search endpoints fire.
    // Selectors are guesses — adjust after first run by looking at the screenshot.
    await page.screenshot({ path: path.join(OUT, `page-${PAGES.indexOf(target)}.png`), fullPage: true });
    const input = page.locator("input[type='text'], input[type='search']").first();
    if (await input.count()) {
      await input.fill("ABC").catch(() => {});
      await input.press("Enter").catch(() => {});
      await page.waitForTimeout(5_000);
    }
    // Click anything that looks like a search button
    const btn = page.getByRole("button", { name: /search|hanap|submit|go/i }).first();
    if (await btn.count()) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(5_000);
    }
  }

  fs.writeFileSync(path.join(OUT, "captured-requests.json"), JSON.stringify(captured, null, 2));
  console.log(`\nDone. ${captured.length} candidate requests -> ${OUT}/captured-requests.json`);
  console.log("Next: identify the agencies/job-orders endpoints, note pagination params + any tokens,");
  console.log("and document them in packages/sync/DATA-SOURCES.md. Then test a direct fetch of that");
  console.log("endpoint WITHOUT the browser — if it works, ongoing sync is a plain JSON pull.");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
