import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/demo-data";
import {
  canAccessPost,
  createInitialLocalState,
  filterPosts,
  getCollectionItems,
  hydratePosts,
  makeCreatedPostBundle,
  mergeSnapshot,
  searchSnapshot,
} from "@/lib/discovery";
import { resolveCanonicalPlaceLinkage } from "@/lib/place-linkage";
import { createPostSchema } from "@/lib/validation";

describe("createPostSchema", () => {
  it("requires exact latitude and longitude", () => {
    const result = createPostSchema.safeParse({
      title: "Quiet pull-in",
      body: "A useful overnight lane with enough detail to pass minimum validation.",
      teaser: "Short teaser",
      topicId: "topic_001",
      visibilityType: "public",
      latitude: 120,
      longitude: 13.37,
      city: "Plzen",
      district: "Plzen-mesto",
      region: "Plzensky kraj",
      country: "CZ",
      tags: ["overnight"],
    });

    expect(result.success).toBe(false);
  });

  it("accepts optional canonical place linkage fields", () => {
    const result = createPostSchema.safeParse({
      title: "Quiet pull-in",
      body: "A useful overnight lane with enough detail to pass minimum validation.",
      teaser: "Short teaser",
      topicId: "topic_001",
      visibilityType: "public",
      latitude: 49.7475,
      longitude: 13.3776,
      address: "North bank trail, Plzen",
      placeName: "Bolevecky rybnik",
      placeId: "place_demo123",
      placeKey: "place/czech-republic/plzensky-kraj/plzen/named/bolevecky-rybnik",
      city: "Plzen",
      district: "Plzen-mesto",
      region: "Plzensky kraj",
      country: "CZ",
      tags: ["overnight"],
    });

    expect(result.success).toBe(true);
  });
});

describe("canonical place linkage", () => {
  it("keeps seeded demo locations place-linked", () => {
    expect(seedData.locations.length).toBeGreaterThan(0);
    expect(seedData.locations.every((location) => Boolean(location.placeId) && Boolean(location.placeKey))).toBe(true);
  });

  it("adds canonical place linkage to newly created local posts", () => {
    const bundle = makeCreatedPostBundle({
      viewerId: "user_001",
      title: "Signal-friendly work stop",
      body: "Enough detail to pass validation while keeping the existing local post flow intact for demo mode.",
      teaser: "Quiet place",
      topicId: "topic_001",
      visibilityType: "public",
      latitude: 49.7369,
      longitude: 13.4012,
      address: "Koterovska 152, Plzen",
      placeName: "TechTower",
      city: "Plzen",
      district: "Plzen-mesto",
      region: "Plzensky kraj",
      country: "CZ",
      tags: ["remote-work"],
    });

    expect(bundle.location.placeId).toMatch(/^place_/);
    expect(bundle.location.placeKey).toContain("/named/techtower");
  });

  it("derives stable place linkage when legacy location rows are temporarily null", () => {
    const baseLocation = seedData.locations[0]!;
    const expectedLinkage = resolveCanonicalPlaceLinkage({
      ...baseLocation,
      placeId: null,
      placeKey: null,
    });
    const snapshot = {
      ...seedData,
      locations: seedData.locations.map((location) =>
        location.id === baseLocation.id
          ? {
              ...location,
              placeId: null,
              placeKey: null,
            }
          : location,
      ),
    };
    const hydrated = hydratePosts(snapshot, null);
    const post = hydrated.find((entry) => entry.location.id === baseLocation.id);

    expect(post).toBeDefined();
    expect(post!.location.placeId).toBe(expectedLinkage.placeId);
    expect(post!.location.placeKey).toBe(expectedLinkage.placeKey);
    expect(post!.place.placeId).toBe(expectedLinkage.placeId);
    expect(post!.locationSummary.length).toBeGreaterThan(0);
  });

  it("exposes stable place metadata for collection reads", () => {
    const items = getCollectionItems(seedData, null, seedData.collections[0]!.id);

    expect(items.posts.length).toBeGreaterThan(0);
    expect(items.placeIds.length).toBeGreaterThan(0);
    expect(items.placeKeys.length).toBe(items.placeIds.length);
    expect(items.placeIds.every((placeId) => placeId.startsWith("place_"))).toBe(true);
  });
});

describe("entitlement logic", () => {
  it("unlocks subscriber-only posts for active subscribers", () => {
    const matchingSubscription = seedData.subscriptions.find((subscription) =>
      seedData.posts.some(
        (post) =>
          post.authorId === subscription.creatorId &&
          post.visibilityType === "subscriber_only",
      ),
    );
    expect(matchingSubscription).toBeDefined();

    const viewerId = matchingSubscription!.subscriberId;
    const snapshot = mergeSnapshot(seedData, createInitialLocalState(seedData, viewerId), viewerId);
    const post = seedData.posts.find(
      (entry) =>
        entry.authorId === matchingSubscription!.creatorId &&
        entry.visibilityType === "subscriber_only",
    );

    expect(post).toBeDefined();
    expect(canAccessPost(snapshot, viewerId, post!).canAccess).toBe(true);
    expect(canAccessPost(seedData, null, post!).canAccess).toBe(false);
  });

  it("unlocks special hidden places only for viewers with a special unlock entitlement", () => {
    const entitlement = seedData.entitlements.find(
      (entry) => entry.type === "special_unlock" && entry.postId,
    );
    expect(entitlement).toBeDefined();

    const unlockedSnapshot = mergeSnapshot(
      seedData,
      createInitialLocalState(seedData, entitlement!.userId),
      entitlement!.userId,
    );
    const post = seedData.posts.find((entry) => entry.id === entitlement!.postId)!;

    expect(canAccessPost(unlockedSnapshot, entitlement!.userId, post).canAccess).toBe(true);
    expect(canAccessPost(seedData, null, post).canAccess).toBe(false);
  });
});

describe("regional search and discovery", () => {
  it("filters posts to the selected region", () => {
    const hydrated = hydratePosts(seedData, null);
    const posts = filterPosts(seedData, hydrated, null, {
      mode: "regional",
      sortBy: "popular",
      regionId: "place-plzen-region",
      activeOnly: true,
      visibility: "all",
    });

    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((post) => post.location.region === "Plzensky kraj")).toBe(true);
  });

  it("searches places and posts from a free-text query", () => {
    const results = searchSnapshot(seedData, null, "Brdy");

    expect(results.places.some((place) => place.label.includes("Brdy"))).toBe(true);
    expect(results.posts.some((post) => post.post.title.toLowerCase().includes("brdy") || post.locationSummary.toLowerCase().includes("brdy"))).toBe(true);
  });

  it("matches countries through aliases without diacritics", () => {
    const results = searchSnapshot(seedData, null, "cechy");

    expect(results.places.some((place) => (place.country ?? "").toUpperCase() === "CZ")).toBe(true);
  });
});

describe("feed ranking and safety", () => {
  it("sorts popular feed by the popularity heuristic", () => {
    const hydrated = hydratePosts(seedData, null);
    const posts = filterPosts(seedData, hydrated, null, {
      mode: "popular",
      sortBy: "popular",
      activeOnly: true,
      visibility: "all",
    });

    expect(posts[0].popularityScore).toBeGreaterThanOrEqual(posts[1].popularityScore);
  });

  it("hides blocked users from the blocking viewer", () => {
    const viewerId = "user_001";
    const snapshot = mergeSnapshot(seedData, createInitialLocalState(seedData, viewerId), viewerId);
    const hydrated = hydratePosts(snapshot, viewerId);

    expect(hydrated.every((post) => post.author.id !== "user_011")).toBe(true);
  });
});
