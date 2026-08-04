import { describe, expect, it } from "vitest";
import { SCAN_TEXT_CHARS, routeTurn } from "./router";

const LONG_POST =
  "URGENT HIRING! Factory workers needed in South Korea. No experience required, guaranteed approval. " +
  "Salary 2,500 USD per month plus free accommodation and food allowance. Processing fee only 15,000 pesos " +
  "payable via GCash. Message us on Telegram for faster processing. Limited slots only!";

describe("routeTurn — zero-LLM fast paths", () => {
  it("an attached image always means scan_post", () => {
    expect(routeTurn({ imageDataUrl: "data:image/png;base64,AAAA" })).toEqual({ kind: "scan_post" });
  });

  // Mirrors scan/actions.ts's image-wins-over-text rule (issue #9): an upload is deliberate.
  it("an image wins over pasted text", () => {
    expect(routeTurn({ text: "magkano ang placement fee?", imageDataUrl: "data:image/png;base64,AAAA" })).toEqual({
      kind: "scan_post",
    });
  });

  it("long pasted text is treated as a job post", () => {
    expect(LONG_POST.length).toBeGreaterThanOrEqual(SCAN_TEXT_CHARS);
    expect(routeTurn({ text: LONG_POST })).toEqual({ kind: "scan_post" });
  });

  it("a short post with two structural markers is still scanned", () => {
    const short = "URGENT HIRING! Salary 1,200 USD. Apply now.";
    expect(short.length).toBeLessThan(SCAN_TEXT_CHARS);
    expect(routeTurn({ text: short })).toEqual({ kind: "scan_post" });
  });

  it("a question that merely mentions one marker word is NOT scanned", () => {
    const decision = routeTurn({ text: "magkano ba ang sahod ng HSW sa Kuwait?" });
    expect(decision.kind).not.toBe("scan_post");
  });

  it("a keyword hit resolves to advice with no LLM call", () => {
    const decision = routeTurn({ text: "magkano ang legal na placement fee?" });
    expect(decision.kind).toBe("advice");
    if (decision.kind !== "advice") throw new Error("unreachable");
    expect(decision.kbEntries.map((entry) => entry.id)).toContain("placement-fee-cap");
  });

  it("falls through to the Router only when intent needs reading", () => {
    expect(routeTurn({ text: "Golden Star Manpower Services" })).toEqual({ kind: "needs_router" });
  });

  it("treats empty and whitespace-only input as empty", () => {
    expect(routeTurn({})).toEqual({ kind: "empty" });
    expect(routeTurn({ text: "   " })).toEqual({ kind: "empty" });
  });
});

describe("routeTurn — quick actions", () => {
  it.each([
    ["hotlines", "hotlines"],
    ["what_to_do_if_scammed", "na-scam-ano-gagawin"],
    ["about", "what-is-ligtasofw"],
  ] as const)("the %s chip resolves straight to its KB entry", (action, expectedId) => {
    const decision = routeTurn({ action });
    expect(decision.kind).toBe("advice");
    if (decision.kind !== "advice") throw new Error("unreachable");
    expect(decision.kbEntries.map((entry) => entry.id)).toEqual([expectedId]);
  });

  it("the scan_post chip with no content yet is empty, not a wasted call", () => {
    expect(routeTurn({ action: "scan_post" })).toEqual({ kind: "empty" });
  });

  it("the scan_post chip with text scans it", () => {
    expect(routeTurn({ action: "scan_post", text: LONG_POST })).toEqual({ kind: "scan_post" });
  });

  // Chips carry their own intent, so even short text under the chip scans rather than
  // falling through to keyword matching.
  it("the scan_post chip scans short text too", () => {
    expect(routeTurn({ action: "scan_post", text: "hiring sa Dubai" })).toEqual({ kind: "scan_post" });
  });
});
