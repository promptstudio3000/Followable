import { describe, expect, it } from "vitest";
import {
  buildAdminDivisionSearchPlaces,
  getAdminDivisionSeedRecords,
} from "@/server/data/admin-divisions";

describe("admin division seed", () => {
  it("contains global country and admin hierarchy rows", () => {
    const rows = getAdminDivisionSeedRecords();

    expect(rows.length).toBeGreaterThan(300_000);
    expect(rows.filter((row) => row.level === 0).length).toBeGreaterThan(240);
    expect(rows.filter((row) => row.level === 1).length).toBeGreaterThan(3_000);
    expect(rows.filter((row) => row.level === 2).length).toBeGreaterThan(40_000);
  });

  it("maps countries and first-level divisions into search places", () => {
    const czRows = getAdminDivisionSeedRecords().filter(
      (row) => row.countryCode === "CZ" && row.level <= 2,
    );
    const places = buildAdminDivisionSearchPlaces(czRows, {
      maxLevel: 2,
      includeCountries: true,
    });

    expect(places.some((place) => place.id === "demo-CZ-all" && place.kind === "country")).toBe(true);
    expect(places.some((place) => place.kind === "region" && place.country === "CZ")).toBe(true);
    expect(places.some((place) => place.kind === "district" && place.country === "CZ")).toBe(true);
  });
});
