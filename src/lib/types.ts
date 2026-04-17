export type VisibilityType = "public" | "subscriber_only" | "special_hidden_place";
export type ReactionType = "fire" | "insight" | "want" | "thanks";
export type CollectionVisibility = "public";
export type ReportTargetType = "post" | "user";
export type ReportStatus = "open" | "reviewing" | "resolved";
export type EntitlementType = "subscription" | "special_unlock";
export type EntitlementStatus = "active" | "expired" | "revoked";
export type SearchPlaceKind = "poi" | "city" | "district" | "region" | "country";
export type FeedMode = "nearby" | "following" | "popular" | "newest" | "topic" | "collection" | "regional";
export type SortMode = "popular" | "newest" | "nearby";
export type AppMode = "demo" | "database";
export type GeocodingMode = "mapbox" | "nominatim" | "seeded";
export type StorageMode = "vercel-blob" | "inline-demo";
export type WalletProvider = "metamask" | "rabby" | "injected";
export type PaymentAsset = "eth" | "usdc";
export type PaymentStatus = "pending" | "confirmed" | "failed";
export type MapMode = "demo-style" | "custom-style";
export type TravelGroupAccessType = "public" | "private" | "paid";
export type TravelGroupJoinMode =
  | "open"
  | "invite_code"
  | "password"
  | "questionnaire"
  | "paid_subscription";

export type User = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  homeRegion?: string | null;
  focusTopicSlugs: string[];
  subscriptionPriceCzk?: number | null;
  walletAddress?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Follow = {
  id: string;
  followerId: string;
  followedUserId: string;
  createdAt: string;
};

export type ProfileSubscription = {
  id: string;
  subscriberId: string;
  creatorId: string;
  status: EntitlementStatus;
  startedAt: string;
  expiresAt?: string | null;
  paymentProvider?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  topicId?: string | null;
  visibility: CollectionVisibility;
  createdAt: string;
  updatedAt: string;
};

export type CollectionPost = {
  id: string;
  collectionId: string;
  postId: string;
  order: number;
};

export type CollectionUser = {
  id: string;
  collectionId: string;
  userId: string;
  order: number;
};

export type CanonicalPlaceLinkSource = "stored" | "derived";

export type CanonicalPlaceLinkage = {
  placeId: string;
  placeKey: string;
  source: CanonicalPlaceLinkSource;
};

export type PlaceOverlaySource = "demo" | "database";

export type PlaceOverlayFollowable = {
  enabled: boolean;
  slug: string;
};

export type PlaceOverlayMediaPreview = {
  postId: string;
  mediaUrl: string;
  mediaType: PostMedia["type"];
  alt?: string | null;
  authorId: string;
  createdAt: string;
};

export type PlaceOverlayCuratorRef = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  postCount: number;
  followerCount: number;
  lastActiveAt: string;
};

export type PlaceOverlaySurfaceHints = {
  surfaces: string[];
  primaryTopicSlugs: string[];
  sampleTags: string[];
};

export type PlaceOverlay = {
  placeId: string;
  placeKey: string;
  followable: PlaceOverlayFollowable;
  followerCount: number;
  recentActivityAt: string | null;
  postCount: number;
  collectionCount: number;
  latestMediaPreview: PlaceOverlayMediaPreview | null;
  curatorRefs: PlaceOverlayCuratorRef[];
  hasExternalFeed: boolean;
  externalSurfaceHints: PlaceOverlaySurfaceHints;
  source: PlaceOverlaySource;
  updatedAt: string | null;
};

export type PlaceOverlayBulkEnvelope = {
  items: PlaceOverlay[];
  count: number;
  source: PlaceOverlaySource;
  generatedAt: string;
  maxUpdatedAt: string | null;
};

export type Location = {
  id: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  placeName?: string | null;
  placeId?: string | null;
  placeKey?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
  geokey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: string;
  authorId: string;
  locationId: string;
  title: string;
  body: string;
  visibilityType: VisibilityType;
  teaser?: string | null;
  topicId?: string | null;
  visibilityStart?: string | null;
  visibilityEnd?: string | null;
  specialPrice?: number | null;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostTag = {
  id: string;
  postId: string;
  tag: string;
};

export type PostMedia = {
  id: string;
  postId: string;
  type: "image" | "video";
  url: string;
  alt?: string | null;
  order: number;
  blurDataUrl?: string | null;
};

export type Reaction = {
  id: string;
  userId: string;
  postId: string;
  type: ReactionType;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedPost = {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
};

export type BlockedUser = {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
};

export type Report = {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type Entitlement = {
  id: string;
  userId: string;
  creatorId?: string | null;
  postId?: string | null;
  type: EntitlementType;
  status: EntitlementStatus;
  createdAt: string;
  updatedAt: string;
};

export type SearchPlace = {
  id: string;
  kind: SearchPlaceKind;
  label: string;
  latitude: number;
  longitude: number;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
  radiusKm?: number | null;
};

export type ExternalMapPoiSource = "wikipedia";

export type ExternalMapPoi = {
  id: string;
  source: ExternalMapPoiSource;
  pageId: number;
  title: string;
  description?: string | null;
  summary?: string | null;
  thumbnailUrl?: string | null;
  articleUrl: string;
  latitude: number;
  longitude: number;
};

export type ExternalMapPoiDetail = {
  id: string;
  source: ExternalMapPoiSource;
  pageId: number;
  title: string;
  description?: string | null;
  summary?: string | null;
  extract?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  articleUrl: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type CreatedPostBundle = {
  post: Post;
  location: Location;
  media: PostMedia[];
  tags: PostTag[];
};

export type UploadedMediaInput = {
  type: "image" | "video";
  url: string;
  alt?: string | null;
  blurDataUrl?: string | null;
};

export type GeocodeCandidate = {
  label: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  placeName?: string | null;
  placeId?: string | null;
  placeKey?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
  source: GeocodingMode;
};

export type WalletConnection = {
  address: string;
  chainId?: string | null;
  provider: WalletProvider;
  connectedAt: string;
};

export type WalletAuthStatus = "disabled" | "enabled";

export type PaymentTarget = {
  type: "subscription" | "special_unlock";
  creatorId?: string | null;
  postId?: string | null;
};

export type PaymentQuote = {
  asset: PaymentAsset;
  chainId: number;
  chainName: string;
  recipientAddress: string;
  tokenAddress?: string | null;
  amountAtomic: string;
  amountDisplay: string;
  quotedPriceCzk: number;
  explorerTxBaseUrl?: string | null;
  target: PaymentTarget;
};

export type PaymentRecord = {
  id: string;
  userId: string;
  creatorId?: string | null;
  postId?: string | null;
  walletAddress: string;
  chainId: number;
  asset: PaymentAsset;
  recipientAddress: string;
  tokenAddress?: string | null;
  amountAtomic: string;
  amountDisplay: string;
  txHash: string;
  status: PaymentStatus;
  targetType: "subscription" | "special_unlock";
  explorerUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchGroupHit = {
  slug: string;
  name: string;
  description: string;
  accessType: TravelGroupAccessType;
  joinMode: TravelGroupJoinMode;
  priceCzk?: number | null;
  memberCount: number;
  postCount: number;
  countryCodes: string[];
  topicSlugs: string[];
};

export type TravelGroupQuestionnaire = {
  prompt: string;
  questions: string[];
};

export type ItineraryShareMode = "private" | "link" | "public";

export type ItineraryEntry = {
  id: string;
  postId: string;
  dayLabel: string;
  sortOrder: number;
  timeLabel?: string | null;
  note?: string | null;
  tags: string[];
  createdAt: string;
};

export type UserItinerary = {
  id: string;
  title: string;
  description?: string | null;
  countryCode?: string | null;
  shareMode: ItineraryShareMode;
  shareSlug?: string | null;
  createdAt: string;
  updatedAt: string;
  entries: ItineraryEntry[];
};

export type UserCreatedTravelGroup = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  heroNote: string;
  ownerUserId: string;
  accessType: TravelGroupAccessType;
  joinMode: TravelGroupJoinMode;
  inviteCode?: string | null;
  password?: string | null;
  passwordHint?: string | null;
  questionnaire?: TravelGroupQuestionnaire | null;
  priceCzk?: number | null;
  perks: string[];
  countryCodes: string[];
  topicSlugs: string[];
  searchTags: string[];
  memberUserIds: string[];
  featuredPostIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type DemoLocalState = {
  followingIds: string[];
  blockedUserIds: string[];
  savedPostIds: string[];
  subscriptionCreatorIds: string[];
  unlockedPostIds: string[];
  joinedGroupSlugs: string[];
  itineraries: UserItinerary[];
  createdTravelGroups: UserCreatedTravelGroup[];
  reactionByPostId: Record<string, ReactionType>;
  createdComments: Comment[];
  createdPosts: CreatedPostBundle[];
  /** Demo: extra media attached to existing posts (e.g. from post detail upload). */
  appendedPostMedia: PostMedia[];
  reports: Report[];
  walletConnection?: WalletConnection | null;
};

export type SeedData = {
  users: User[];
  follows: Follow[];
  subscriptions: ProfileSubscription[];
  topics: Topic[];
  collections: Collection[];
  collectionPosts: CollectionPost[];
  collectionUsers: CollectionUser[];
  locations: Location[];
  posts: Post[];
  postTags: PostTag[];
  postMedia: PostMedia[];
  reactions: Reaction[];
  comments: Comment[];
  savedPosts: SavedPost[];
  blockedUsers: BlockedUser[];
  reports: Report[];
  entitlements: Entitlement[];
  payments: PaymentRecord[];
  searchPlaces: SearchPlace[];
};

export type AppSnapshot = SeedData;

export type AppFeatureModes = {
  appMode: AppMode;
  geocodingMode: GeocodingMode;
  storageMode: StorageMode;
  walletMode: "injected";
  walletAuthStatus: WalletAuthStatus;
  walletPaymentsEnabled: boolean;
  mapMode: MapMode;
};

export type DiscoveryFilters = {
  mode: FeedMode;
  sortBy: SortMode;
  topicSlug?: string;
  collectionSlug?: string;
  regionId?: string;
  regionPlace?: SearchPlace | null;
  tag?: string;
  visibility?: VisibilityType | "all";
  followingOnly?: boolean;
  activeOnly?: boolean;
  searchQuery?: string;
  center?: { latitude: number; longitude: number } | null;
};

export type HydratedComment = Comment & {
  author: User;
  replies: HydratedComment[];
};

export type HydratedPost = {
  id: string;
  post: Post;
  author: User;
  location: Location;
  place: CanonicalPlaceLinkage & { locationId: string };
  topic?: Topic | null;
  tags: string[];
  media: PostMedia[];
  reactions: Reaction[];
  comments: HydratedComment[];
  savesCount: number;
  popularityScore: number;
  distanceKm?: number | null;
  isActive: boolean;
  canAccess: boolean;
  isLocked: boolean;
  accessKind: "author" | "public" | "subscription" | "unlock_required" | "guest_locked";
  displayLatitude: number;
  displayLongitude: number;
  locationSummary: string;
  regionKey: string;
  engagementCount: number;
};

export type SearchResults = {
  places: SearchPlace[];
  creators: User[];
  posts: HydratedPost[];
  topics: Topic[];
  collections: Collection[];
  tags: string[];
  groups: SearchGroupHit[];
};
