import { describe, expect, it, vi } from "vitest";
import type { ChatRoute, RouterClient, RouterMessage } from "./chat-route";
import { ROUTER_UNAVAILABLE_COPY } from "./copy";
import { handleTurn, runRouter, type ChatTurnDeps } from "./chat";
import type { RegistryState } from "./registry";
import type { QuotaCheckResult } from "./quota";
import type { ExtractorClient } from "./scan";

const SYNCED_AT = new Date("2026-08-03T18:00:00Z");
const NOW = new Date("2026-08-04T09:00:00Z");

const REGISTRY_STATE: RegistryState = {
  agencies: [
    {
      id: 1,
      name: "Golden Star Manpower Services",
      normalizedName: "golden star manpower services",
      classification: "Landbased",
      licenseStatus: "Valid License",
      licenseStatusDate: new Date("2025-01-01T00:00:00Z"),
      licenseExpirationDate: new Date("2027-01-01T00:00:00Z"),
      isValid: true,
      representative: null,
      address: "Manila",
      municipalityProvince: null,
      cityProvince: null,
      contactNumber: null,
      email: null,
      dataAsOf: SYNCED_AT,
    },
  ],
  jobOrders: [],
  syncedAt: SYNCED_AT,
};

const LONG_POST =
  "URGENT HIRING! Factory workers needed in South Korea. No experience required, guaranteed approval. " +
  "Salary 2,500 USD per month plus free accommodation. Processing fee only 15,000 pesos payable via GCash. " +
  "Message us on Telegram for faster processing. Limited slots only!";

const ok: QuotaCheckResult = { kind: "ok" };

function makeDeps(overrides: Partial<ChatTurnDeps> = {}): ChatTurnDeps {
  return {
    router: vi.fn(async () => {
      throw new Error("router should not have been called");
    }),
    extractor: vi.fn(async () => {
      throw new Error("extractor should not have been called");
    }),
    registryState: REGISTRY_STATE,
    consumeScanBudget: vi.fn(async () => ok),
    consumeChatBudget: vi.fn(async () => ok),
    now: NOW,
    ...overrides,
  };
}

function routerReturning(route: Partial<ChatRoute>): RouterClient {
  return vi.fn(async () => ({
    intent: "out_of_scope",
    agency_name: null,
    kb_ids: [],
    reply: "Sige po.",
    ...route,
  }));
}

/** A minimal valid Extraction for a post with no agency and one critical flag. */
const SCAM_EXTRACTION = {
  is_job_post: true,
  agency_name: null,
  license_no_claimed: null,
  recruiter_is_individual: true,
  position: "Factory worker",
  destination_country: "South Korea",
  salary_raw: "2,500 USD",
  fees: [{ label: "Processing fee", amount_raw: "15,000 pesos" }],
  contact_channels: ["telegram"],
  office_address_given: false,
  visa_type_mentioned: null,
  urgency_phrases: ["URGENT HIRING", "Limited slots only"],
  red_flags: [
    {
      flag: "upfront_fee",
      evidence_quote: "Processing fee only 15,000 pesos payable via GCash",
    },
  ],
};

describe("handleTurn — zero-LLM paths never touch a budget", () => {
  it("an empty turn returns empty and spends nothing", async () => {
    const deps = makeDeps();
    expect(await handleTurn({ text: "   " }, deps)).toEqual({ kind: "empty" });
    expect(deps.consumeChatBudget).not.toHaveBeenCalled();
    expect(deps.consumeScanBudget).not.toHaveBeenCalled();
  });

  it("a keyword-matched question answers from the KB with no LLM call", async () => {
    const deps = makeDeps();
    const result = await handleTurn({ text: "magkano ang legal na placement fee?" }, deps);

    expect(result.kind).toBe("advice");
    if (result.kind !== "advice") throw new Error("unreachable");
    expect(result.entries.map((entry) => entry.id)).toContain("placement-fee-cap");
    expect(deps.router).not.toHaveBeenCalled();
    expect(deps.consumeChatBudget).not.toHaveBeenCalled();
  });

  it("a chip resolves straight to its KB entry", async () => {
    const deps = makeDeps();
    const result = await handleTurn({ action: "hotlines" }, deps);

    expect(result.kind).toBe("advice");
    if (result.kind !== "advice") throw new Error("unreachable");
    expect(result.entries.map((entry) => entry.id)).toEqual(["hotlines"]);
    expect(deps.consumeChatBudget).not.toHaveBeenCalled();
  });

  it("the check_agency chip runs the registry lookup without spending any budget", async () => {
    const deps = makeDeps();
    const result = await handleTurn({ action: "check_agency", text: "Golden Star Manpower Services" }, deps);

    expect(result.kind).toBe("agency_check");
    if (result.kind !== "agency_check") throw new Error("unreachable");
    expect(result.registry.kind).toBe("matched");
    expect(result.registry.verdict).toBe("VERIFIED");
    expect(deps.consumeChatBudget).not.toHaveBeenCalled();
    expect(deps.consumeScanBudget).not.toHaveBeenCalled();
  });
});

describe("handleTurn — scanning", () => {
  it("long pasted text scans against the scan budget, not the chat budget", async () => {
    const extractor: ExtractorClient = vi.fn(async () => SCAM_EXTRACTION);
    const deps = makeDeps({ extractor });

    const result = await handleTurn({ text: LONG_POST }, deps);

    expect(result.kind).toBe("scan");
    if (result.kind !== "scan") throw new Error("unreachable");
    expect(result.result.kind).toBe("scored");
    expect(deps.consumeScanBudget).toHaveBeenCalledOnce();
    expect(deps.consumeChatBudget).not.toHaveBeenCalled();
  });

  it("an image scans without any router involvement", async () => {
    const extractor: ExtractorClient = vi.fn(async () => SCAM_EXTRACTION);
    const deps = makeDeps({ extractor });

    const result = await handleTurn({ imageDataUrl: "data:image/png;base64,AAAA" }, deps);

    expect(result.kind).toBe("scan");
    expect(deps.router).not.toHaveBeenCalled();
  });

  // Matches scan/actions.ts (issue #11): an exhausted budget never reaches the provider.
  it("an exhausted scan budget never calls the extractor", async () => {
    const extractor: ExtractorClient = vi.fn(async () => SCAM_EXTRACTION);
    const deps = makeDeps({ extractor, consumeScanBudget: vi.fn(async () => ({ kind: "quota_exhausted" as const })) });

    const result = await handleTurn({ text: LONG_POST }, deps);

    expect(result.kind).toBe("scan");
    if (result.kind !== "scan") throw new Error("unreachable");
    expect(result.result.kind).toBe("quota_exhausted");
    expect(extractor).not.toHaveBeenCalled();
  });

  it("a rate-limited scan surfaces rate_limited, not a verdict", async () => {
    const deps = makeDeps({ consumeScanBudget: vi.fn(async () => ({ kind: "rate_limited" as const })) });
    const result = await handleTurn({ text: LONG_POST }, deps);

    if (result.kind !== "scan") throw new Error("unreachable");
    expect(result.result.kind).toBe("rate_limited");
  });
});

describe("handleTurn — the Router path", () => {
  it("routes an ambiguous agency name through the Router to a registry verdict", async () => {
    const router = routerReturning({
      intent: "agency_check",
      agency_name: "Golden Star Manpower Services",
      reply: "Hayaan mong i-check ko ito.",
    });
    const deps = makeDeps({ router });

    const result = await handleTurn({ text: "Golden Star Manpower Services" }, deps);

    expect(result.kind).toBe("agency_check");
    if (result.kind !== "agency_check") throw new Error("unreachable");
    expect(result.registry.verdict).toBe("VERIFIED");
    expect(result.reply).toBe("Hayaan mong i-check ko ito.");
    expect(deps.consumeChatBudget).toHaveBeenCalledOnce();
  });

  it("replaces a Router reply containing digits with the canned fallback", async () => {
    const router = routerReturning({
      intent: "agency_check",
      agency_name: "Golden Star Manpower Services",
      reply: "Lisensyado sila hanggang 2027.",
    });
    const result = await handleTurn({ text: "Golden Star Manpower Services" }, makeDeps({ router }));

    if (result.kind !== "agency_check") throw new Error("unreachable");
    expect(result.reply).not.toContain("2027");
    // The deterministic verdict still comes through untouched.
    expect(result.registry.verdict).toBe("VERIFIED");
  });

  it("drops hallucinated kb_ids and degrades a citation-less advice turn to out_of_scope", async () => {
    const router = routerReturning({ intent: "advice", kb_ids: ["totally-invented"] });
    const result = await handleTurn({ text: "ano po ba ang gagawin ko dito" }, makeDeps({ router }));

    expect(result.kind).toBe("out_of_scope");
  });

  it("retries once on a schema failure, then succeeds", async () => {
    const router: RouterClient = vi
      .fn()
      .mockResolvedValueOnce({ intent: "not_a_real_intent" })
      .mockResolvedValueOnce({
        intent: "advice",
        agency_name: null,
        kb_ids: ["hotlines"],
        reply: "Narito ang mga numero.",
      });

    const result = await handleTurn({ text: "ano po ba ang gagawin ko dito" }, makeDeps({ router }));

    expect(router).toHaveBeenCalledTimes(2);
    expect(result.kind).toBe("advice");
  });

  // Invariant 6: degrade, never fabricate.
  it("gives up after the retry rather than guessing an intent", async () => {
    const router: RouterClient = vi.fn(async () => ({ garbage: true }));
    const result = await handleTurn({ text: "ano po ba ang gagawin ko dito" }, makeDeps({ router }));

    expect(router).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ kind: "router_unavailable", reply: ROUTER_UNAVAILABLE_COPY });
  });

  it("degrades to router_unavailable when the router throws", async () => {
    const router: RouterClient = vi.fn(async () => {
      throw new Error("429 rate limited upstream");
    });
    const result = await handleTurn({ text: "ano po ba ang gagawin ko dito" }, makeDeps({ router }));

    expect(result.kind).toBe("router_unavailable");
  });
});

describe("handleTurn — chat budget exhaustion", () => {
  it("never calls the Router once the chat budget is spent", async () => {
    const router = routerReturning({ intent: "advice", kb_ids: ["hotlines"] });
    const deps = makeDeps({ router, consumeChatBudget: vi.fn(async () => ({ kind: "quota_exhausted" as const })) });

    const result = await handleTurn({ text: "ano po ba ang gagawin ko dito" }, deps);

    expect(result).toEqual({ kind: "router_unavailable", reply: ROUTER_UNAVAILABLE_COPY });
    expect(router).not.toHaveBeenCalled();
  });

  // The point of metering the two budgets separately: losing the chat budget must not take
  // the free deterministic paths down with it.
  it("leaves the chips, the agency check, and keyword advice working", async () => {
    const deps = makeDeps({ consumeChatBudget: vi.fn(async () => ({ kind: "quota_exhausted" as const })) });

    const chip = await handleTurn({ action: "hotlines" }, deps);
    expect(chip.kind).toBe("advice");

    const agency = await handleTurn({ action: "check_agency", text: "Golden Star Manpower Services" }, deps);
    expect(agency.kind).toBe("agency_check");

    const advice = await handleTurn({ text: "magkano ang placement fee?" }, deps);
    expect(advice.kind).toBe("advice");
  });
});

describe("runRouter", () => {
  it("returns null when both attempts fail validation", async () => {
    const router: RouterClient = vi.fn(async () => ({ nope: 1 }));
    expect(await runRouter("hello", router)).toBeNull();
  });

  it("appends the validation error to the retry so the model can correct itself", async () => {
    const router = vi.fn<RouterClient>(async () => ({ nope: 1 }));
    await runRouter("hello", router);

    const retryMessages: RouterMessage[] | undefined = router.mock.calls[1]?.[0];
    expect(retryMessages).toHaveLength(3);
    expect(retryMessages?.[2]?.content).toMatch(/previous response was rejected/);
  });
});
