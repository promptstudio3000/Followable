import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/demo-data";
import { withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import { getPlaceOverlayById, getPlaceOverlayByKey, listPlaceOverlays } from "@/server/data/place-overlay";

function maxIso(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  return timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;
}

describe("place overlay reads", () => {
  it("reads an overlay by placeId and placeKey", () => {
    const place = withCanonicalPlaceLinkage(seedData.locations[0]!);

    const byId = getPlaceOverlayById(seedData, "demo", place.placeId!);
    const byKey = getPlaceOverlayByKey(seedData, "demo", place.placeKey!);

    expect(byId).not.toBeNull();
    expect(byKey).not.toBeNull();
    expect(byId?.placeId).toBe(place.placeId);
    expect(byKey?.placeKey).toBe(place.placeKey);
  });

  it("computes counts and recent activity consistently", () => {
    const place = withCanonicalPlaceLinkage(seedData.locations[0]!);
    const matchingLocations = seedData.locations
      .map(withCanonicalPlaceLinkage)
      .filter((location) => location.placeId === place.placeId);
    const locationIds = new Set(matchingLocations.map((location) => location.id));
    const matchingPosts = seedData.posts.filter((post) => locationIds.has(post.locationId));
    const postIds = new Set(matchingPosts.map((post) => post.id));
    const collectionIds = new Set(
      seedData.collectionPosts
        .filter((entry) => postIds.has(entry.postId))
        .map((entry) => entry.collectionId),
    );
    const curatorIds = [...new Set(matchingPosts.map((post) => post.authorId))];
    const followerCount = new Set(
      seedData.follows
        .filter((follow) => curatorIds.includes(follow.followedUserId))
        .map((follow) => follow.followerId),
    ).size;
    const matchingCollections = seedData.collections.filter((collection) => collectionIds.has(collection.id));
    const overlay = getPlaceOverlayById(seedData, "demo", place.placeId!);

    expect(overlay).not.toBeNull();
    expect(overlay!.postCount).toBe(matchingPosts.length);
    expect(overlay!.collectionCount).toBe(collectionIds.size);
    expect(overlay!.followerCount).toBe(followerCount);
    expect(overlay!.recentActivityAt).toBe(
      maxIso([
        ...matchingLocations.flatMap((location) => [location.updatedAt, location.createdAt]),
        ...matchingPosts.flatMap((post) => [post.updatedAt, post.createdAt]),
        ...matchingCollections.flatMap((collection) => [collection.updatedAt, collection.createdAt]),
      ]),
    );
  });

  it("falls back safely when a place currently has no posts or collections", () => {
    const place = withCanonicalPlaceLinkage(seedData.locations[0]!);
    const locationOnlySnapshot = {
      ...seedData,
      locations: seedData.locations
        .map(withCanonicalPlaceLinkage)
        .filter((location) => location.placeId === place.placeId),
      posts: seedData.posts.filter(() => false),
      postTags: seedData.postTags.filter(() => false),
      postMedia: seedData.postMedia.filter(() => false),
      collectionPosts: seedData.collectionPosts.filter(() => false),
      collections: seedData.collections.filter(() => false),
      follows: seedData.follows.filter(() => false),
    };
    const overlay = getPlaceOverlayById(locationOnlySnapshot, "demo", place.placeId!);

    expect(overlay).not.toBeNull();
    expect(overlay!.postCount).toBe(0);
    expect(overlay!.collectionCount).toBe(0);
    expect(overlay!.followerCount).toBe(0);
    expect(overlay!.latestMediaPreview).toBeNull();
    expect(overlay!.curatorRefs).toEqual([]);
    expect(overlay!.hasExternalFeed).toBe(false);
    expect(overlay!.externalSurfaceHints.surfaces).toContain("place_overlay");
  });

  it("exports overlays in bulk by placeIds and placeKeys", () => {
    const firstPlace = withCanonicalPlaceLinkage(seedData.locations[0]!);
    const secondPlace = withCanonicalPlaceLinkage(seedData.locations[1]!);

    const payload = listPlaceOverlays(seedData, "demo", {
      placeIds: [firstPlace.placeId!],
      placeKeys: [secondPlace.placeKey!],
      limit: 10,
    });

    expect(payload.source).toBe("demo");
    expect(payload.count).toBe(2);
    expect(payload.items.map((item) => item.placeId).sort()).toEqual(
      [firstPlace.placeId!, secondPlace.placeId!].sort(),
    );
    expect(payload.generatedAt).toBeTruthy();
    expect(payload.maxUpdatedAt).toBe(
      maxIso(payload.items.map((item) => item.updatedAt)),
    );
  });

  it("filters bulk overlays by updatedAfter and keeps item shape consistent", () => {
    const allOverlays = listPlaceOverlays(seedData, "demo", {});
    const newestOverlay = allOverlays.items[0]!;
    const olderThanNewest = new Date(new Date(newestOverlay.updatedAt ?? 0).getTime() - 1).toISOString();

    const filtered = listPlaceOverlays(seedData, "demo", {
      updatedAfter: olderThanNewest,
      limit: 50,
    });
    const single = getPlaceOverlayById(seedData, "demo", newestOverlay.placeId);

    expect(filtered.items.length).toBeGreaterThan(0);
    expect(filtered.items.every((item) => new Date(item.updatedAt ?? 0).getTime() > new Date(olderThanNewest).getTime())).toBe(true);
    expect(filtered.items.find((item) => item.placeId === newestOverlay.placeId)).toEqual(single);
  });

  it("excludes overlays when updatedAfter equals the overlay updatedAt", () => {
    const allOverlays = listPlaceOverlays(seedData, "demo", {});
    const newestOverlay = allOverlays.items[0]!;
    const filtered = listPlaceOverlays(seedData, "demo", {
      updatedAfter: newestOverlay.updatedAt,
      limit: 50,
    });

    expect(filtered.items.every((item) => item.placeId !== newestOverlay.placeId)).toBe(true);
  });

  it("returns an empty bulk envelope cleanly when filters miss", () => {
    const payload = listPlaceOverlays(seedData, "demo", {
      placeIds: ["place_missing"],
      limit: 5,
    });

    expect(payload.items).toEqual([]);
    expect(payload.count).toBe(0);
    expect(payload.maxUpdatedAt).toBeNull();
  });
});
