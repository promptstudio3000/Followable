import { slugify } from "@/lib/utils";
import { withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import type {
  Location,
  PlaceOverlayBulkEnvelope,
  PlaceOverlay,
  PlaceOverlayCuratorRef,
  PlaceOverlayMediaPreview,
  PlaceOverlaySource,
  SeedData,
} from "@/lib/types";

type PlaceLinkedLocation = Location & {
  placeId: string;
  placeKey: string;
};

const DEFAULT_BULK_OVERLAY_LIMIT = 100;
const MAX_BULK_OVERLAY_LIMIT = 100;

function isoMax(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function unique<TValue>(values: TValue[]) {
  return [...new Set(values)];
}

function normalizeFilterValues(values?: string[]) {
  return unique(
    (values ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function coerceOverlayLimit(limit?: number | null) {
  if (limit == null || !Number.isFinite(limit)) {
    return DEFAULT_BULK_OVERLAY_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_BULK_OVERLAY_LIMIT);
}

function buildOverlaySlug(input: {
  placeId: string;
  placeName?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
}) {
  const label =
    input.placeName ??
    input.city ??
    input.district ??
    input.region ??
    input.placeId;

  return `${slugify(label) || "place"}-${input.placeId.replace(/^place_/, "").slice(0, 8)}`;
}

function sortCurators(left: PlaceOverlayCuratorRef, right: PlaceOverlayCuratorRef) {
  if (right.postCount !== left.postCount) return right.postCount - left.postCount;
  if (right.followerCount !== left.followerCount) return right.followerCount - left.followerCount;
  return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime();
}

function sortOverlays(left: PlaceOverlay, right: PlaceOverlay) {
  const rightUpdated = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
  const leftUpdated = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
  if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;
  return left.placeId.localeCompare(right.placeId);
}

export function getPlaceOverlayById(
  snapshot: SeedData,
  source: PlaceOverlaySource,
  placeId: string,
): PlaceOverlay | null {
  const normalizedLocations = snapshot.locations.map(withCanonicalPlaceLinkage);
  const matchingLocations = normalizedLocations.filter((location) => location.placeId === placeId);
  return matchingLocations.length > 0 ? buildPlaceOverlay(snapshot, source, matchingLocations as PlaceLinkedLocation[]) : null;
}

export function getPlaceOverlayByKey(
  snapshot: SeedData,
  source: PlaceOverlaySource,
  placeKey: string,
): PlaceOverlay | null {
  const normalizedLocations = snapshot.locations.map(withCanonicalPlaceLinkage);
  const matchingLocations = normalizedLocations.filter((location) => location.placeKey === placeKey);
  return matchingLocations.length > 0 ? buildPlaceOverlay(snapshot, source, matchingLocations as PlaceLinkedLocation[]) : null;
}

export function listPlaceOverlays(
  snapshot: SeedData,
  source: PlaceOverlaySource,
  options: {
    placeIds?: string[];
    placeKeys?: string[];
    updatedAfter?: string | null;
    limit?: number | null;
  } = {},
): PlaceOverlayBulkEnvelope {
  const normalizedLocations = snapshot.locations.map(withCanonicalPlaceLinkage) as PlaceLinkedLocation[];
  const locationsByPlaceId = normalizedLocations.reduce((map, location) => {
    const existing = map.get(location.placeId) ?? [];
    existing.push(location);
    map.set(location.placeId, existing);
    return map;
  }, new Map<string, PlaceLinkedLocation[]>());

  let overlays = [...locationsByPlaceId.entries()].map(([, locations]) => buildPlaceOverlay(snapshot, source, locations));

  const placeIdFilter = new Set(normalizeFilterValues(options.placeIds));
  const placeKeyFilter = new Set(normalizeFilterValues(options.placeKeys));
  if (placeIdFilter.size > 0 || placeKeyFilter.size > 0) {
    overlays = overlays.filter(
      (overlay) => placeIdFilter.has(overlay.placeId) || placeKeyFilter.has(overlay.placeKey),
    );
  }

  const updatedAfterTimestamp = options.updatedAfter ? new Date(options.updatedAfter).getTime() : Number.NaN;
  if (!Number.isNaN(updatedAfterTimestamp)) {
    overlays = overlays.filter((overlay) => {
      if (!overlay.updatedAt) return false;
      return new Date(overlay.updatedAt).getTime() > updatedAfterTimestamp;
    });
  }

  const boundedLimit = coerceOverlayLimit(options.limit);

  overlays = overlays.sort(sortOverlays);
  overlays = overlays.slice(0, boundedLimit);

  const generatedAt = new Date().toISOString();
  const maxUpdatedAt = isoMax(overlays.map((overlay) => overlay.updatedAt));
  return {
    items: overlays,
    count: overlays.length,
    source,
    generatedAt,
    maxUpdatedAt,
  } satisfies PlaceOverlayBulkEnvelope;
}

function buildPlaceOverlay(
  snapshot: SeedData,
  source: PlaceOverlaySource,
  locations: PlaceLinkedLocation[],
): PlaceOverlay {
  const primaryLocation = [...locations].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )[0]!;
  const locationIds = new Set(locations.map((location) => location.id));
  const posts = snapshot.posts.filter((post) => locationIds.has(post.locationId));
  const postIds = new Set(posts.map((post) => post.id));
  const collections = snapshot.collections.filter((collection) =>
    snapshot.collectionPosts.some((entry) => entry.collectionId === collection.id && postIds.has(entry.postId)),
  );
  const collectionIds = unique(collections.map((collection) => collection.id));
  const overlayMedia = snapshot.postMedia
    .filter((media) => postIds.has(media.postId))
    .sort((left, right) => {
      const leftPost = posts.find((post) => post.id === left.postId);
      const rightPost = posts.find((post) => post.id === right.postId);
      const timeDelta =
        new Date(rightPost?.updatedAt ?? rightPost?.createdAt ?? 0).getTime() -
        new Date(leftPost?.updatedAt ?? leftPost?.createdAt ?? 0).getTime();
      if (timeDelta !== 0) return timeDelta;
      return left.order - right.order;
    });
  const latestMediaPreview: PlaceOverlayMediaPreview | null = overlayMedia[0]
    ? {
        postId: overlayMedia[0].postId,
        mediaUrl: overlayMedia[0].url,
        mediaType: overlayMedia[0].type,
        alt: overlayMedia[0].alt ?? null,
        authorId: posts.find((post) => post.id === overlayMedia[0].postId)?.authorId ?? "unknown",
        createdAt:
          posts.find((post) => post.id === overlayMedia[0].postId)?.updatedAt ??
          posts.find((post) => post.id === overlayMedia[0].postId)?.createdAt ??
          primaryLocation.updatedAt,
      }
    : null;

  const curatorIds = unique(posts.map((post) => post.authorId));
  const allCuratorRefs = curatorIds
    .map((userId) => {
      const user = snapshot.users.find((entry) => entry.id === userId);
      if (!user) return null;

      const curatorPosts = posts.filter((post) => post.authorId === userId);
      const followerIds = unique(
        snapshot.follows
          .filter((follow) => follow.followedUserId === userId)
          .map((follow) => follow.followerId),
      );

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        postCount: curatorPosts.length,
        followerCount: followerIds.length,
        lastActiveAt: isoMax(curatorPosts.flatMap((post) => [post.updatedAt, post.createdAt])) ?? user.updatedAt,
      } satisfies PlaceOverlayCuratorRef;
    })
    .filter((value): value is PlaceOverlayCuratorRef => value !== null)
    .sort(sortCurators);
  const curatorRefs = allCuratorRefs.slice(0, 6);

  const followerCount = unique(
    curatorIds.flatMap((userId) =>
      snapshot.follows
        .filter((follow) => follow.followedUserId === userId)
        .map((follow) => follow.followerId),
    ),
  ).length;

  const postTags = unique(
    snapshot.postTags
      .filter((tag) => postIds.has(tag.postId))
      .map((tag) => tag.tag),
  ).slice(0, 8);
  const topicSlugs = unique(
    posts
      .map((post) => snapshot.topics.find((topic) => topic.id === post.topicId)?.slug ?? null)
      .filter(Boolean) as string[],
  ).slice(0, 5);
  const relatedComments = snapshot.comments.filter((comment) => postIds.has(comment.postId));
  const relatedReactions = snapshot.reactions.filter((reaction) => postIds.has(reaction.postId));
  const relatedSaves = snapshot.savedPosts.filter((saved) => postIds.has(saved.postId));

  const recentActivityAt = isoMax([
    ...locations.flatMap((location) => [location.updatedAt, location.createdAt]),
    ...posts.flatMap((post) => [post.updatedAt, post.createdAt]),
    ...collections.flatMap((collection) => [collection.updatedAt, collection.createdAt]),
    ...relatedComments.flatMap((comment) => [comment.updatedAt, comment.createdAt]),
    ...relatedReactions.map((reaction) => reaction.createdAt),
    ...relatedSaves.map((saved) => saved.createdAt),
  ]);

  const surfaces = [
    "place_overlay",
    posts.length > 0 ? "external_feed" : null,
    latestMediaPreview ? "media_preview" : null,
    collectionIds.length > 0 ? "collections" : null,
    curatorRefs.length > 0 ? "curators" : null,
  ].filter(Boolean) as string[];

  return {
    placeId: primaryLocation.placeId!,
    placeKey: primaryLocation.placeKey!,
    followable: {
      enabled: true,
      slug: buildOverlaySlug({
        placeId: primaryLocation.placeId!,
        placeName: primaryLocation.placeName,
        city: primaryLocation.city,
        district: primaryLocation.district,
        region: primaryLocation.region,
      }),
    },
    followerCount,
    recentActivityAt,
    postCount: posts.length,
    collectionCount: collectionIds.length,
    latestMediaPreview,
    curatorRefs,
    hasExternalFeed: posts.length > 0,
    externalSurfaceHints: {
      surfaces,
      primaryTopicSlugs: topicSlugs,
      sampleTags: postTags,
    },
    source,
    updatedAt: recentActivityAt,
  };
}
