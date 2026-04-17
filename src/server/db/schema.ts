import {
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const visibilityTypeEnum = pgEnum("visibility_type", [
  "public",
  "subscriber_only",
  "special_hidden_place",
]);
export const reportTargetTypeEnum = pgEnum("report_target_type", ["post", "user"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "reviewing", "resolved"]);
export const entitlementTypeEnum = pgEnum("entitlement_type", ["subscription", "special_unlock"]);
export const entitlementStatusEnum = pgEnum("entitlement_status", ["active", "expired", "revoked"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const collectionVisibilityEnum = pgEnum("collection_visibility", ["public"]);
export const reactionTypeEnum = pgEnum("reaction_type", ["fire", "insight", "want", "thanks"]);
export const paymentAssetEnum = pgEnum("payment_asset", ["eth", "usdc"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "confirmed", "failed"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull(),
    avatarUrl: text("avatar_url").notNull(),
    homeRegion: text("home_region"),
    focusTopicSlugs: text("focus_topic_slugs").array().notNull().default([]),
    subscriptionPriceCzk: integer("subscription_price_czk"),
    walletAddress: text("wallet_address").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("users_home_region_idx").on(table.homeRegion)],
);

export const follows = pgTable(
  "follows",
  {
    id: text("id").primaryKey(),
    followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followedUserId: text("followed_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("follows_follower_idx").on(table.followerId),
    index("follows_followed_idx").on(table.followedUserId),
  ],
);

export const profileSubscriptions = pgTable(
  "profile_subscriptions",
  {
    id: text("id").primaryKey(),
    subscriberId: text("subscriber_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: entitlementStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paymentProvider: text("payment_provider"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("profile_subscriptions_subscriber_idx").on(table.subscriberId),
    index("profile_subscriptions_creator_idx").on(table.creatorId),
  ],
);

export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    coverImageUrl: text("cover_image_url"),
    topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
    visibility: collectionVisibilityEnum("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("collections_owner_idx").on(table.ownerId), index("collections_topic_idx").on(table.topicId)],
);

export const collectionPosts = pgTable(
  "collection_posts",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    postId: text("post_id").notNull(),
    order: integer("order_index").notNull(),
  },
  (table) => [index("collection_posts_collection_idx").on(table.collectionId), index("collection_posts_post_idx").on(table.postId)],
);

export const collectionUsers = pgTable(
  "collection_users",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    order: integer("order_index").notNull(),
  },
  (table) => [index("collection_users_collection_idx").on(table.collectionId), index("collection_users_user_idx").on(table.userId)],
);

export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    address: text("address"),
    placeName: text("place_name"),
    placeId: text("place_id"),
    placeKey: text("place_key"),
    city: text("city"),
    district: text("district"),
    region: text("region"),
    country: text("country"),
    geokey: text("geokey"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("locations_place_id_idx").on(table.placeId),
    index("locations_place_key_idx").on(table.placeKey),
    index("locations_city_idx").on(table.city),
    index("locations_region_idx").on(table.region),
    index("locations_country_idx").on(table.country),
    index("locations_geokey_idx").on(table.geokey),
  ],
);

export const adminDivisions = pgTable(
  "admin_divisions",
  {
    id: text("id").primaryKey(),
    geonameId: integer("geoname_id").notNull().unique(),
    countryCode: text("country_code").notNull(),
    level: integer("level").notNull(),
    featureCode: text("feature_code").notNull(),
    code: text("code").notNull().unique(),
    parentCode: text("parent_code"),
    name: text("name").notNull(),
    asciiName: text("ascii_name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
  },
  (table) => [
    index("admin_divisions_country_idx").on(table.countryCode),
    index("admin_divisions_level_idx").on(table.level),
    index("admin_divisions_parent_idx").on(table.parentCode),
    index("admin_divisions_code_idx").on(table.code),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    visibilityType: visibilityTypeEnum("visibility_type").notNull().default("public"),
    teaser: text("teaser"),
    topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
    visibilityStart: timestamp("visibility_start", { withTimezone: true }),
    visibilityEnd: timestamp("visibility_end", { withTimezone: true }),
    specialPrice: numeric("special_price", { precision: 10, scale: 2 }),
    currency: text("currency"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("posts_author_idx").on(table.authorId),
    index("posts_location_idx").on(table.locationId),
    index("posts_topic_idx").on(table.topicId),
    index("posts_visibility_idx").on(table.visibilityType),
  ],
);

export const postTags = pgTable(
  "post_tags",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [index("post_tags_post_idx").on(table.postId), index("post_tags_tag_idx").on(table.tag)],
);

export const postMedia = pgTable(
  "post_media",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    type: mediaTypeEnum("type").notNull().default("image"),
    url: text("url").notNull(),
    alt: text("alt"),
    blurDataUrl: text("blur_data_url"),
    order: integer("order_index").notNull(),
  },
  (table) => [index("post_media_post_idx").on(table.postId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("reactions_user_idx").on(table.userId), index("reactions_post_idx").on(table.postId)],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    parentCommentId: text("parent_comment_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("comments_post_idx").on(table.postId), index("comments_author_idx").on(table.authorId)],
);

export const savedPosts = pgTable(
  "saved_posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("saved_posts_user_idx").on(table.userId), index("saved_posts_post_idx").on(table.postId)],
);

export const blockedUsers = pgTable(
  "blocked_users",
  {
    id: text("id").primaryKey(),
    blockerId: text("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: text("blocked_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("blocked_users_blocker_idx").on(table.blockerId), index("blocked_users_blocked_idx").on(table.blockedUserId)],
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    status: reportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("reports_reporter_idx").on(table.reporterId), index("reports_target_idx").on(table.targetType, table.targetId)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    creatorId: text("creator_id").references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
    type: entitlementTypeEnum("type").notNull(),
    status: entitlementStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("entitlements_user_idx").on(table.userId),
    index("entitlements_creator_idx").on(table.creatorId),
    index("entitlements_post_idx").on(table.postId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    creatorId: text("creator_id").references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
    walletAddress: text("wallet_address").notNull(),
    chainId: integer("chain_id").notNull(),
    asset: paymentAssetEnum("asset").notNull(),
    recipientAddress: text("recipient_address").notNull(),
    tokenAddress: text("token_address"),
    amountAtomic: text("amount_atomic").notNull(),
    amountDisplay: text("amount_display").notNull(),
    txHash: text("tx_hash").notNull().unique(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    targetType: entitlementTypeEnum("target_type").notNull(),
    explorerUrl: text("explorer_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("payments_user_idx").on(table.userId),
    index("payments_post_idx").on(table.postId),
    index("payments_creator_idx").on(table.creatorId),
    index("payments_tx_hash_idx").on(table.txHash),
    index("payments_target_idx").on(table.targetType),
  ],
);
