"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { MapView } from "@/components/map-view";
import { Bookmark, Globe2, Lock, Share2 } from "@/components/icons";
import { decodePublicItinerarySnapshot } from "@/lib/public-itinerary-share";
import type { HydratedPost } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function PublicItineraryView() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get("data");
  const snapshot = useMemo(() => decodePublicItinerarySnapshot(encoded), [encoded]);

  const posts = useMemo<HydratedPost[]>(() => {
    if (!snapshot) return [];
    return snapshot.entries.map((entry, index) => ({
      id: entry.postId,
      post: {
        id: entry.postId,
        authorId: `public-author-${index}`,
        locationId: `public-location-${index}`,
        title: entry.title,
        body: entry.body,
        visibilityType: entry.visibilityType,
        teaser: entry.body.slice(0, 220),
        topicId: entry.topicSlug ?? null,
        visibilityStart: null,
        visibilityEnd: null,
        specialPrice: null,
        currency: null,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      author: {
        id: `public-author-${index}`,
        username: entry.authorUsername,
        displayName: entry.authorDisplayName,
        bio: "",
        avatarUrl: entry.authorAvatarUrl,
        focusTopicSlugs: entry.topicSlug ? [entry.topicSlug] : [],
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      location: {
        id: `public-location-${index}`,
        latitude: entry.latitude,
        longitude: entry.longitude,
        address: entry.address ?? null,
        placeName: entry.placeName ?? null,
        city: entry.city ?? null,
        district: null,
        region: entry.region ?? null,
        country: entry.country ?? null,
        geokey: `${entry.latitude.toFixed(3)}:${entry.longitude.toFixed(3)}`,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      place: {
        placeId: `public-place-${index}`,
        placeKey: `public-place-${index}`,
        source: "derived",
        locationId: `public-location-${index}`,
      },
      topic: entry.topicName
        ? {
            id: entry.topicSlug ?? `public-topic-${index}`,
            slug: entry.topicSlug ?? `public-topic-${index}`,
            name: entry.topicName,
            description: "",
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.updatedAt,
          }
        : null,
      tags: entry.tags,
      media: entry.mediaUrl
        ? [
            {
              id: `public-media-${index}`,
              postId: entry.postId,
              type: entry.mediaType ?? "image",
              url: entry.mediaUrl,
              alt: entry.mediaAlt ?? entry.title,
              order: 0,
              blurDataUrl: null,
            },
          ]
        : [],
      reactions: [],
      comments: [],
      savesCount: 0,
      popularityScore: 0,
      distanceKm: null,
      isActive: true,
      canAccess: true,
      isLocked: false,
      accessKind: "public",
      displayLatitude: entry.latitude,
      displayLongitude: entry.longitude,
      locationSummary: entry.locationSummary,
      regionKey: `${entry.region ?? "unknown"}:${entry.city ?? "unknown"}`,
      engagementCount: 0,
    }));
  }, [snapshot]);

  const groupedEntries = useMemo(() => {
    if (!snapshot) return [];
    const grouped = new Map<string, typeof snapshot.entries>();
    snapshot.entries.forEach((entry) => {
      const existing = grouped.get(entry.dayLabel) ?? [];
      existing.push(entry);
      grouped.set(entry.dayLabel, existing);
    });
    return [...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true }));
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-dashed border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-10 text-center text-stone-500 backdrop-blur-md">
          This shared itinerary link is missing data or could not be decoded.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[30px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-6 backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-stone-950">
            <Share2 className="h-3.5 w-3.5" />
            Shared itinerary
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-300">
            {snapshot.shareMode === "public" ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {snapshot.shareMode}
          </span>
          <span className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-300">
            {snapshot.entries.length} stops
          </span>
        </div>
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">
          {snapshot.title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400 sm:text-base">
          {snapshot.description || "A Followable trip exported as a shareable itinerary route."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-500 dark:text-stone-400">
          <span>Updated {formatRelativeDate(snapshot.updatedAt)}</span>
          <span>{snapshot.countryCode ?? "Multi-country"}</span>
          <span>Exported {formatRelativeDate(snapshot.exportedAt)}</span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="rounded-[30px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-2 backdrop-blur-md">
          <MapView
            posts={posts}
            selectedPostId={posts[0]?.id ?? null}
            markerMode="numbered"
            orderedPostIds={posts.map((post) => post.id)}
            clusterPosts={false}
            className="h-[min(62vh,760px)] w-full rounded-[26px] border-0 shadow-none"
            showPostOverlay={false}
          />
        </div>

        <div className="rounded-[30px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
          <div className="text-sm font-semibold text-[color:var(--foreground)]">Route outline</div>
          <div className="mt-4 space-y-5">
            {groupedEntries.map(([dayLabel, entries]) => (
              <section key={dayLabel}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white dark:bg-white dark:text-stone-950">
                    <Bookmark className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--foreground)]">{dayLabel}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">{entries.length} stops</div>
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  {entries.map((entry) => (
                    <article key={entry.entryId} className="rounded-[24px] border border-[color:var(--glass-border)] bg-white/70 p-4 dark:bg-white/5">
                      <div className="flex items-start gap-3">
                        <Avatar
                          src={entry.authorAvatarUrl}
                          alt=""
                          displayName={entry.authorDisplayName}
                          size="sm"
                          className="h-10 w-10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-[color:var(--foreground)]">{entry.title}</div>
                            {entry.timeLabel ? (
                              <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-0.5 text-[11px] font-semibold text-stone-500 dark:text-stone-300">
                                {entry.timeLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                            {entry.authorDisplayName} · @{entry.authorUsername}
                          </div>
                          <div className="mt-2 text-sm text-stone-600 dark:text-stone-300">{entry.locationSummary}</div>
                          {entry.note ? (
                            <p className="mt-3 rounded-2xl border border-dashed border-[color:var(--glass-border)] px-3 py-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                              {entry.note}
                            </p>
                          ) : null}
                          {entry.tags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.tags.slice(0, 5).map((tag) => (
                                <span
                                  key={`${entry.entryId}-${tag}`}
                                  className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {entry.mediaUrl ? (
                          <div className="relative hidden h-24 w-24 overflow-hidden rounded-2xl bg-stone-100 md:block">
                            {entry.mediaType === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.mediaUrl} alt={entry.mediaAlt || entry.title} className="h-full w-full object-cover" />
                            ) : (
                              <video src={entry.mediaUrl} className="h-full w-full object-cover" muted playsInline />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <div className="text-center text-sm text-stone-500 dark:text-stone-400">
        Shared from Followable. <Link href="/itinerary" className="font-semibold underline underline-offset-2">Build your own itinerary</Link>
      </div>
    </div>
  );
}
