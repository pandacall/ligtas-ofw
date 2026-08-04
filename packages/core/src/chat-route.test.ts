import { describe, expect, it } from "vitest";
import { ADVISOR_KB } from "./advisor-kb";
import {
  ChatRoute,
  FALLBACK_REPLY,
  MAX_REPLY_LENGTH,
  ROUTER_SYSTEM_PROMPT,
  replyIsSafe,
  toSafeRoute,
} from "./chat-route";

function route(overrides: Partial<ChatRoute> = {}): ChatRoute {
  return {
    intent: "advice",
    agency_name: null,
    kb_ids: ["hotlines"],
    reply: "Narito ang mga opisyal na matatawagan.",
    ...overrides,
  };
}

describe("ChatRoute schema", () => {
  it("accepts a well-formed route", () => {
    expect(ChatRoute.safeParse(route()).success).toBe(true);
  });

  it("rejects an unknown intent", () => {
    expect(ChatRoute.safeParse({ ...route(), intent: "issue_verdict" }).success).toBe(false);
  });

  it("rejects a missing reply", () => {
    const { reply: _reply, ...withoutReply } = route();
    expect(ChatRoute.safeParse(withoutReply).success).toBe(false);
  });
});

describe("replyIsSafe (the no-digits guard)", () => {
  it("accepts a short digit-free lead-in", () => {
    expect(replyIsSafe("Hayaan mong i-check ko ito sa listahan ng DMW.")).toBe(true);
  });

  // The core of ADR-0005: a digit in model prose means it invented a number.
  it.each([
    ["a hotline number", "Tumawag sa 1348 para sa tulong."],
    ["a peso amount", "Ang placement fee ay hindi dapat lumampas sa 25000 pesos."],
    ["a license number", "Ang lisensya nila ay DMW-123-LB-01012026-UL."],
    ["a bare year", "Nag-expire ang lisensya nila noong 2025."],
  ])("rejects %s", (_label, reply) => {
    expect(replyIsSafe(reply)).toBe(false);
  });

  it("rejects an empty or whitespace-only reply", () => {
    expect(replyIsSafe("")).toBe(false);
    expect(replyIsSafe("   ")).toBe(false);
  });

  it("rejects a reply longer than the cap", () => {
    expect(replyIsSafe("a".repeat(MAX_REPLY_LENGTH + 1))).toBe(false);
    expect(replyIsSafe("a".repeat(MAX_REPLY_LENGTH))).toBe(true);
  });
});

describe("toSafeRoute", () => {
  it("passes through a clean advice route", () => {
    const safe = toSafeRoute(route());
    expect(safe.intent).toBe("advice");
    expect(safe.kbEntries.map((entry) => entry.id)).toEqual(["hotlines"]);
    expect(safe.reply).toBe("Narito ang mga opisyal na matatawagan.");
  });

  it("swaps an unsafe reply for the canned fallback but keeps the intent", () => {
    const safe = toSafeRoute(route({ reply: "Tumawag sa 1348." }));
    expect(safe.intent).toBe("advice");
    expect(safe.reply).toBe(FALLBACK_REPLY.advice);
  });

  it("drops hallucinated kb_ids", () => {
    const safe = toSafeRoute(route({ kb_ids: ["hotlines", "invented-entry"] }));
    expect(safe.kbEntries.map((entry) => entry.id)).toEqual(["hotlines"]);
  });

  // Advice with nothing to cite is exactly the fabrication this design prevents.
  it("degrades advice with no resolvable entries to out_of_scope", () => {
    const safe = toSafeRoute(route({ kb_ids: ["nope"] }));
    expect(safe.intent).toBe("out_of_scope");
    expect(safe.kbEntries).toEqual([]);
    expect(safe.reply).toBe(FALLBACK_REPLY.out_of_scope);
  });

  it("degrades an agency_check with no name to out_of_scope", () => {
    const safe = toSafeRoute(route({ intent: "agency_check", agency_name: "  ", kb_ids: [] }));
    expect(safe.intent).toBe("out_of_scope");
    expect(safe.agencyName).toBeNull();
  });

  it("trims the agency name and clears kb entries on an agency_check", () => {
    const safe = toSafeRoute(
      route({ intent: "agency_check", agency_name: "  Golden Star Manpower ", kb_ids: ["hotlines"] }),
    );
    expect(safe.agencyName).toBe("Golden Star Manpower");
    expect(safe.kbEntries).toEqual([]);
  });

  it("clears the agency name on a scan_post", () => {
    const safe = toSafeRoute(route({ intent: "scan_post", agency_name: "Something", kb_ids: [] }));
    expect(safe.intent).toBe("scan_post");
    expect(safe.agencyName).toBeNull();
  });

  it("never returns an empty reply for any intent", () => {
    for (const intent of ["agency_check", "scan_post", "advice", "out_of_scope"] as const) {
      const safe = toSafeRoute(route({ intent, reply: "", agency_name: "X", kb_ids: ["hotlines"] }));
      expect(safe.reply.length, intent).toBeGreaterThan(0);
    }
  });
});

describe("ROUTER_SYSTEM_PROMPT", () => {
  it("lists every Advisor KB id so the model can only cite real ones", () => {
    for (const entry of ADVISOR_KB) {
      expect(ROUTER_SYSTEM_PROMPT).toContain(entry.id);
    }
  });

  it("forbids digits and verdicts in the reply", () => {
    expect(ROUTER_SYSTEM_PROMPT).toMatch(/NO DIGITS/);
    expect(ROUTER_SYSTEM_PROMPT).toMatch(/Never state or imply a verdict/);
  });
});

describe("FALLBACK_REPLY", () => {
  // These are hand-written, so unlike model output they may carry real numbers — the
  // no-digits rule guards against invention, and nothing here was invented.
  it("covers every intent with non-empty copy", () => {
    for (const intent of ["agency_check", "scan_post", "advice", "out_of_scope"] as const) {
      expect(FALLBACK_REPLY[intent].trim().length, intent).toBeGreaterThan(0);
    }
  });

  it("points an out-of-scope user at the real hotline rather than improvising", () => {
    expect(FALLBACK_REPLY.out_of_scope).toContain("1348");
  });
});
