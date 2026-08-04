import { describe, expect, it } from "vitest";
import {
  HISTORY_CONTENT_LIMIT,
  HISTORY_LIMIT,
  clampHistory,
  renderHistory,
  type ChatHistoryEntry,
} from "./chat-history";
import { ChatHistory } from "./chat-history-schema";

function entries(n: number): ChatHistoryEntry[] {
  return Array.from({ length: n }, (_, i) => ({ role: "user" as const, content: `turn ${i}` }));
}

describe("ChatHistory schema", () => {
  it("accepts well-formed history", () => {
    expect(ChatHistory.safeParse([{ role: "user", content: "hi" }]).success).toBe(true);
  });

  it.each([
    ["an unknown role", [{ role: "system", content: "x" }]],
    ["a missing content field", [{ role: "user" }]],
    ["a non-array", { role: "user", content: "x" }],
    ["a non-string content", [{ role: "user", content: 42 }]],
  ])("rejects %s", (_label, value) => {
    expect(ChatHistory.safeParse(value).success).toBe(false);
  });

  // The Surface passes client-supplied JSON straight in, so an absurd payload must not be
  // accepted and then rendered into the routing prompt.
  it("rejects an absurdly long history", () => {
    expect(ChatHistory.safeParse(entries(500)).success).toBe(false);
  });
});

describe("clampHistory", () => {
  it("keeps only the most recent HISTORY_LIMIT entries", () => {
    const clamped = clampHistory(entries(20));
    expect(clamped).toHaveLength(HISTORY_LIMIT);
    expect(clamped.at(-1)?.content).toBe("turn 19");
  });

  it("truncates a long entry and marks it", () => {
    const clamped = clampHistory([{ role: "user", content: "x".repeat(500) }]);
    expect(clamped[0]?.content.length).toBe(HISTORY_CONTENT_LIMIT);
    expect(clamped[0]?.content.endsWith("…")).toBe(true);
  });

  it("collapses whitespace so a pasted block cannot pad the prompt", () => {
    const clamped = clampHistory([{ role: "user", content: "  a\n\n\n   b  \t c " }]);
    expect(clamped[0]?.content).toBe("a b c");
  });

  it("drops empty entries", () => {
    expect(clampHistory([{ role: "user", content: "   " }, { role: "user", content: "real" }])).toHaveLength(1);
  });
});

describe("renderHistory", () => {
  it("returns null for empty history, so no context message is added", () => {
    expect(renderHistory([])).toBeNull();
    expect(renderHistory([{ role: "user", content: " " }])).toBeNull();
  });

  it("labels each side and marks the block as reference only", () => {
    const rendered = renderHistory([
      { role: "user", content: "legit ba ang ABC Manpower?" },
      { role: "bantatay", content: 'showed the DMW registry record for the agency "ABC Manpower"' },
    ]);
    expect(rendered).toContain("User: legit ba ang ABC Manpower?");
    expect(rendered).toContain("Bantatay: showed the DMW registry record");
    expect(rendered).toMatch(/resolving references only/);
    expect(rendered).toMatch(/do NOT classify these/);
  });

  it("applies the same clamp as clampHistory", () => {
    const rendered = renderHistory(entries(20)) ?? "";
    expect(rendered).toContain("turn 19");
    expect(rendered).not.toContain("turn 5");
  });
});
