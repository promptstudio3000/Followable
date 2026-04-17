import { describe, expect, it } from "vitest";
import { buildCanonicalPlaceId, buildCanonicalPlaceKey, resolveCanonicalPlaceLinkage } from "@/lib/place-linkage";

describe("canonical place id hashing", () => {
  it("matches the SQL migration md5-based place_id derivation", () => {
    const placeKey = "place/czech-republic/plzensky-kraj/plzen/named/bolevecky-rybnik";

    expect(buildCanonicalPlaceId(placeKey)).toBe("place_8d93d27089");
  });

  it("keeps derived place ids aligned with derived place keys", () => {
    const placeKey = buildCanonicalPlaceKey({
      latitude: 49.7827,
      longitude: 13.3708,
      address: "North bank trail, Plzen",
      placeName: "Bolevecky rybnik",
      placeId: null,
      placeKey: null,
      city: "Plzen",
      district: "Plzen-mesto",
      region: "Plzensky kraj",
      country: "Czech Republic",
      geokey: "49.783:13.371",
    });

    expect(resolveCanonicalPlaceLinkage({
      latitude: 49.7827,
      longitude: 13.3708,
      address: "North bank trail, Plzen",
      placeName: "Bolevecky rybnik",
      placeId: null,
      placeKey: null,
      city: "Plzen",
      district: "Plzen-mesto",
      region: "Plzensky kraj",
      country: "Czech Republic",
      geokey: "49.783:13.371",
    })).toEqual({
      placeId: buildCanonicalPlaceId(placeKey),
      placeKey,
      source: "derived",
    });
  });
});
