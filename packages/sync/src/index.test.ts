import { describe, expect, it } from "vitest";
import { SYNC_PLACEHOLDER } from "./index";

describe("@ligtas-ofw/sync placeholder", () => {
  it("resolves its value through the db dependency", () => {
    expect(SYNC_PLACEHOLDER).toBe("sync:db");
  });
});
