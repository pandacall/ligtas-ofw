import { describe, expect, it } from "vitest";
import { loadRegistrySnapshot, toAgencyRows, toJobOrderRows } from "./fixtures";

describe("loadRegistrySnapshot", () => {
  it("loads the checked-in snapshot fixture", () => {
    const snapshot = loadRegistrySnapshot();
    expect(snapshot.agencies.length).toBeGreaterThan(0);
    expect(snapshot.jobOrders.length).toBeGreaterThan(0);
    expect(snapshot.syncedAt).toBe("2026-07-27T05:00:00.000Z");
  });
});

describe("toAgencyRows", () => {
  const snapshot = loadRegistrySnapshot();
  const rows = toAgencyRows(snapshot);

  it("assigns sequential synthetic ids", () => {
    expect(rows[0]?.id).toBe(1);
    expect(rows[1]?.id).toBe(2);
  });

  it("computes normalizedName from name", () => {
    const xyz = rows.find((r) => r.name === "XYZ International Placement Agency, Inc.");
    expect(xyz?.normalizedName).toBe("xyz international placement agency inc");
  });

  it("parses date strings into Date objects, preserving null", () => {
    const banned = rows.find((r) => r.licenseStatus === "Forever Banned");
    expect(banned?.licenseExpirationDate).toBeNull();
    expect(banned?.licenseStatusDate).toBeInstanceOf(Date);
  });

  it("preserves is_valid verbatim, even when it disagrees with license_status", () => {
    const cancelled = rows.find((r) => r.licenseStatus === "Cancelled");
    expect(cancelled?.isValid).toBe(true);
  });
});

describe("toJobOrderRows", () => {
  const snapshot = loadRegistrySnapshot();
  const rows = toJobOrderRows(snapshot);

  it("coerces the string balance field to an integer", () => {
    expect(rows[0]?.balance).toBe(12);
    expect(typeof rows[0]?.balance).toBe("number");
  });

  it("joins to agencies by name string only (no id)", () => {
    expect(rows[0]?.agencyName).toBe("XYZ International Placement Agency, Inc.");
  });
});
