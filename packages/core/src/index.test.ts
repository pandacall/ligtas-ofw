import { describe, expect, it } from "vitest";
import { CORE_PLACEHOLDER } from "./index";

describe("@ligtas-ofw/core placeholder", () => {
  it("resolves its value through the db dependency", () => {
    expect(CORE_PLACEHOLDER).toBe("core:db");
  });
});
