import { describe, expect, it } from "vitest";
import { checkAgency, scorePost } from "./index";

describe("@ligtas-ofw/core barrel", () => {
  it("resolves checkAgency through the db dependency (proves the core->db edge)", () => {
    const result = checkAgency("Anyone", { agencies: [], syncedAt: new Date("2026-07-27T00:00:00.000Z") });
    expect(result.kind).toBe("not_found");
  });

  it("exports scorePost", () => {
    expect(typeof scorePost).toBe("function");
  });
});
