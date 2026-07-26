import { describe, expect, it } from "vitest";
import { DB_PLACEHOLDER } from "./index";

describe("@ligtas-ofw/db placeholder", () => {
  it("exports a stable placeholder value", () => {
    expect(DB_PLACEHOLDER).toBe("db");
  });
});
