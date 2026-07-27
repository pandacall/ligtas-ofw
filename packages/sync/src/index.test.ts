import { describe, expect, it } from "vitest";
import { SyncError, fetchAllPages, isTripwireTriggered, mapAgencies, mapJobOrders, run, stageAndPromote } from "./index";

describe("@ligtas-ofw/sync barrel", () => {
  it("exports the sync pipeline pieces", () => {
    expect(fetchAllPages).toBeInstanceOf(Function);
    expect(mapAgencies).toBeInstanceOf(Function);
    expect(mapJobOrders).toBeInstanceOf(Function);
    expect(isTripwireTriggered).toBeInstanceOf(Function);
    expect(stageAndPromote).toBeInstanceOf(Function);
    expect(run).toBeInstanceOf(Function);
    expect(SyncError).toBeInstanceOf(Function);
  });
});
