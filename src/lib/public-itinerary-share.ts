import { sortItineraryEntries } from "@/lib/itinerary";
import type { HydratedPost, ItineraryShareMode, UserItinerary } from "@/lib/types";

export type PublicItinerarySnapshotEntry = {
  entryId: string;
  postId: string;
  title: string;
  body: string;
  authorDisplayName: string;
  authorUsername: string;
  authorAvatarUrl: string;
  locationSummary: string;
  placeName?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  topicName?: string | null;
  topicSlug?: string | null;
  tags: string[];
  visibilityType: HydratedPost["post"]["visibilityType"];
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  mediaAlt?: string | null;
  dayLabel: string;
  timeLabel?: string | null;
  note?: string | null;
};

export type PublicItinerarySnapshot = {
  id: string;
  shareSlug: string;
  title: string;
  description?: string | null;
  countryCode?: string | null;
  shareMode: Exclude<ItineraryShareMode, "private">;
  createdAt: string;
  updatedAt: string;
  exportedAt: string;
  entries: PublicItinerarySnapshotEntry[];
};

function safeBase64Encode(input: string) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, "utf8").toString("base64");
}

function safeBase64Decode(input: string) {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return decodeURIComponent(escape(window.atob(input)));
  }
  return Buffer.from(input, "base64").toString("utf8");
}

export function createItineraryShareSlug(title: string, itineraryId: string) {
  const slugBase = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slugBase || "trip"}-${itineraryId.slice(-6)}`;
}

export function buildPublicItinerarySnapshot(
  itinerary: UserItinerary,
  postsById: Map<string, HydratedPost>,
): PublicItinerarySnapshot {
  return {
    id: itinerary.id,
    shareSlug: itinerary.shareSlug || createItineraryShareSlug(itinerary.title, itinerary.id),
    title: itinerary.title,
    description: itinerary.description ?? null,
    countryCode: itinerary.countryCode ?? null,
    shareMode: itinerary.shareMode === "public" ? "public" : "link",
    createdAt: itinerary.createdAt,
    updatedAt: itinerary.updatedAt,
    exportedAt: new Date().toISOString(),
    entries: sortItineraryEntries(itinerary.entries)
      .map((entry) => {
        const post = postsById.get(entry.postId);
        if (!post) return null;
        const primaryMedia = post.media[0] ?? null;
        return {
          entryId: entry.id,
          postId: post.id,
          title: post.post.title,
          body: post.post.body,
          authorDisplayName: post.author.displayName,
          authorUsername: post.author.username,
          authorAvatarUrl: post.author.avatarUrl,
          locationSummary: post.locationSummary,
          placeName: post.location.placeName ?? null,
          address: post.location.address ?? null,
          city: post.location.city ?? null,
          region: post.location.region ?? null,
          country: post.location.country ?? null,
          latitude: post.displayLatitude,
          longitude: post.displayLongitude,
          topicName: post.topic?.name ?? null,
          topicSlug: post.topic?.slug ?? null,
          tags: post.tags,
          visibilityType: post.post.visibilityType,
          mediaUrl: primaryMedia?.url ?? null,
          mediaType: primaryMedia?.type ?? null,
          mediaAlt: primaryMedia?.alt ?? null,
          dayLabel: entry.dayLabel,
          timeLabel: entry.timeLabel ?? null,
          note: entry.note ?? null,
        };
      })
      .filter(Boolean) as PublicItinerarySnapshotEntry[],
  };
}

export function encodePublicItinerarySnapshot(snapshot: PublicItinerarySnapshot) {
  return safeBase64Encode(JSON.stringify(snapshot));
}

export function decodePublicItinerarySnapshot(encoded: string | null | undefined) {
  if (!encoded) return null;
  try {
    return JSON.parse(safeBase64Decode(encoded)) as PublicItinerarySnapshot;
  } catch {
    return null;
  }
}
