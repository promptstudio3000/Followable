import type {
  AppSnapshot,
  Comment,
  CreatedPostBundle,
  DemoLocalState,
  DiscoveryFilters,
  Entitlement,
  Follow,
  UploadedMediaInput,
  HydratedComment,
  HydratedPost,
  Post,
  ProfileSubscription,
  Reaction,
  SavedPost,
  SearchPlace,
  SearchResults,
  SeedData,
  User,
} from "@/lib/types";
import { getCountrySearchIndex, normalizeSearchText } from "@/lib/countries";
import { getCollectionPlaceMetadata, getPostPlaceMetadata, withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import { searchTravelGroups } from "@/lib/travel-groups";
import { formatMoney, haversineKm, shortLocation } from "@/lib/utils";

const NOW = new Date("2026-03-14T10:00:00.000Z").getTime();

export function emptyLocalState(): DemoLocalState {
  return {
    followingIds: [],
    blockedUserIds: [],
    savedPostIds: [],
    subscriptionCreatorIds: [],
    unlockedPostIds: [],
    joinedGroupSlugs: [],
    itineraries: [],
    createdTravelGroups: [],
    reactionByPostId: {},
    createdComments: [],
    createdPosts: [],
    appendedPostMedia: [],
    reports: [],
    walletConnection: null,
  };
}

export function createInitialLocalState(base: SeedData, viewerId: string | null): DemoLocalState {
  if (!viewerId) {
    return emptyLocalState();
  }

  const baseFollowingIds = base.follows
    .filter((follow) => follow.followerId === viewerId)
    .map((follow) => follow.followedUserId);
  const baseBlockedIds = base.blockedUsers
    .filter((blocked) => blocked.blockerId === viewerId)
    .map((blocked) => blocked.blockedUserId);
  const baseSavedIds = base.savedPosts
    .filter((saved) => saved.userId === viewerId)
    .map((saved) => saved.postId);
  const baseSubscriptions = base.subscriptions
    .filter((subscription) => subscription.subscriberId === viewerId && subscription.status === "active")
    .map((subscription) => subscription.creatorId);
  const baseUnlocks = base.entitlements
    .filter(
      (entitlement) =>
        entitlement.userId === viewerId &&
        entitlement.type === "special_unlock" &&
        entitlement.status === "active" &&
        entitlement.postId,
    )
    .map((entitlement) => entitlement.postId!) as string[];
  const baseReactions = Object.fromEntries(
    base.reactions
      .filter((reaction) => reaction.userId === viewerId)
      .map((reaction) => [reaction.postId, reaction.type]),
  );

  return {
    followingIds: baseFollowingIds,
    blockedUserIds: baseBlockedIds,
    savedPostIds: baseSavedIds,
    subscriptionCreatorIds: baseSubscriptions,
    unlockedPostIds: baseUnlocks,
    joinedGroupSlugs: [],
    itineraries: [],
    createdTravelGroups: [],
    reactionByPostId: baseReactions,
    createdComments: [],
    createdPosts: [],
    appendedPostMedia: [],
    reports: [],
    walletConnection: null,
  };
}

export function mergeSnapshot(
  base: SeedData,
  localState: DemoLocalState,
  viewerId: string | null,
): AppSnapshot {
  if (!viewerId) {
    return {
      ...base,
      reports: [...base.reports, ...localState.reports],
    };
  }

  const follows: Follow[] = [
    ...base.follows.filter((follow) => follow.followerId !== viewerId),
    ...localState.followingIds.map((followedUserId, index) => ({
      id: `local_follow_${index + 1}`,
      followerId: viewerId,
      followedUserId,
      createdAt: new Date(NOW).toISOString(),
    })),
  ];

  const subscriptions: ProfileSubscription[] = [
    ...base.subscriptions.filter((subscription) => subscription.subscriberId !== viewerId),
    ...localState.subscriptionCreatorIds.map((creatorId, index) => ({
      id: `local_subscription_${index + 1}`,
      subscriberId: viewerId,
      creatorId,
      status: "active" as const,
      startedAt: new Date(NOW).toISOString(),
      expiresAt: null,
      paymentProvider: "mock-ready",
      createdAt: new Date(NOW).toISOString(),
      updatedAt: new Date(NOW).toISOString(),
    })),
  ];

  const savedPosts: SavedPost[] = [
    ...base.savedPosts.filter((saved) => saved.userId !== viewerId),
    ...localState.savedPostIds.map((postId, index) => ({
      id: `local_saved_${index + 1}`,
      userId: viewerId,
      postId,
      createdAt: new Date(NOW).toISOString(),
    })),
  ];

  const blockedUsers = [
    ...base.blockedUsers.filter((blocked) => blocked.blockerId !== viewerId),
    ...localState.blockedUserIds.map((blockedUserId, index) => ({
      id: `local_blocked_${index + 1}`,
      blockerId: viewerId,
      blockedUserId,
      createdAt: new Date(NOW).toISOString(),
    })),
  ];

  const reactions: Reaction[] = [
    ...base.reactions.filter((reaction) => reaction.userId !== viewerId),
    ...Object.entries(localState.reactionByPostId).map(([postId, type], index) => ({
      id: `local_reaction_${index + 1}`,
      userId: viewerId,
      postId,
      type,
      createdAt: new Date(NOW).toISOString(),
    })),
  ];

  const entitlements: Entitlement[] = [
    ...base.entitlements.filter(
      (entitlement) =>
        entitlement.userId !== viewerId ||
        (entitlement.type !== "subscription" && entitlement.type !== "special_unlock"),
    ),
    ...localState.subscriptionCreatorIds.map((creatorId, index) => ({
      id: `local_entitlement_subscription_${index + 1}`,
      userId: viewerId,
      creatorId,
      postId: null,
      type: "subscription" as const,
      status: "active" as const,
      createdAt: new Date(NOW).toISOString(),
      updatedAt: new Date(NOW).toISOString(),
    })),
    ...localState.unlockedPostIds.map((postId, index) => {
      const matchingPost = base.posts.find((post) => post.id === postId);
      return {
        id: `local_entitlement_unlock_${index + 1}`,
        userId: viewerId,
        creatorId: matchingPost?.authorId ?? null,
        postId,
        type: "special_unlock" as const,
        status: "active" as const,
        createdAt: new Date(NOW).toISOString(),
        updatedAt: new Date(NOW).toISOString(),
      };
    }),
  ];

  const locations = [...base.locations, ...localState.createdPosts.map((bundle) => bundle.location)];
  const posts = [...base.posts, ...localState.createdPosts.map((bundle) => bundle.post)];
  const postTags = [...base.postTags, ...localState.createdPosts.flatMap((bundle) => bundle.tags)];
  const postMedia = [
    ...base.postMedia,
    ...localState.createdPosts.flatMap((bundle) => bundle.media),
    ...(localState.appendedPostMedia ?? []),
  ];
  const comments = [...base.comments, ...localState.createdComments];
  const reports = [...base.reports, ...localState.reports];

  return {
    ...base,
    follows,
    subscriptions,
    entitlements,
    savedPosts,
    blockedUsers,
    reactions,
    locations,
    posts,
    postTags,
    postMedia,
    comments,
    reports,
  };
}

export function isPostActive(post: Post, nowTimestamp = NOW) {
  const startsAt = post.visibilityStart ? new Date(post.visibilityStart).getTime() : null;
  const endsAt = post.visibilityEnd ? new Date(post.visibilityEnd).getTime() : null;

  if (startsAt && startsAt > nowTimestamp) return false;
  if (endsAt && endsAt < nowTimestamp) return false;
  return true;
}

export function canAccessPost(snapshot: AppSnapshot, viewerId: string | null, post: Post) {
  if (post.visibilityType === "public") {
    return { canAccess: true, accessKind: "public" as const };
  }

  if (!viewerId) {
    return {
      canAccess: false,
      accessKind: "guest_locked" as const,
    };
  }

  if (post.authorId === viewerId) {
    return { canAccess: true, accessKind: "author" as const };
  }

  if (post.visibilityType === "subscriber_only") {
    const hasSubscription = snapshot.entitlements.some(
      (entitlement) =>
        entitlement.userId === viewerId &&
        entitlement.type === "subscription" &&
        entitlement.status === "active" &&
        entitlement.creatorId === post.authorId,
    );

    return {
      canAccess: hasSubscription,
      accessKind: hasSubscription ? ("subscription" as const) : ("unlock_required" as const),
    };
  }

  const hasUnlock = snapshot.entitlements.some(
    (entitlement) =>
      entitlement.userId === viewerId &&
      entitlement.type === "special_unlock" &&
      entitlement.status === "active" &&
      entitlement.postId === post.id,
  );

  return {
    canAccess: hasUnlock,
    accessKind: hasUnlock ? ("subscription" as const) : ("unlock_required" as const),
  };
}

function buildCommentTree(comments: Comment[], usersById: Map<string, User>) {
  const byParent = new Map<string | null, Comment[]>();
  comments.forEach((comment) => {
    const key = comment.parentCommentId ?? null;
    const existing = byParent.get(key) ?? [];
    existing.push(comment);
    byParent.set(key, existing);
  });

  const buildNode = (comment: Comment): HydratedComment => ({
    ...comment,
    author: usersById.get(comment.authorId)!,
    replies: (byParent.get(comment.id) ?? []).map(buildNode),
  });

  return (byParent.get(null) ?? []).map(buildNode);
}

function popularityScore(reactionCount: number, commentCount: number, saveCount: number, createdAt: string) {
  const ageHours = Math.max(1, (NOW - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  return reactionCount * 2 + commentCount * 3 + saveCount * 4 + Math.max(0, 48 - ageHours) * 0.6;
}

function maskCoordinate(value: number, modifier: number) {
  return Number((Math.round(value * 100) / 100 + modifier).toFixed(4));
}

export function hydratePosts(
  snapshot: AppSnapshot,
  viewerId: string | null,
  center: { latitude: number; longitude: number } | null = null,
): HydratedPost[] {
  const usersById = new Map(snapshot.users.map((user) => [user.id, user]));
  const topicsById = new Map(snapshot.topics.map((topic) => [topic.id, topic]));
  const locationsById = new Map(snapshot.locations.map((location) => [location.id, location]));
  const mediaByPostId = groupBy(snapshot.postMedia, (media) => media.postId);
  const tagsByPostId = groupBy(snapshot.postTags, (tag) => tag.postId);
  const commentsByPostId = groupBy(snapshot.comments, (comment) => comment.postId);
  const reactionsByPostId = groupBy(snapshot.reactions, (reaction) => reaction.postId);
  const savesByPostId = groupBy(snapshot.savedPosts, (saved) => saved.postId);
  const blockedIds = new Set(
    snapshot.blockedUsers
      .filter((entry) => entry.blockerId === viewerId)
      .map((entry) => entry.blockedUserId),
  );

  return snapshot.posts
    .filter((post) => !blockedIds.has(post.authorId))
    .map((post, index) => {
      const author = usersById.get(post.authorId)!;
      const location = withCanonicalPlaceLinkage(locationsById.get(post.locationId)!);
      const media = [...(mediaByPostId.get(post.id) ?? [])].sort((a, b) => a.order - b.order);
      const tags = (tagsByPostId.get(post.id) ?? []).map((tag) => tag.tag);
      const reactions = reactionsByPostId.get(post.id) ?? [];
      const rawComments = commentsByPostId.get(post.id) ?? [];
      const comments = buildCommentTree(rawComments, usersById);
      const savesCount = (savesByPostId.get(post.id) ?? []).length;
      const access = canAccessPost(snapshot, viewerId, post);
      const isActive = isPostActive(post);
      const distanceKm = center
        ? haversineKm(center.latitude, center.longitude, location.latitude, location.longitude)
        : null;
      const locationSummary = access.canAccess
        ? shortLocation(location)
        : [location.city, location.district, location.region, location.country]
            .filter(Boolean)
            .slice(0, 3)
            .join(", ");
      const displayLatitude = access.canAccess
        ? location.latitude
        : maskCoordinate(location.latitude, ((index % 4) - 1.5) * 0.008);
      const displayLongitude = access.canAccess
        ? location.longitude
        : maskCoordinate(location.longitude, ((index % 5) - 2) * 0.007);

      return {
        id: post.id,
        post,
        author,
        location,
        place: getPostPlaceMetadata({ location }),
        topic: post.topicId ? topicsById.get(post.topicId) ?? null : null,
        tags,
        media,
        reactions,
        comments,
        savesCount,
        popularityScore: popularityScore(reactions.length, rawComments.length, savesCount, post.createdAt),
        distanceKm,
        isActive,
        canAccess: access.canAccess,
        isLocked: !access.canAccess,
        accessKind: access.accessKind,
        displayLatitude,
        displayLongitude,
        locationSummary,
        regionKey: `${location.region ?? "unknown"}:${location.city ?? "unknown"}`,
        engagementCount: reactions.length + rawComments.length + savesCount,
      };
    });
}

export function filterPosts(
  snapshot: AppSnapshot,
  posts: HydratedPost[],
  viewerId: string | null,
  filters: DiscoveryFilters,
) {
  const followsSet = new Set(
    snapshot.follows
      .filter((follow) => follow.followerId === viewerId)
      .map((follow) => follow.followedUserId),
  );

  let filtered = posts.filter((post) => (filters.activeOnly ?? true ? post.isActive : true));

  if (filters.visibility && filters.visibility !== "all") {
    filtered = filtered.filter((post) => post.post.visibilityType === filters.visibility);
  }

  if (filters.topicSlug) {
    filtered = filtered.filter((post) => post.topic?.slug === filters.topicSlug);
  }

  if (filters.collectionSlug) {
    const collection = snapshot.collections.find((entry) => entry.slug === filters.collectionSlug);
    const collectionPostIds = new Set(
      snapshot.collectionPosts
        .filter((entry) => entry.collectionId === collection?.id)
        .map((entry) => entry.postId),
    );
    filtered = filtered.filter((post) => collectionPostIds.has(post.id));
  }

  if (filters.regionId) {
    const searchPlace =
      filters.regionPlace ?? snapshot.searchPlaces.find((place) => place.id === filters.regionId);
    if (searchPlace) {
      filtered = filtered.filter((post) => matchesSearchPlace(post, searchPlace));
    }
  }

  if (filters.tag) {
    filtered = filtered.filter((post) => post.tags.includes(filters.tag!));
  }

  if (filters.followingOnly || filters.mode === "following") {
    filtered = filtered.filter((post) => followsSet.has(post.author.id));
  }

  if (filters.searchQuery?.trim()) {
    const needle = filters.searchQuery.trim().toLowerCase();
    filtered = filtered.filter((post) => {
      const body = `${post.post.title} ${post.post.body} ${post.locationSummary} ${post.tags.join(" ")} ${post.author.displayName}`.toLowerCase();
      return body.includes(needle);
    });
  }

  if (filters.mode === "nearby" && filters.center) {
    filtered = filtered
      .filter((post) => post.distanceKm != null)
      .sort((left, right) => (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY));
  } else if (filters.sortBy === "popular" || filters.mode === "popular") {
    filtered = filtered.sort((left, right) => right.popularityScore - left.popularityScore);
  } else if (filters.sortBy === "nearby" && filters.center) {
    filtered = filtered.sort((left, right) => (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY));
  } else {
    filtered = filtered.sort(
      (left, right) => new Date(right.post.createdAt).getTime() - new Date(left.post.createdAt).getTime(),
    );
  }

  return filtered;
}

function matchesSearchPlace(post: HydratedPost, place: SearchPlace) {
  if (place.kind === "country") return post.location.country === place.country;
  if (place.kind === "region") return post.location.region === place.region;
  if (place.kind === "district") return post.location.district === place.district;
  if (place.kind === "city") return post.location.city === place.city || haversineKm(post.location.latitude, post.location.longitude, place.latitude, place.longitude) <= (place.radiusKm ?? 18);
  return haversineKm(post.location.latitude, post.location.longitude, place.latitude, place.longitude) <= (place.radiusKm ?? 15);
}

export function searchSnapshot(
  snapshot: AppSnapshot,
  viewerId: string | null,
  query: string,
  localState?: DemoLocalState,
): SearchResults {
  const rawNeedle = normalizeSearchText(query);
  const needle = rawNeedle.startsWith("#") ? rawNeedle.slice(1) : rawNeedle;
  const hydrated = hydratePosts(snapshot, viewerId);

  if (!needle) {
    return {
      places: snapshot.searchPlaces.slice(0, 6),
      creators: snapshot.users.slice(0, 6),
      posts: hydrated.slice(0, 6),
      topics: snapshot.topics.slice(0, 6),
      collections: snapshot.collections.slice(0, 6),
      tags: topTags(snapshot).slice(0, 12),
      groups: searchTravelGroups(snapshot, hydrated, "", localState).slice(0, 6),
    };
  }

  return {
    places: snapshot.searchPlaces.filter((place) => searchablePlace(place).includes(needle)).slice(0, 6),
    creators: snapshot.users
      .filter((user) => `${user.displayName} ${user.username} ${user.bio} ${user.homeRegion}`.toLowerCase().includes(needle))
      .slice(0, 6),
    posts: hydrated
      .filter((post) => `${post.post.title} ${post.post.body} ${post.tags.join(" ")} ${post.locationSummary}`.toLowerCase().includes(needle))
      .slice(0, 8),
    topics: snapshot.topics
      .filter((topic) => `${topic.name} ${topic.description} ${topic.slug}`.toLowerCase().includes(needle))
      .slice(0, 6),
    collections: snapshot.collections
      .filter((collection) => `${collection.title} ${collection.description}`.toLowerCase().includes(needle))
      .slice(0, 6),
    tags: topTags(snapshot).filter((tag) => tag.toLowerCase().includes(needle)).slice(0, 12),
    groups: searchTravelGroups(snapshot, hydrated, query, localState).slice(0, 6),
  };
}

function searchablePlace(place: SearchPlace) {
  const countryCode = (place.country ?? "").toUpperCase();
  const countrySearch = countryCode
    ? getCountrySearchIndex(countryCode, place.kind === "country" ? place.label : undefined)
    : "";
  return normalizeSearchText(
    `${place.label} ${place.city ?? ""} ${place.district ?? ""} ${place.region ?? ""} ${place.country ?? ""} ${countrySearch}`,
  );
}

function topTags(snapshot: AppSnapshot) {
  const counts = new Map<string, number>();
  snapshot.postTags.forEach((tag) => {
    counts.set(tag.tag, (counts.get(tag.tag) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([tag]) => tag);
}

export function getViewer(snapshot: AppSnapshot, viewerId: string | null) {
  return snapshot.users.find((user) => user.id === viewerId) ?? null;
}

export function getPostById(snapshot: AppSnapshot, viewerId: string | null, postId: string) {
  return hydratePosts(snapshot, viewerId).find((post) => post.id === postId) ?? null;
}

export function getCreatorByUsername(snapshot: AppSnapshot, username: string) {
  return snapshot.users.find((user) => user.username === username) ?? null;
}

export function getTopicBySlug(snapshot: AppSnapshot, slug: string) {
  return snapshot.topics.find((topic) => topic.slug === slug) ?? null;
}

export function getCollectionBySlug(snapshot: AppSnapshot, slug: string) {
  return snapshot.collections.find((collection) => collection.slug === slug) ?? null;
}

export function getCreatorStats(snapshot: AppSnapshot, userId: string) {
  const followerCount = snapshot.follows.filter((follow) => follow.followedUserId === userId).length;
  const postCount = snapshot.posts.filter((post) => post.authorId === userId).length;
  const collectionCount = snapshot.collections.filter((collection) => collection.ownerId === userId).length;
  const subscriptionCount = snapshot.subscriptions.filter(
    (subscription) => subscription.creatorId === userId && subscription.status === "active",
  ).length;
  return {
    followerCount,
    postCount,
    collectionCount,
    subscriptionCount,
  };
}

export function getCreatorPosts(snapshot: AppSnapshot, viewerId: string | null, userId: string) {
  return hydratePosts(snapshot, viewerId)
    .filter((post) => post.author.id === userId)
    .sort((left, right) => right.popularityScore - left.popularityScore);
}

export function getCollectionItems(snapshot: AppSnapshot, viewerId: string | null, collectionId: string) {
  const collectionPostIds = snapshot.collectionPosts
    .filter((entry) => entry.collectionId === collectionId)
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.postId);
  const postsById = new Map(hydratePosts(snapshot, viewerId).map((post) => [post.id, post]));
  const userIds = snapshot.collectionUsers
    .filter((entry) => entry.collectionId === collectionId)
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.userId);
  const usersById = new Map(snapshot.users.map((user) => [user.id, user]));

  const orderedPosts = collectionPostIds.map((postId) => postsById.get(postId)).filter(Boolean) as HydratedPost[];

  return {
    posts: orderedPosts,
    users: userIds.map((userId) => usersById.get(userId)).filter(Boolean) as User[],
    ...getCollectionPlaceMetadata(orderedPosts),
  };
}

export function getRegionHighlights(
  snapshot: AppSnapshot,
  viewerId: string | null,
  regionId: string | null,
  regionPlace?: SearchPlace | null,
) {
  const posts = hydratePosts(snapshot, viewerId);
  const filteredPosts = regionId
    ? filterPosts(snapshot, posts, viewerId, {
        mode: "regional",
        sortBy: "popular",
        regionId,
        regionPlace: regionPlace ?? null,
        activeOnly: true,
        visibility: "all",
      })
    : posts.filter((post) => post.isActive);

  const creatorCounts = new Map<string, number>();
  filteredPosts.forEach((post) => {
    creatorCounts.set(post.author.id, (creatorCounts.get(post.author.id) ?? 0) + 1);
  });

  const creators = [...creatorCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([creatorId]) => snapshot.users.find((user) => user.id === creatorId)!)
    .slice(0, 6);

  const topicCounts = new Map<string, number>();
  filteredPosts.forEach((post) => {
    if (post.topic?.slug) {
      topicCounts.set(post.topic.slug, (topicCounts.get(post.topic.slug) ?? 0) + 1);
    }
  });

  const activeTopics = [...topicCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([topicSlug]) => snapshot.topics.find((topic) => topic.slug === topicSlug)!)
    .slice(0, 5);

  return {
    creators,
    topics: activeTopics,
    posts: filteredPosts,
    postCount: filteredPosts.length,
    creatorCount: creators.length,
  };
}

export function topCreators(snapshot: AppSnapshot) {
  return [...snapshot.users]
    .sort((left, right) => {
      const leftStats = getCreatorStats(snapshot, left.id);
      const rightStats = getCreatorStats(snapshot, right.id);
      return rightStats.followerCount + rightStats.subscriptionCount * 2 - (leftStats.followerCount + leftStats.subscriptionCount * 2);
    })
    .slice(0, 8);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function topPostsLastMonth(snapshot: AppSnapshot, viewerId: string | null) {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return hydratePosts(snapshot, viewerId)
    .filter((post) => new Date(post.post.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime())
    .slice(0, 10);
}

export function topFollowedCreators(snapshot: AppSnapshot) {
  return [...snapshot.users]
    .sort((left, right) => {
      const leftF = getCreatorStats(snapshot, left.id).followerCount;
      const rightF = getCreatorStats(snapshot, right.id).followerCount;
      return rightF - leftF;
    })
    .slice(0, 10);
}

export function creatorSubscriptionLabel(snapshot: AppSnapshot, creatorId: string) {
  const creator = snapshot.users.find((user) => user.id === creatorId);
  if (!creator?.subscriptionPriceCzk) return null;
  return `${formatMoney(creator.subscriptionPriceCzk)} / month`;
}

function groupBy<TValue, TKey extends string>(values: TValue[], keyGetter: (value: TValue) => TKey) {
  return values.reduce((map, value) => {
    const key = keyGetter(value);
    const existing = map.get(key) ?? [];
    existing.push(value);
    map.set(key, existing);
    return map;
  }, new Map<TKey, TValue[]>());
}

export function makeCreatedPostBundle(input: {
  viewerId: string;
  title: string;
  body: string;
  topicId: string | null;
  visibilityType: Post["visibilityType"];
  teaser: string;
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  placeId?: string | null;
  placeKey?: string | null;
  city: string;
  district: string;
  region: string;
  country: string;
  specialPrice?: number | null;
  tags: string[];
  visibilityStart?: string | null;
  visibilityEnd?: string | null;
  media?: UploadedMediaInput[];
}): CreatedPostBundle {
  const stamp = `${Date.now()}`;
  const postId = `local_post_${stamp}`;
  const locationId = `local_location_${stamp}`;
  const nowIso = new Date().toISOString();

  return {
    location: withCanonicalPlaceLinkage({
      id: locationId,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address || null,
      placeName: input.placeName || null,
      placeId: input.placeId ?? null,
      placeKey: input.placeKey ?? null,
      city: input.city || null,
      district: input.district || null,
      region: input.region || null,
      country: input.country || null,
      geokey: `${input.latitude.toFixed(3)}:${input.longitude.toFixed(3)}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    post: {
      id: postId,
      authorId: input.viewerId,
      locationId,
      title: input.title,
      body: input.body,
      visibilityType: input.visibilityType,
      teaser: input.teaser,
      topicId: input.topicId,
      visibilityStart: input.visibilityStart || null,
      visibilityEnd: input.visibilityEnd || null,
      specialPrice: input.visibilityType === "special_hidden_place" ? input.specialPrice ?? 149 : null,
      currency: input.visibilityType === "special_hidden_place" ? "CZK" : null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    media:
      input.media && input.media.length > 0
        ? input.media.map((media, index) => ({
            id: `local_media_${stamp}_${index + 1}`,
            postId,
            type: media.type,
            url: media.url,
            alt: media.alt ?? `${input.placeName || input.title} media ${index + 1}`,
            blurDataUrl: media.blurDataUrl ?? null,
            order: index,
          }))
        : [
            {
              id: `local_media_${stamp}`,
              postId,
              type: "image",
              url: `https://picsum.photos/seed/${postId}/1200/900`,
              alt: `${input.placeName || input.title} preview`,
              blurDataUrl: null,
              order: 0,
            },
          ],
    tags: input.tags.map((tag, index) => ({
      id: `local_tag_${stamp}_${index + 1}`,
      postId,
      tag,
    })),
  };
}
