import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedData } from "@/lib/demo-data";
import { withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import { getAppBootstrap } from "@/server/data/bootstrap";
import { GET as getPlaceOverlayByIdRoute } from "@/app/api/places/[placeId]/overlay/route";
import { GET as getPlaceOverlayByKeyRoute } from "@/app/api/places/by-key/overlay/[...placeKey]/route";
import { GET as getPlaceOverlaysRoute } from "@/app/api/place-overlays/route";

vi.mock("@/server/data/bootstrap", () => ({
  getAppBootstrap: vi.fn(),
}));

describe("place overlay routes", () => {
  const place = withCanonicalPlaceLinkage(seedData.locations[0]!);
  const mockedGetAppBootstrap = vi.mocked(getAppBootstrap);

  beforeEach(() => {
    mockedGetAppBootstrap.mockReset();
  });

  it("returns an overlay by placeId in demo mode", async () => {
    mockedGetAppBootstrap.mockResolvedValue({
      snapshot: seedData,
      featureModes: {
        appMode: "demo",
        geocodingMode: "seeded",
        storageMode: "inline-demo",
        walletMode: "injected",
        walletAuthStatus: "disabled",
        walletPaymentsEnabled: false,
        mapMode: "demo-style",
      },
    });

    const response = await getPlaceOverlayByIdRoute(new Request("http://localhost/api/places"), {
      params: Promise.resolve({ placeId: place.placeId! }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.placeId).toBe(place.placeId);
    expect(payload.source).toBe("demo");
  });

  it("returns an overlay by placeKey in database mode", async () => {
    mockedGetAppBootstrap.mockResolvedValue({
      snapshot: seedData,
      featureModes: {
        appMode: "database",
        geocodingMode: "seeded",
        storageMode: "inline-demo",
        walletMode: "injected",
        walletAuthStatus: "disabled",
        walletPaymentsEnabled: false,
        mapMode: "demo-style",
      },
    });

    const response = await getPlaceOverlayByKeyRoute(new Request("http://localhost/api/places/by-key/overlay"), {
      params: Promise.resolve({ placeKey: place.placeKey!.split("/") }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.placeKey).toBe(place.placeKey);
    expect(payload.source).toBe("database");
  });

  it("returns bulk overlays and matches the single-place payload shape", async () => {
    mockedGetAppBootstrap.mockResolvedValue({
      snapshot: seedData,
      featureModes: {
        appMode: "demo",
        geocodingMode: "seeded",
        storageMode: "inline-demo",
        walletMode: "injected",
        walletAuthStatus: "disabled",
        walletPaymentsEnabled: false,
        mapMode: "demo-style",
      },
    });

    const singleResponse = await getPlaceOverlayByIdRoute(new Request("http://localhost/api/places"), {
      params: Promise.resolve({ placeId: place.placeId! }),
    });
    const singlePayload = await singleResponse.json();

    const bulkResponse = await getPlaceOverlaysRoute(
      new Request(`http://localhost/api/place-overlays?placeId=${encodeURIComponent(place.placeId!)}`),
    );
    const bulkPayload = await bulkResponse.json();

    expect(bulkResponse.status).toBe(200);
    expect(bulkPayload.source).toBe("demo");
    expect(bulkPayload.count).toBe(1);
    expect(bulkPayload.items[0]).toEqual(singlePayload);
    expect(bulkPayload.maxUpdatedAt).toBe(singlePayload.updatedAt);
  });

  it("supports bulk placeKey filters and updatedAfter in database mode", async () => {
    mockedGetAppBootstrap.mockResolvedValue({
      snapshot: seedData,
      featureModes: {
        appMode: "database",
        geocodingMode: "seeded",
        storageMode: "inline-demo",
        walletMode: "injected",
        walletAuthStatus: "disabled",
        walletPaymentsEnabled: false,
        mapMode: "demo-style",
      },
    });

    const bulkResponse = await getPlaceOverlaysRoute(
      new Request(
        `http://localhost/api/place-overlays?placeKey=${encodeURIComponent(place.placeKey!)}&updatedAfter=2026-01-01T00:00:00.000Z&limit=5`,
      ),
    );
    const bulkPayload = await bulkResponse.json();

    expect(bulkResponse.status).toBe(200);
    expect(bulkPayload.source).toBe("database");
    expect(bulkPayload.count).toBeGreaterThanOrEqual(1);
    expect(bulkPayload.count).toBeLessThanOrEqual(5);
    expect(bulkPayload.items.some((item: { placeKey: string }) => item.placeKey === place.placeKey)).toBe(true);
  });

  it("returns 400 for invalid updatedAfter and invalid limit", async () => {
    mockedGetAppBootstrap.mockResolvedValue({
      snapshot: seedData,
      featureModes: {
        appMode: "demo",
        geocodingMode: "seeded",
        storageMode: "inline-demo",
        walletMode: "injected",
        walletAuthStatus: "disabled",
        walletPaymentsEnabled: false,
        mapMode: "demo-style",
      },
    });

    const invalidUpdatedAfterResponse = await getPlaceOverlaysRoute(
      new Request("http://localhost/api/place-overlays?updatedAfter=not-a-date"),
    );
    const invalidUpdatedAfterPayload = await invalidUpdatedAfterResponse.json();

    const invalidLimitResponse = await getPlaceOverlaysRoute(
      new Request("http://localhost/api/place-overlays?limit=0"),
    );
    const invalidLimitPayload = await invalidLimitResponse.json();

    expect(invalidUpdatedAfterResponse.status).toBe(400);
    expect(invalidUpdatedAfterPayload.error).toContain("updatedAfter");
    expect(invalidLimitResponse.status).toBe(400);
    expect(invalidLimitPayload.error).toContain("limit");
  });

  it("returns an empty bulk envelope when no overlays match", async () => {
    mockedGetAppBootstrap.mockResolvedValue({
      snapshot: seedData,
      featureModes: {
        appMode: "database",
        geocodingMode: "seeded",
        storageMode: "inline-demo",
        walletMode: "injected",
        walletAuthStatus: "disabled",
        walletPaymentsEnabled: false,
        mapMode: "demo-style",
      },
    });

    const response = await getPlaceOverlaysRoute(
      new Request("http://localhost/api/place-overlays?placeId=place_missing&limit=2"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("database");
    expect(payload.count).toBe(0);
    expect(payload.items).toEqual([]);
    expect(payload.maxUpdatedAt).toBeNull();
  });
});
