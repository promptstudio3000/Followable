import { describe, expect, it } from "vitest";
import { getAdminRegionSeeds, getAdminSearchPlaces, getDemoWholeCountryPlace } from "@/lib/admin-regions-by-country";
import { getCountryBounds } from "@/lib/country-bounds";
import { getDemoPoiPostsForCountry } from "@/lib/demo-pois-by-country";
import { seedData } from "@/lib/demo-data";

describe("country bounds + demo map plan", () => {
  it("getCountryBounds returns valid box for major codes", () => {
    for (const code of ["CZ", "DE", "US", "JP"]) {
      const b = getCountryBounds(code);
      expect(b.west).toBeLessThan(b.east);
      expect(b.south).toBeLessThan(b.north);
      expect(Math.abs(b.east - b.west)).toBeLessThan(200);
    }
  });

  it("admin regions exist for template countries", () => {
    expect(getAdminRegionSeeds("DE").length).toBe(16);
    expect(getAdminSearchPlaces("PL").length).toBe(16);
    expect(getDemoWholeCountryPlace("DE").kind).toBe("country");
  });

  it("demo POIs scale with admin regions (2 per region)", () => {
    const author = seedData.users[0]!;
    const topic = seedData.topics[0] ?? null;
    const de = getDemoPoiPostsForCountry("DE", author, topic);
    expect(de.length).toBe(32);
    const regions = new Set(de.map((p) => p.location.region).filter(Boolean));
    expect(regions.size).toBeGreaterThan(10);
    const itPosts = getDemoPoiPostsForCountry("IT", author, topic);
    expect(itPosts.length).toBe(40);
  });

  it("fallback country without admin still yields demo posts", () => {
    const author = seedData.users[0]!;
    const lu = getDemoPoiPostsForCountry("LU", author, null);
    expect(lu.length).toBeGreaterThan(0);
    expect(lu.every((p) => p.location.country === "LU")).toBe(true);
  });

  it("ships >= 20 seeded posts for each European country code", () => {
    const europe = [
      "AL","AD","AT","AZ","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB","GE","GR","HR","HU","IE","IS","IT","LI","LT","LU","LV","MC","MD","ME","MK","MT","NL","NO","PL","PT","RO","RS","SE","SI","SK","SM","TR","UA","VA",
    ] as const;

    const locationsById = new Map(seedData.locations.map((l) => [l.id, l]));
    const counts = new Map<string, number>();
    seedData.posts.forEach((p) => {
      const loc = locationsById.get(p.locationId);
      const c = (loc?.country ?? "").toUpperCase();
      if (!c) return;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });

    europe.forEach((code) => {
      expect(counts.get(code) ?? 0).toBeGreaterThanOrEqual(20);
    });
  });
});
