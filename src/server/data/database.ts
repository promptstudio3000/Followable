import { and, eq, or } from "drizzle-orm";
import { resolveCanonicalPlaceLinkage, withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import type { CreatePostInput } from "@/lib/validation";
import type { CreatedPostBundle, SeedData, UploadedMediaInput } from "@/lib/types";
import { buildAdminDivisionSearchPlaces } from "@/server/data/admin-divisions";
import { getDatabase } from "@/server/db/client";
import {
  adminDivisions,
  blockedUsers,
  collectionPosts,
  collectionUsers,
  collections,
  comments,
  entitlements,
  follows,
  locations,
  payments,
  postMedia,
  posts,
  postTags,
  profileSubscriptions,
  reactions,
  reports,
  savedPosts,
  topics,
  users,
} from "@/server/db/schema";

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  return typeof value === "number" ? value : Number(value);
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function uniqueSearchPlaces(places: SeedData["searchPlaces"]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}

export async function getDatabaseSnapshot(): Promise<SeedData> {
  const { db } = getDatabase();

  const [
    userRows,
    followRows,
    subscriptionRows,
    topicRows,
    collectionRows,
    collectionPostRows,
    collectionUserRows,
    locationRows,
    postRows,
    postTagRows,
    postMediaRows,
    reactionRows,
    commentRows,
    savedRows,
    blockedRows,
    reportRows,
    entitlementRows,
    paymentRows,
    adminDivisionRows,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(follows),
    db.select().from(profileSubscriptions),
    db.select().from(topics),
    db.select().from(collections),
    db.select().from(collectionPosts),
    db.select().from(collectionUsers),
    db.select().from(locations),
    db.select().from(posts),
    db.select().from(postTags),
    db.select().from(postMedia),
    db.select().from(reactions),
    db.select().from(comments),
    db.select().from(savedPosts),
    db.select().from(blockedUsers),
    db.select().from(reports),
    db.select().from(entitlements),
    db.select().from(payments),
    db.select().from(adminDivisions).where(or(eq(adminDivisions.level, 0), eq(adminDivisions.level, 1))),
  ]);

  /* DB mode avoids importing the full in-memory demo snapshot (createSeedData is heavy). */
  const seedLocalSearchPlaces: SeedData["searchPlaces"] = [];
  const adminSearchPlaces = buildAdminDivisionSearchPlaces(
    adminDivisionRows.map((row) => ({
      id: row.id,
      geonameId: row.geonameId,
      countryCode: row.countryCode,
      level: row.level as 0 | 1 | 2 | 3 | 4,
      featureCode: row.featureCode,
      code: row.code,
      parentCode: row.parentCode ?? null,
      name: row.name,
      asciiName: row.asciiName,
      latitude: row.latitude,
      longitude: row.longitude,
    })),
    { maxLevel: 1, includeCountries: true },
  );

  return {
    users: userRows.map((row) => ({
      ...row,
      homeRegion: row.homeRegion ?? null,
      focusTopicSlugs: row.focusTopicSlugs ?? [],
      subscriptionPriceCzk: row.subscriptionPriceCzk ?? null,
      walletAddress: row.walletAddress ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    follows: followRows.map((row) => ({ ...row, createdAt: iso(row.createdAt)! })),
    subscriptions: subscriptionRows.map((row) => ({
      ...row,
      expiresAt: iso(row.expiresAt),
      paymentProvider: row.paymentProvider ?? null,
      createdAt: iso(row.createdAt)!,
      startedAt: iso(row.startedAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    topics: topicRows.map((row) => ({ ...row, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
    collections: collectionRows.map((row) => ({
      ...row,
      coverImageUrl: row.coverImageUrl ?? null,
      topicId: row.topicId ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    collectionPosts: collectionPostRows.map((row) => ({ ...row, order: row.order })),
    collectionUsers: collectionUserRows.map((row) => ({ ...row, order: row.order })),
    locations: locationRows.map((row) => withCanonicalPlaceLinkage({
      ...row,
      address: row.address ?? null,
      placeName: row.placeName ?? null,
      placeId: row.placeId ?? null,
      placeKey: row.placeKey ?? null,
      city: row.city ?? null,
      district: row.district ?? null,
      region: row.region ?? null,
      country: row.country ?? null,
      geokey: row.geokey ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    posts: postRows.map((row) => ({
      ...row,
      teaser: row.teaser ?? null,
      topicId: row.topicId ?? null,
      visibilityStart: iso(row.visibilityStart),
      visibilityEnd: iso(row.visibilityEnd),
      specialPrice: toNumber(row.specialPrice),
      currency: row.currency ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    postTags: postTagRows,
    postMedia: postMediaRows.map((row) => ({
      ...row,
      alt: row.alt ?? null,
      blurDataUrl: row.blurDataUrl ?? null,
      order: row.order,
    })),
    reactions: reactionRows.map((row) => ({ ...row, createdAt: iso(row.createdAt)! })),
    comments: commentRows.map((row) => ({
      ...row,
      parentCommentId: row.parentCommentId ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    savedPosts: savedRows.map((row) => ({ ...row, createdAt: iso(row.createdAt)! })),
    blockedUsers: blockedRows.map((row) => ({ ...row, createdAt: iso(row.createdAt)! })),
    reports: reportRows.map((row) => ({
      ...row,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    entitlements: entitlementRows.map((row) => ({
      ...row,
      creatorId: row.creatorId ?? null,
      postId: row.postId ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    payments: paymentRows.map((row) => ({
      ...row,
      creatorId: row.creatorId ?? null,
      postId: row.postId ?? null,
      tokenAddress: row.tokenAddress ?? null,
      explorerUrl: row.explorerUrl ?? null,
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    searchPlaces: uniqueSearchPlaces([...seedLocalSearchPlaces, ...adminSearchPlaces]),
  };
}

export async function createDatabasePost(input: {
  viewerId: string;
  payload: CreatePostInput;
  media?: UploadedMediaInput[];
}): Promise<CreatedPostBundle> {
  const { db } = getDatabase();
  const nowIso = new Date().toISOString();
  const locationId = createId("location");
  const postId = createId("post");
  const placeLinkage = resolveCanonicalPlaceLinkage({
    latitude: input.payload.latitude,
    longitude: input.payload.longitude,
    address: input.payload.address ?? null,
    placeName: input.payload.placeName ?? null,
    placeId: input.payload.placeId ?? null,
    placeKey: input.payload.placeKey ?? null,
    city: input.payload.city,
    district: input.payload.district ?? null,
    region: input.payload.region,
    country: input.payload.country,
    geokey: `${input.payload.latitude.toFixed(3)}:${input.payload.longitude.toFixed(3)}`,
  });

  await db.transaction(async (tx) => {
    await tx.insert(locations).values({
      id: locationId,
      latitude: input.payload.latitude,
      longitude: input.payload.longitude,
      address: input.payload.address ?? null,
      placeName: input.payload.placeName ?? null,
      placeId: placeLinkage.placeId,
      placeKey: placeLinkage.placeKey,
      city: input.payload.city,
      district: input.payload.district ?? null,
      region: input.payload.region,
      country: input.payload.country,
      geokey: `${input.payload.latitude.toFixed(3)}:${input.payload.longitude.toFixed(3)}`,
      createdAt: new Date(nowIso),
      updatedAt: new Date(nowIso),
    });

    await tx.insert(posts).values({
      id: postId,
      authorId: input.viewerId,
      locationId,
      title: input.payload.title,
      body: input.payload.body,
      visibilityType: input.payload.visibilityType,
      teaser: input.payload.teaser ?? null,
      topicId: input.payload.topicId ?? null,
      visibilityStart: input.payload.visibilityStart ? new Date(input.payload.visibilityStart) : null,
      visibilityEnd: input.payload.visibilityEnd ? new Date(input.payload.visibilityEnd) : null,
      specialPrice:
        input.payload.visibilityType === "special_hidden_place" && input.payload.specialPrice != null
          ? String(input.payload.specialPrice)
          : null,
      currency: input.payload.visibilityType === "special_hidden_place" ? "CZK" : null,
      createdAt: new Date(nowIso),
      updatedAt: new Date(nowIso),
    });

    if (input.payload.tags.length > 0) {
      await tx.insert(postTags).values(
        input.payload.tags.map((tag, index) => ({
          id: createId(`tag${index + 1}`),
          postId,
          tag,
        })),
      );
    }

    const mediaToInsert = (input.media && input.media.length > 0
      ? input.media
      : [
          {
            type: "image" as const,
            url: `https://picsum.photos/seed/${postId}/1200/900`,
            alt: `${input.payload.placeName || input.payload.title} preview`,
            blurDataUrl: null,
          },
        ]);

    await tx.insert(postMedia).values(
      mediaToInsert.map((media, index) => ({
        id: createId(`media${index + 1}`),
        postId,
        type: media.type,
        url: media.url,
        alt: media.alt ?? null,
        blurDataUrl: media.blurDataUrl ?? null,
        order: index,
      })),
    );
  });

  return {
    location: {
      id: locationId,
      latitude: input.payload.latitude,
      longitude: input.payload.longitude,
      address: input.payload.address ?? null,
      placeName: input.payload.placeName ?? null,
      placeId: placeLinkage.placeId,
      placeKey: placeLinkage.placeKey,
      city: input.payload.city,
      district: input.payload.district ?? null,
      region: input.payload.region,
      country: input.payload.country,
      geokey: `${input.payload.latitude.toFixed(3)}:${input.payload.longitude.toFixed(3)}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    post: {
      id: postId,
      authorId: input.viewerId,
      locationId,
      title: input.payload.title,
      body: input.payload.body,
      visibilityType: input.payload.visibilityType,
      teaser: input.payload.teaser ?? null,
      topicId: input.payload.topicId ?? null,
      visibilityStart: input.payload.visibilityStart ?? null,
      visibilityEnd: input.payload.visibilityEnd ?? null,
      specialPrice:
        input.payload.visibilityType === "special_hidden_place" ? input.payload.specialPrice ?? null : null,
      currency: input.payload.visibilityType === "special_hidden_place" ? "CZK" : null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    tags: input.payload.tags.map((tag, index) => ({
      id: `${postId}_tag_${index + 1}`,
      postId,
      tag,
    })),
    media: (input.media && input.media.length > 0
      ? input.media
      : [
          {
            type: "image" as const,
            url: `https://picsum.photos/seed/${postId}/1200/900`,
            alt: `${input.payload.placeName || input.payload.title} preview`,
            blurDataUrl: null,
          },
        ]).map((media, index) => ({
      id: `${postId}_media_${index + 1}`,
      postId,
      type: media.type,
      url: media.url,
      alt: media.alt ?? null,
      blurDataUrl: media.blurDataUrl ?? null,
      order: index,
    })),
  };
}

export async function createDatabaseComment(input: {
  viewerId: string;
  postId: string;
  body: string;
  parentCommentId?: string | null;
}) {
  const { db } = getDatabase();
  const now = new Date();
  const commentId = createId("comment");

  const existingPost = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, input.postId)).limit(1);
  if (existingPost.length === 0) {
    throw new Error("Post not found.");
  }

  if (input.parentCommentId) {
    const existingParent = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, input.parentCommentId), eq(comments.postId, input.postId)))
      .limit(1);
    if (existingParent.length === 0) {
      throw new Error("Parent comment not found.");
    }
  }

  await db.insert(comments).values({
    id: commentId,
    postId: input.postId,
    authorId: input.viewerId,
    parentCommentId: input.parentCommentId ?? null,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: commentId,
    postId: input.postId,
    authorId: input.viewerId,
    parentCommentId: input.parentCommentId ?? null,
    body: input.body,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
