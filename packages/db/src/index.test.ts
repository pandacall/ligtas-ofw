import { describe, expect, it } from "vitest";
import { agencies, jobOrders, loadRegistrySnapshot, normalizeAgencyName, syncMetadata, toAgencyRows } from "./index";

describe("@ligtas-ofw/db barrel", () => {
  it("exports the Registry schema tables", () => {
    expect(agencies).toBeDefined();
    expect(jobOrders).toBeDefined();
    expect(syncMetadata).toBeDefined();
  });

  it("exports working normalize + fixture functions", () => {
    expect(normalizeAgencyName("Test, Inc.")).toBe("test inc");
    expect(toAgencyRows(loadRegistrySnapshot()).length).toBeGreaterThan(0);
  });
});
