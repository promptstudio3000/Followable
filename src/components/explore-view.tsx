"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AdminDivisionNavigator } from "@/components/admin-division-navigator";
import { CountryPicker } from "@/components/country-picker";
import { useWikipediaPois } from "@/components/use-wikipedia-pois";
import { ArrowUpRight, Bookmark, Coffee, Compass, Globe2, Lock, MapPin, Sparkles, Star, Tent, TreePine, Users, WalletCards, X } from "@/components/icons";
import { MapView, type MapViewportBounds } from "@/components/map-view";
import { PostCard } from "@/components/post-card";
import { CreatorProfileDialog } from "@/components/creator-profile-dialog";
import { PostDetailDialog } from "@/components/post-detail-dialog";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useCountry } from "@/components/providers/country-context";
import { useTheme } from "@/components/providers/theme-provider";
import { buildAiItineraryDraft } from "@/lib/ai-itinerary";
import { sortItineraryEntries } from "@/lib/itinerary";
import { exploreDemoMapNote, getExploreHeroCopy } from "@/lib/explore-hero-i18n";
import { getCountryBounds } from "@/lib/country-bounds";
import { getCountryMapConfig, isCountryDemoEnabled } from "@/lib/countries";
import { getDemoPoiPostsForCountry } from "@/lib/demo-pois-by-country";
import { getCreatorStats, getRegionHighlights } from "@/lib/discovery";
import { getTravelGroupSummaries } from "@/lib/travel-groups";
import type { AppSnapshot, Collection, SearchPlace } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";

const POPULAR_PAGE_SIZE = 20;

const exploreSectionTitle =
  "my-10 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl sm:leading-tight";

const topicIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "hidden-spots": TreePine,
  vanlife: Tent,
  "crypto-friendly": Coffee,
  "local-guides": Compass,
  viewpoints: MapPin,
  rivers: MapPin,
  "overnight-spots": Tent,
  "remote-work": Coffee,
};

function getTopicIcon(slug: string) {
  return topicIconMap[slug] ?? Sparkles;
}

function panelClass() {
  return "rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur-md";
}

function demoCollectionRating(collectionId: string): number {
  let h = 0;
  for (let i = 0; i < collectionId.length; i++) h = (h * 31 + collectionId.charCodeAt(i)) >>> 0;
  return Math.round((3.8 + (h % 120) / 100) * 10) / 10;
}

function collectionFreeHiddenCounts(snapshot: AppSnapshot, collection: Collection) {
  const postIds = snapshot.collectionPosts.filter((cp) => cp.collectionId === collection.id).map((cp) => cp.postId);
  const posts = snapshot.posts.filter((p) => postIds.includes(p.id));
  let free = 0;
  let hidden = 0;
  for (const p of posts) {
    if (p.visibilityType === "public") free += 1;
    else hidden += 1;
  }
  return { free, hidden, total: posts.length };
}

function creatorLocationCountInFilter(
  creatorId: string,
  posts: { author: { id: string }; location: { region?: string | null; city?: string | null } }[],
): number {
  const keys = new Set<string>();
  posts
    .filter((p) => p.author.id === creatorId)
    .forEach((p) => {
      keys.add(`${p.location.region ?? ""}|${p.location.city ?? ""}`);
    });
  return keys.size;
}

function FullBleedSlider({ children, centerRow }: { children: React.ReactNode; centerRow?: boolean }) {
  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]">
      {centerRow ? (
        <div className="flex min-w-full justify-center px-4 pb-2 sm:px-6 lg:px-8">
          <div className="flex w-max gap-3 sm:gap-4">{children}</div>
        </div>
      ) : (
        <div className="flex w-max gap-3 px-4 pb-2 sm:gap-4 sm:px-6 lg:px-8">{children}</div>
      )}
    </div>
  );
}

function FullBleedContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ExploreView() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCzechia, countryCode, countryName, setCountryCode } = useCountry();
  const { snapshot, viewerId, hydratedPosts, localState, createItinerary, addToItinerary } = useDemoStore();
  const isAllCountries = countryCode === "ALL";
  const activeTag = searchParams.get("tag")?.trim().replace(/^#/, "").toLowerCase() || null;
  const requestedPlaceId = searchParams.get("place");
  const requestedCreatorUsername = searchParams.get("creator")?.trim() || null;

  const seededCountries = useMemo(() => {
    const out = new Set<string>();
    snapshot.locations.forEach((loc) => {
      if (loc.country) out.add(String(loc.country).toUpperCase());
    });
    return out;
  }, [snapshot.locations]);
  const countryRootPlace = useMemo(
    () =>
      isAllCountries
        ? null
        : snapshot.searchPlaces.find((place) => place.id === `demo-${countryCode.toUpperCase()}-all`) ?? null,
    [countryCode, isAllCountries, snapshot.searchPlaces],
  );
  const exploreRegionPlaces = useMemo(() => {
    if (isAllCountries) {
      return snapshot.searchPlaces.filter((p) => p.kind === "country");
    }
    return snapshot.searchPlaces.filter(
      (place) =>
        (place.country ?? "").toUpperCase() === countryCode &&
        (place.kind === "country" || place.kind === "region"),
    );
  }, [countryCode, isAllCountries, snapshot.searchPlaces]);

  const [regionId, setRegionId] = useState<string | null>(() =>
    isAllCountries ? null : countryRootPlace?.id ?? exploreRegionPlaces[0]?.id ?? "place-plzen-region",
  );
  const [selectedPlace, setSelectedPlace] = useState<SearchPlace | null>(() =>
    isAllCountries ? null : countryRootPlace ?? exploreRegionPlaces[0] ?? null,
  );

  const exploreDefaultRegionId = countryRootPlace?.id ?? exploreRegionPlaces[0]?.id ?? "";
  useEffect(() => {
    if (isAllCountries) {
      setRegionId(null);
      setSelectedPlace(null);
      return;
    }
    if (countryRootPlace) {
      setRegionId(countryRootPlace.id);
      setSelectedPlace(countryRootPlace);
      return;
    }
    if (exploreDefaultRegionId) {
      const fallback = exploreRegionPlaces.find((place) => place.id === exploreDefaultRegionId) ?? null;
      setRegionId(exploreDefaultRegionId);
      setSelectedPlace(fallback);
    }
  }, [countryCode, countryRootPlace, isAllCountries, exploreDefaultRegionId, exploreRegionPlaces]);

  useEffect(() => {
    if (!requestedPlaceId) return;
    const requestedPlace = snapshot.searchPlaces.find((place) => place.id === requestedPlaceId);
    if (!requestedPlace) return;
    const requestedCountry = (requestedPlace.country ?? "").toUpperCase();
    if (requestedCountry && requestedCountry !== "ALL" && requestedCountry !== countryCode) {
      setCountryCode(requestedCountry);
    }
    setRegionId(requestedPlace.id);
    setSelectedPlace(requestedPlace);
  }, [countryCode, requestedPlaceId, setCountryCode, snapshot.searchPlaces]);

  const [selectedTopicSlugs, setSelectedTopicSlugs] = useState<Set<string>>(() => new Set());
  const [topicQuery, setTopicQuery] = useState("");
  const [creatorDialogUsername, setCreatorDialogUsername] = useState<string | null>(null);
  const [dialogPostId, setDialogPostId] = useState<string | null>(null);
  const [selectedFeedPostId, setSelectedFeedPostId] = useState<string | null>(null);
  const [focusedCreatorId, setFocusedCreatorId] = useState<string | null>(null);
  const [popularCount, setPopularCount] = useState(POPULAR_PAGE_SIZE);
  const [activityFeedTab, setActivityFeedTab] = useState<"latest" | "popular" | "for-you">("latest");
  const [mapViewportBounds, setMapViewportBounds] = useState<MapViewportBounds | null>(null);
  const [renderTimestamp] = useState(() => Date.now());
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [aiPlannerPrompt, setAiPlannerPrompt] = useState("");
  const [aiPlannerTitle, setAiPlannerTitle] = useState("");
  const [aiPlannerMessage, setAiPlannerMessage] = useState<string | null>(null);
  const [aiPlannerTripId, setAiPlannerTripId] = useState<string | null>(null);
  const [aiPlannerWarnings, setAiPlannerWarnings] = useState<string[]>([]);
  const [isAiPlannerPending, startAiPlannerTransition] = useTransition();
  const openPost = useCallback((postId: string) => {
    setSelectedFeedPostId(postId);
    setDialogPostId(postId);
  }, []);

  useEffect(() => {
    if (!requestedCreatorUsername) {
      setFocusedCreatorId(null);
      return;
    }

    const creator = snapshot.users.find((user) => user.username === requestedCreatorUsername) ?? null;
    setFocusedCreatorId(creator?.id ?? null);
  }, [requestedCreatorUsername, snapshot.users]);

  useEffect(() => {
    setSelectedTopicSlugs(new Set());
  }, [regionId]);

  useEffect(() => {
    setPopularCount(POPULAR_PAGE_SIZE);
  }, [regionId, countryCode, activeTag]);

  const demoAuthor = snapshot.users[0];
  const demoTopic = snapshot.topics[0] ?? null;
  const mapPostsForCountry = useMemo(() => {
    if (isAllCountries) return null;
    const cc = countryCode.toUpperCase();
    if (isCzechia || seededCountries.has(cc) || !demoAuthor || !isCountryDemoEnabled(cc)) return null;
    return getDemoPoiPostsForCountry(countryCode, demoAuthor, demoTopic);
  }, [isAllCountries, isCzechia, countryCode, demoAuthor, demoTopic, seededCountries]);

  const regionPosts = useMemo(() => {
    if (mapPostsForCountry) {
      const place = selectedPlace;
      if (!place || place.kind === "country") return mapPostsForCountry;
      return mapPostsForCountry.filter((p) => p.location.region === place.region);
    }
    return getRegionHighlights(snapshot, viewerId, regionId, selectedPlace).posts;
  }, [mapPostsForCountry, regionId, selectedPlace, snapshot, viewerId]);

  const topicCountsInRegion = useMemo(() => {
    const m = new Map<string, number>();
    regionPosts.forEach((post) => {
      if (post.topic?.slug) m.set(post.topic.slug, (m.get(post.topic.slug) ?? 0) + 1);
    });
    return m;
  }, [regionPosts]);

  const topicsForFilter = useMemo(() => {
    return [...topicCountsInRegion.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => snapshot.topics.find((t) => t.slug === slug))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [topicCountsInRegion, snapshot.topics]);

  const filteredPosts = useMemo(() => {
    const byTopic =
      selectedTopicSlugs.size === 0
        ? regionPosts
        : regionPosts.filter((post) => post.topic && selectedTopicSlugs.has(post.topic.slug));
    if (!activeTag) return byTopic;
    return byTopic.filter((post) => post.tags.some((tag) => tag.toLowerCase() === activeTag));
  }, [activeTag, regionPosts, selectedTopicSlugs]);

  const focusedCreator = useMemo(
    () => snapshot.users.find((user) => user.id === focusedCreatorId) ?? null,
    [focusedCreatorId, snapshot.users],
  );

  const creatorScopedPosts = useMemo(
    () => (focusedCreatorId ? filteredPosts.filter((post) => post.author.id === focusedCreatorId) : filteredPosts),
    [filteredPosts, focusedCreatorId],
  );

  const regionActivityStats = useMemo(() => {
    const now = renderTimestamp;
    const d1 = now - 24 * 60 * 60 * 1000;
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d30 = now - 30 * 24 * 60 * 60 * 1000;
    let c1 = 0;
    let c7 = 0;
    let c30 = 0;
    for (const p of regionPosts) {
      const t = new Date(p.post.createdAt).getTime();
      if (t >= d1) c1 += 1;
      if (t >= d7) c7 += 1;
      if (t >= d30) c30 += 1;
    }
    return {
      topicCount: topicCountsInRegion.size,
      day: c1,
      week: c7,
      month: c30,
    };
  }, [regionPosts, renderTimestamp, topicCountsInRegion.size]);

  const creators = useMemo(() => {
    const counts = new Map<string, number>();
    creatorScopedPosts.forEach((post) => {
      counts.set(post.author.id, (counts.get(post.author.id) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([creatorId]) => snapshot.users.find((u) => u.id === creatorId)!)
      .filter(Boolean)
      .slice(0, 24);
  }, [creatorScopedPosts, snapshot.users]);

  const latestPosts = useMemo(
    () =>
      [...creatorScopedPosts].sort(
        (a, b) => new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime(),
      ),
    [creatorScopedPosts],
  );

  const personalizedPosts = useMemo(() => {
    const followedCreators = new Set(
      snapshot.follows
        .filter((follow) => follow.followerId === viewerId)
        .map((follow) => follow.followedUserId),
    );
    const subscribedCreators = new Set(localState.subscriptionCreatorIds);
    const savedPosts = hydratedPosts.filter((post) => localState.savedPostIds.includes(post.id));
    const preferredTags = new Set(savedPosts.flatMap((post) => post.tags.map((tag) => tag.toLowerCase())));
    const preferredTopics = new Set(savedPosts.map((post) => post.topic?.slug).filter(Boolean));

    return [...creatorScopedPosts].sort((left, right) => {
      const score = (post: (typeof creatorScopedPosts)[number]) => {
        const followBoost = followedCreators.has(post.author.id) ? 90 : 0;
        const subscriptionBoost = subscribedCreators.has(post.author.id) ? 70 : 0;
        const topicBoost = post.topic?.slug && preferredTopics.has(post.topic.slug) ? 40 : 0;
        const tagBoost = post.tags.some((tag) => preferredTags.has(tag.toLowerCase())) ? 30 : 0;
        const freshnessBoost = Math.max(
          0,
          20 - Math.min(20, (renderTimestamp - new Date(post.post.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        );
        return followBoost + subscriptionBoost + topicBoost + tagBoost + freshnessBoost + post.popularityScore / 8;
      };

      return score(right) - score(left);
    });
  }, [creatorScopedPosts, hydratedPosts, localState.savedPostIds, localState.subscriptionCreatorIds, renderTimestamp, snapshot.follows, viewerId]);

  const popularPosts = useMemo(() => {
    const byPop = [...creatorScopedPosts].sort((a, b) => b.popularityScore - a.popularityScore);
    return byPop.slice(0, popularCount);
  }, [creatorScopedPosts, popularCount]);
  const hasMorePopular = creatorScopedPosts.length > popularCount;

  const mapPosts = mapPostsForCountry ?? creatorScopedPosts.slice(0, 48);
  const {
    items: wikipediaPois,
    loading: wikipediaPoisLoading,
    error: wikipediaPoisError,
    load: loadWikipediaPois,
    clear: clearWikipediaPois,
    hasLoadedCurrentView: hasLoadedWikipediaPois,
    hasAnyItems: hasAnyWikipediaPois,
    searchedAreaCount: searchedWikipediaAreaCount,
  } = useWikipediaPois({
    bounds: mapViewportBounds,
    place: selectedPlace,
  });
  const countryCfg = isAllCountries ? null : getCountryMapConfig(countryCode);
  const mapCenter =
    mapPostsForCountry != null && countryCfg
      ? { latitude: countryCfg.centerLat, longitude: countryCfg.centerLng }
      : selectedPlace
        ? { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }
        : isAllCountries
          ? { latitude: 50.0, longitude: 12.0 }
        : undefined;
  const mapFitBounds = mapPostsForCountry && !isAllCountries ? getCountryBounds(countryCode) : null;

  const filteredPostIds = useMemo(() => new Set(creatorScopedPosts.map((p) => p.id)), [creatorScopedPosts]);
  const regionPostIds = useMemo(() => new Set(regionPosts.map((p) => p.id)), [regionPosts]);
  const collections = useMemo(() => {
    const postIdsFor = (c: Collection) =>
      snapshot.collectionPosts.filter((cp) => cp.collectionId === c.id).map((cp) => cp.postId);
    const overlaps = (c: Collection, ids: Set<string>) => postIdsFor(c).some((id) => ids.has(id));
    const inRegion = (c: Collection) => overlaps(c, regionPostIds);
    const inFilter = (c: Collection) => overlaps(c, filteredPostIds);
    return [...snapshot.collections].sort((a, b) => {
      const aF = inFilter(a) ? 1 : 0;
      const bF = inFilter(b) ? 1 : 0;
      if (aF !== bF) return bF - aF;
      const aR = inRegion(a) ? 1 : 0;
      const bR = inRegion(b) ? 1 : 0;
      if (aR !== bR) return bR - aR;
      return a.title.localeCompare(b.title);
    });
  }, [snapshot.collections, snapshot.collectionPosts, regionPostIds, filteredPostIds]);

  const creatorCount = new Set(creatorScopedPosts.map((p) => p.author.id)).size;
  const groups = useMemo(() => getTravelGroupSummaries(snapshot, hydratedPosts, localState), [hydratedPosts, localState, snapshot]);
  const itineraryPostsById = useMemo(() => new Map(hydratedPosts.map((post) => [post.id, post])), [hydratedPosts]);
  const itinerariesForSurface = useMemo(() => {
    return [...(localState.itineraries ?? [])]
      .filter((itinerary) => {
        if (countryCode === "ALL") return true;
        return !itinerary.countryCode || itinerary.countryCode.toUpperCase() === countryCode;
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 2)
      .map((itinerary) => {
        const sortedEntries = sortItineraryEntries(itinerary.entries);

        return {
          ...itinerary,
          dayLabels: Array.from(new Set(sortedEntries.map((entry) => entry.dayLabel))),
          previewEntries: sortedEntries.slice(0, 3).map((entry) => ({
            entry,
            post: itineraryPostsById.get(entry.postId) ?? null,
          })),
        };
      });
  }, [countryCode, itineraryPostsById, localState.itineraries]);
  const groupsForSurface = useMemo(() => {
    return groups
      .filter((group) => {
        const countryMatch =
          isAllCountries || group.countryCodes.some((code) => code.toUpperCase() === countryCode);
        const topicMatch =
          selectedTopicSlugs.size === 0 ||
          group.topics.some((topic) => selectedTopicSlugs.has(topic.slug));
        const tagMatch = !activeTag || group.searchTags.some((tag) => tag.toLowerCase().includes(activeTag));
        return countryMatch && topicMatch && tagMatch;
      })
      .slice(0, 3);
  }, [activeTag, countryCode, groups, isAllCountries, selectedTopicSlugs]);
  const countryCoverage = useMemo(() => {
    const values = new Set(creatorScopedPosts.map((post) => (post.location.country ?? "").toUpperCase()).filter(Boolean));
    return values.size;
  }, [creatorScopedPosts]);

  const toggleTopic = (slug: string) => {
    setSelectedTopicSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const clearTopics = () => setSelectedTopicSlugs(new Set());

  const tagCountsInScope = useMemo(() => {
    const counts = new Map<string, number>();
    regionPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        const normalized = tag.toLowerCase();
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [regionPosts]);

  const replaceSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const next = params.toString();
      router.replace(next ? `/?${next}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  const focusCreator = useCallback(
    (creatorId: string) => {
      const creator = snapshot.users.find((user) => user.id === creatorId) ?? null;
      setFocusedCreatorId(creatorId);
      replaceSearchParams({ creator: creator?.username ?? null });
    },
    [replaceSearchParams, snapshot.users],
  );

  const clearFocusedCreator = useCallback(() => {
    setFocusedCreatorId(null);
    replaceSearchParams({ creator: null });
  }, [replaceSearchParams]);

  const setActiveTagFilter = useCallback(
    (tag: string | null) => {
      replaceSearchParams({ tag });
    },
    [replaceSearchParams],
  );

  const createAiItinerary = useCallback(() => {
    if (!viewerId) {
      setAiPlannerTripId(null);
      setAiPlannerMessage("Sign in first to save an AI-generated trip.");
      return;
    }

    startAiPlannerTransition(() => {
      const draft = buildAiItineraryDraft({
        prompt: aiPlannerPrompt,
        posts: creatorScopedPosts,
        countryCode: countryCode === "ALL" ? null : countryCode,
        regionLabel: selectedPlace?.label ?? null,
        selectedTag: activeTag,
        selectedTopicSlugs: [...selectedTopicSlugs],
        focusedCreatorName: focusedCreator?.displayName ?? null,
        title: aiPlannerTitle,
      });

      if (draft.entries.length === 0) {
        setAiPlannerTripId(null);
        setAiPlannerWarnings(draft.warnings);
        setAiPlannerMessage("The planner could not build a usable draft from the current scope.");
        return;
      }

      const itineraryId = createItinerary({
        title: draft.title,
        description: draft.description,
        countryCode: countryCode === "ALL" ? null : countryCode,
      });

      if (!itineraryId) {
        setAiPlannerTripId(null);
        setAiPlannerWarnings(draft.warnings);
        setAiPlannerMessage("The AI draft was prepared, but the trip could not be saved.");
        return;
      }

      draft.entries.forEach((entry) => {
        addToItinerary({
          postId: entry.postId,
          itineraryId,
          dayLabel: entry.dayLabel,
          timeLabel: entry.timeLabel,
          note: entry.note,
          tags: entry.tags,
          countryCode: countryCode === "ALL" ? null : countryCode,
        });
      });

      setAiPlannerWarnings(draft.warnings);
      setAiPlannerTripId(itineraryId);
      setAiPlannerMessage(`Created "${draft.title}" with ${draft.entries.length} AI-selected stops.`);
      setAiPlannerOpen(false);
      setAiPlannerPrompt("");
      setAiPlannerTitle("");
    });
  }, [
    activeTag,
    addToItinerary,
    aiPlannerPrompt,
    aiPlannerTitle,
    countryCode,
    createItinerary,
    creatorScopedPosts,
    focusedCreator?.displayName,
    selectedPlace?.label,
    selectedTopicSlugs,
    viewerId,
  ]);

  const regionPill = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition md:px-4 md:py-2.5 md:text-sm",
      active
        ? theme === "light"
          ? "bg-stone-950 text-white shadow-sm"
          : "bg-white text-stone-950 shadow-sm"
        : "border border-[color:var(--glass-border)] bg-transparent text-stone-600 hover:border-stone-400 dark:text-stone-300 dark:hover:border-stone-500",
    );

  const topicTagClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition md:px-5 md:py-3 md:text-base",
      active
        ? theme === "light"
          ? "bg-stone-950 text-white shadow-sm"
          : "bg-white text-stone-950 shadow-sm"
        : "border border-[color:var(--glass-border)] bg-transparent text-stone-600 hover:border-stone-400 dark:text-stone-300 dark:hover:border-stone-500",
    );


  const hero = useMemo(() => getExploreHeroCopy(countryCode), [countryCode]);
  const demoMapNote = exploreDemoMapNote(
    countryCode,
    isCzechia,
    isAllCountries ? false : isCountryDemoEnabled(countryCode),
  );

  const q = topicQuery.trim().toLowerCase();
  const topicsVisible = useMemo(() => {
    if (!q) return topicsForFilter;
    return topicsForFilter.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [topicsForFilter, q]);
  const sidebarPosts =
    activityFeedTab === "popular"
      ? popularPosts
      : activityFeedTab === "for-you"
        ? personalizedPosts
        : latestPosts;
  const selectedSidebarPostId =
    sidebarPosts.some((post) => post.id === selectedFeedPostId) ? selectedFeedPostId : sidebarPosts[0]?.id ?? null;

  useEffect(() => {
    if (sidebarPosts.length === 0) {
      setSelectedFeedPostId(null);
      return;
    }
    if (!selectedFeedPostId || !sidebarPosts.some((post) => post.id === selectedFeedPostId)) {
      setSelectedFeedPostId(sidebarPosts[0]!.id);
    }
  }, [selectedFeedPostId, sidebarPosts]);

  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-0 pb-8">
      <header className="px-4 pt-2 sm:px-6 lg:px-8">
        <div className={cn(panelClass(), "flex flex-col gap-2.5 px-3.5 py-3 sm:px-4")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-300">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Explore
              </span>
              <span className="inline-flex items-center rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-1.5">
                <CountryPicker />
              </span>
              {[
                {
                  label: isAllCountries ? "Countries" : "Regions",
                  value: isAllCountries ? countryCoverage : exploreRegionPlaces.filter((place) => place.kind === "region").length,
                },
                { label: "Topics", value: regionActivityStats.topicCount },
                { label: "This week", value: regionActivityStats.week },
                { label: "Creators", value: creatorCount },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300"
                >
                  <span className="font-semibold text-[color:var(--foreground)]">{item.value}</span>
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {focusedCreator ? (
                <button
                  type="button"
                  onClick={() => setCreatorDialogUsername(focusedCreator.username)}
                  className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-400 dark:text-stone-300"
                >
                  @{focusedCreator.username}
                </button>
              ) : null}
              <Link
                href="/groups"
                className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-400 dark:text-stone-300"
              >
                Groups
              </Link>
            </div>
          </div>
          <p className="text-xs leading-5 text-stone-500 dark:text-stone-400">
            {focusedCreator
              ? `Focused on ${focusedCreator.displayName} in ${selectedPlace?.label ?? hero.title}`
              : selectedPlace?.label ?? hero.title}
            {demoMapNote ? ` · ${demoMapNote.trim()}` : ""}
          </p>
        </div>
      </header>

      <div className="mt-3 px-4 sm:px-6 lg:px-8">
        {isAllCountries ? (
          <div className="flex flex-nowrap justify-start gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:justify-center sm:overflow-visible">
            <button
              key="all-countries"
              type="button"
              onClick={() => {
                setRegionId(null);
                setSelectedPlace(null);
              }}
              className={regionPill(regionId == null)}
            >
              Všechny země
            </button>
            {exploreRegionPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  setRegionId(place.id);
                  setSelectedPlace(place);
                }}
                className={regionPill(regionId === place.id)}
              >
                {place.label}
              </button>
            ))}
          </div>
        ) : countryRootPlace ? (
          <AdminDivisionNavigator
            countryCode={countryCode}
            rootPlace={countryRootPlace}
            selectedPlaceId={selectedPlace?.id ?? null}
            onSelectPlace={(place) => {
              setRegionId(place.id);
              setSelectedPlace(place);
            }}
          />
        ) : null}
      </div>

      <section className="mt-3 flex min-h-0 flex-col gap-4 px-4 sm:px-6 lg:px-8 lg:h-[72vh] lg:max-h-[72vh] lg:min-h-[420px] lg:flex-row lg:items-stretch lg:justify-center lg:gap-8">
        <div
          className={cn(
            "order-1 min-w-0 flex-1 overflow-hidden",
            "h-[min(48dvh,70vh)] max-h-[70vh] min-h-[260px]",
            "lg:h-full lg:min-h-0 lg:max-h-full",
            panelClass(),
          )}
        >
          <div className="relative h-full w-full">
            <MapView
              key={isAllCountries ? `all-${regionId ?? "all"}` : isCzechia ? `cz-${regionId}` : countryCode}
              posts={mapPosts}
              externalPois={wikipediaPois}
              selectedPostId={selectedSidebarPostId}
              onSelectPost={setSelectedFeedPostId}
              className="h-full min-h-0 w-full max-h-full rounded-[inherit] border-0 shadow-none"
              center={mapFitBounds ? undefined : mapCenter}
              fitBounds={mapFitBounds}
              fitBoundsRevision={mapFitBounds ? countryCode : null}
              clusterMaxZoom={mapPostsForCountry ? 2 : 4}
              clusterRadius={mapPostsForCountry ? 56 : 30}
              onBoundsChange={setMapViewportBounds}
            />
            <div className="pointer-events-none absolute left-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-start gap-2">
              {!isAllCountries && selectedPlace ? (
                <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-stone-200/90 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95">
                  <button
                    type="button"
                    onClick={() => void loadWikipediaPois()}
                    disabled={!mapViewportBounds || wikipediaPoisLoading || !selectedPlace}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      hasLoadedWikipediaPois
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "bg-stone-950 text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-stone-950",
                    )}
                  >
                    {wikipediaPoisLoading
                      ? "Searching Wikipedia..."
                      : hasLoadedWikipediaPois
                        ? "Refresh this area"
                        : "Search in this area"}
                  </button>
                  {hasAnyWikipediaPois ? (
                    <button
                      type="button"
                      onClick={() => clearWikipediaPois()}
                      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      Clear pins
                    </button>
                  ) : null}
                  {wikipediaPois.length > 0 ? (
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      {wikipediaPois.length} pins on map
                    </span>
                  ) : hasLoadedWikipediaPois && !wikipediaPoisError ? (
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      No Wikipedia POI found in visible area
                    </span>
                  ) : null}
                  {wikipediaPoisError ? (
                    <span className="text-[11px] font-medium text-rose-600 dark:text-rose-300">
                      Wikipedia load failed
                    </span>
                  ) : searchedWikipediaAreaCount > 0 ? (
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      {searchedWikipediaAreaCount} searched area{searchedWikipediaAreaCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="order-2 flex min-h-0 w-full min-w-[240px] max-w-[680px] flex-col gap-6 lg:h-full lg:w-[min(100%,680px)] lg:shrink-0">
          <div className="flex min-h-[min(40dvh,320px)] max-h-[70vh] flex-1 flex-col overflow-hidden lg:min-h-0 lg:max-h-none lg:flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="shrink-0 text-lg font-semibold text-[color:var(--foreground)] sm:text-xl">
                  {focusedCreator
                    ? `${focusedCreator.displayName} in ${selectedPlace?.label ?? countryName}`
                    : isAllCountries && regionId == null
                      ? "Feed across Europe"
                      : `Feed in ${selectedPlace?.label ?? countryName}`}
                </h2>
                <p className="mt-1 shrink-0 text-sm text-stone-500 dark:text-stone-400">
                  {focusedCreator
                    ? "Click the name in any card to keep only that creator’s pins and posts in view."
                    : activeTag
                      ? `Filtered by #${activeTag}.`
                      : "A cleaner list for scan-first browsing. The map keeps the active place in sync."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["latest", "popular", "for-you"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActivityFeedTab(value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      activityFeedTab === value
                        ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                        : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                    )}
                  >
                    {value === "latest" ? "Latest" : value === "popular" ? "Popular" : "For you"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {focusedCreator ? (
                <>
                  <span className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-stone-950">
                    {focusedCreator.displayName}
                    <button
                      type="button"
                      onClick={clearFocusedCreator}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/10 dark:bg-white/20"
                      aria-label="Clear creator focus"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreatorDialogUsername(focusedCreator.username)}
                    className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-400 dark:text-stone-300"
                  >
                    Open creator
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setActiveTagFilter(null)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  !activeTag
                    ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                    : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                )}
              >
                All tags
              </button>
              {tagCountsInScope.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTagFilter(activeTag === tag ? null : tag)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    activeTag === tag
                      ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                      : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                  )}
                >
                  #{tag} <span className="opacity-70">({count})</span>
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-[24px] border border-[color:var(--glass-border)] px-3 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                <span>Workspace list</span>
                <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-1 text-[10px]">
                  {sidebarPosts.length} posts
                </span>
                {selectedSidebarPostId ? (
                  <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-1 text-[10px]">
                    Active map pin linked
                  </span>
                ) : null}
              </div>
            </div>
            <div className="workspace-scroll-shadow mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              {sidebarPosts.length === 0 ? (
                <div className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                  {selectedTopicSlugs.size > 0
                    ? "Žádné příspěvky pro zvolená témata."
                    : focusedCreator
                      ? "This creator has no posts in the current map and topic scope."
                      : "V tomto regionu zatím nic není."}
                </div>
              ) : (
                <div className="space-y-3">
                  {sidebarPosts.slice(0, 18).map((post, index) => (
                    <div
                      key={post.id}
                      className="min-w-0"
                      onMouseEnter={() => setSelectedFeedPostId(post.id)}
                    >
                      <PostCard
                        post={post}
                        compact
                        highlighted={selectedSidebarPostId === post.id}
                        numberedIndex={index + 1}
                        onOpen={openPost}
                        onFocusCreator={focusCreator}
                        className="w-full min-w-0"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4 sm:px-6 lg:px-8">
        <div className={cn(panelClass(), "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                <Bookmark className="h-3.5 w-3.5" />
                Trip board
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
                Turn interesting places into a real route.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-400">
                Keep planning close to discovery: save stops from location detail, organize them by day and time, and
                keep a lightweight travel board for this country.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAiPlannerOpen((open) => !open)}
                disabled={creatorScopedPosts.length === 0}
                className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-200"
              >
                Create AI itinerary
              </button>
              <Link
                href="/itinerary"
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
              >
                Open trips
              </Link>
            </div>
          </div>

          {aiPlannerOpen ? (
            <div className="mt-5 grid gap-3 rounded-[24px] border border-[color:var(--glass-border)] p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <div className="text-base font-semibold text-[color:var(--foreground)]">Plan from current Explore scope</div>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  The first AI planner slice works only from the places currently visible to Explore filters: region,
                  topics, tag filter, and optional creator focus.
                </p>
                <div className="mt-3 grid gap-3">
                  <input
                    type="text"
                    value={aiPlannerTitle}
                    onChange={(event) => setAiPlannerTitle(event.target.value)}
                    placeholder={`AI trip${selectedPlace?.label ? ` · ${selectedPlace.label}` : ""}`}
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                  <textarea
                    value={aiPlannerPrompt}
                    onChange={(event) => setAiPlannerPrompt(event.target.value)}
                    placeholder="První den chci kávu, vyhlídku a večer vodu na přespání v karavanu. Druhý den chci hezké město na oběd a místní památky."
                    className="min-h-[120px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "2 days by van, swim spots and one sunset stop",
                    "Family-friendly day around this region",
                    "Coffee, short hike, scenic lunch, overnight by water",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setAiPlannerPrompt(example)}
                      className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-400 dark:text-stone-300"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={createAiItinerary}
                    disabled={!aiPlannerPrompt.trim() || creatorScopedPosts.length === 0 || isAiPlannerPending}
                    className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
                  >
                    {isAiPlannerPending ? "Planning..." : "Generate draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiPlannerOpen(false)}
                    className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <aside className="rounded-2xl border border-[color:var(--glass-border)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  Scope
                </div>
                <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                  <div>{selectedPlace?.label ?? countryName}</div>
                  <div>{creatorScopedPosts.length} eligible places</div>
                  <div>{focusedCreator ? `Focused creator: ${focusedCreator.displayName}` : "All creators in scope"}</div>
                  <div>{activeTag ? `Tag filter: #${activeTag}` : "No tag filter"}</div>
                  <div>
                    {selectedTopicSlugs.size > 0
                      ? `Topics: ${[...selectedTopicSlugs].join(", ")}`
                      : "All topics in current region"}
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {aiPlannerMessage ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--glass-border)] px-4 py-3 text-sm text-stone-700 dark:text-stone-200">
              {aiPlannerMessage}{" "}
              <Link
                href={aiPlannerTripId ? `/itinerary?trip=${aiPlannerTripId}` : "/itinerary"}
                className="font-semibold underline underline-offset-2"
              >
                Open trips
              </Link>
            </div>
          ) : null}

          {aiPlannerWarnings.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
              {aiPlannerWarnings.join(" ")}
            </div>
          ) : null}

          {!viewerId ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--glass-border)] px-5 py-6 text-sm text-stone-600 dark:text-stone-400">
              Sign in to start building day-by-day itineraries from the places you discover here.
            </div>
          ) : itinerariesForSurface.length === 0 ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
              <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-5 py-6">
                <div className="text-base font-semibold text-[color:var(--foreground)]">
                  No trip for {countryCode === "ALL" ? "Europe" : countryName} yet
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Open a location, tap <span className="font-semibold">Plan trip</span>, and start with something like
                  <span className="font-semibold"> Day 1 · 08:00</span>.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--glass-border)] px-5 py-6">
                <div className="text-sm font-semibold text-[color:var(--foreground)]">Good first structure</div>
                <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                  <div>Day 1 · morning arrival coffee</div>
                  <div>Day 1 · sunset viewpoint</div>
                  <div>Day 2 · market, swim spot, overnight stop</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {itinerariesForSurface.map((itinerary) => (
                <Link
                  key={itinerary.id}
                  href="/itinerary"
                  className="rounded-[24px] border border-[color:var(--glass-border)] p-5 transition hover:border-stone-400 dark:hover:border-stone-500"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-[color:var(--foreground)]">{itinerary.title}</div>
                      {itinerary.description ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                          {itinerary.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-500 dark:text-stone-300">
                      {itinerary.entries.length} stops
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {itinerary.dayLabels.slice(0, 4).map((dayLabel) => (
                      <span
                        key={dayLabel}
                        className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                      >
                        {dayLabel}
                      </span>
                    ))}
                    {itinerary.dayLabels.length > 4 ? (
                      <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-500 dark:text-stone-300">
                        +{itinerary.dayLabels.length - 4} days
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-3">
                    {itinerary.previewEntries.map(({ entry, post }) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--glass-border)] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                            {entry.dayLabel}
                            {entry.timeLabel ? ` · ${entry.timeLabel}` : ""}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-[color:var(--foreground)]">
                            {post?.post.title ?? "Saved stop"}
                          </div>
                          <div className="truncate text-sm text-stone-500 dark:text-stone-400">
                            {post?.locationSummary ?? entry.note ?? "Trip stop"}
                          </div>
                        </div>
                        {entry.tags.length > 0 ? (
                          <div className="shrink-0 rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:text-stone-300">
                            {entry.tags[0]}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span>Updated {formatRelativeDate(itinerary.updatedAt)}</span>
                    <span>{itinerary.countryCode ?? "Multi-country"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className={exploreSectionTitle}>Témata</h2>
        <div className="mt-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:items-center">
            <div className="flex w-full flex-nowrap justify-start gap-3 overflow-x-auto [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:justify-center sm:overflow-visible">
              <input
                type="search"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="Hledat téma…"
                className={cn(
                  "min-w-[10rem] shrink-0 rounded-full px-5 py-3 text-base outline-none transition focus:ring-2 focus:ring-stone-400/30 md:px-7 md:py-3.5 md:text-lg",
                  regionPill(false),
                )}
                aria-label="Hledat téma"
              />
              <button
                type="button"
                onClick={clearTopics}
                className={cn(regionPill(selectedTopicSlugs.size === 0), "whitespace-nowrap")}
              >
                Všechna témata
              </button>
              {topicsVisible.map((topic) => {
                const Icon = getTopicIcon(topic.slug);
                const n = topicCountsInRegion.get(topic.slug) ?? 0;
                const active = selectedTopicSlugs.has(topic.slug);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.slug)}
                    className={cn(topicTagClass(active), "whitespace-nowrap")}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    {topic.name}
                    <span className={cn("text-xs font-medium opacity-70 md:text-sm", active && "opacity-90")}>
                      ({n})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className={exploreSectionTitle}>Travel groups</h2>
        {groupsForSurface.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--glass-border)] py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No groups match the current country and topic filter.
          </div>
        ) : (
          <FullBleedSlider centerRow>
            {groupsForSurface.map((group) => {
              const AccessIcon = group.accessType === "paid" ? WalletCards : group.accessType === "private" ? Lock : Globe2;
              const joined =
                viewerId === group.owner.id ||
                (group.accessType === "paid"
                  ? localState.subscriptionCreatorIds.includes(group.owner.id)
                  : localState.joinedGroupSlugs.includes(group.slug));
              return (
                <Link
                  key={group.slug}
                  href={`/groups/${group.slug}`}
                  className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 text-left backdrop-blur-md transition hover:border-stone-400 dark:hover:border-stone-500"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-700 dark:text-stone-200">
                      <AccessIcon className="h-3.5 w-3.5" />
                      {group.accessType}
                    </span>
                    {group.priceCzk ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                        {group.priceCzk} CZK
                      </span>
                    ) : null}
                    {joined ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                        Joined
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar
                      src={group.owner.avatarUrl}
                      alt=""
                      displayName={group.owner.displayName}
                      className="h-11 w-11 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[color:var(--foreground)]">{group.name}</div>
                      <div className="truncate text-xs text-stone-500 dark:text-stone-400">@{group.owner.username}</div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600 dark:text-stone-400">
                    {group.shortDescription}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {group.memberCount}
                    </span>
                    <span>{group.postCount} posts</span>
                  </div>
                </Link>
              );
            })}
          </FullBleedSlider>
        )}
      </section>

      <section>
        <h2 className={exploreSectionTitle}>Tvůrci v regionu</h2>
        {creators.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--glass-border)] py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            Žádní tvůrci pro aktuální filtr.
          </div>
        ) : (
          <FullBleedSlider centerRow>
            {creators.map((creator) => {
              const stats = getCreatorStats(snapshot, creator.id);
              const locCount = creatorLocationCountInFilter(creator.id, filteredPosts);
              return (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => setCreatorDialogUsername(creator.username)}
                  className="flex w-[240px] shrink-0 flex-col items-center rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-3 text-center backdrop-blur-md transition hover:border-stone-400 dark:hover:border-stone-500"
                >
                  <div className="relative flex w-full items-center justify-center">
                    <Avatar
                      src={creator.avatarUrl}
                      alt={creator.displayName}
                      displayName={creator.displayName}
                      className="h-11 w-11 shrink-0"
                    />
                    <ArrowUpRight className="absolute right-0 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2 text-stone-400" />
                  </div>
                  <div className="mt-2 line-clamp-2 font-medium text-[color:var(--foreground)]">
                    {creator.displayName}
                  </div>
                  <div className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">@{creator.username}</div>
                  <div className="mt-2 space-y-0.5 text-center text-[11px] text-stone-600 dark:text-stone-400">
                    <div>{stats.followerCount} sledujících</div>
                    <div>
                      {locCount}{" "}
                      {locCount === 1 ? "lokalita" : locCount >= 2 && locCount <= 4 ? "lokality" : "lokalit"} v
                      výběru
                    </div>
                    <div>
                      {stats.collectionCount}{" "}
                      {stats.collectionCount === 1
                        ? "kolekce"
                        : stats.collectionCount >= 2 && stats.collectionCount <= 4
                          ? "kolekce"
                          : "kolekcí"}
                    </div>
                  </div>
                </button>
              );
            })}
          </FullBleedSlider>
        )}
      </section>

      <section>
        <h2 className={exploreSectionTitle}>Kolekce</h2>
        {collections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--glass-border)] py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            Žádná kolekce v tomto výběru.
          </div>
        ) : (
          <FullBleedSlider>
            {collections.map((collection) => {
              const counts = collectionFreeHiddenCounts(snapshot, collection);
              const rating = demoCollectionRating(collection.id);
              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="flex w-[240px] shrink-0 flex-col overflow-hidden rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur-md transition hover:border-stone-400 dark:hover:border-stone-500"
                >
                  <div className="relative aspect-[4/3] w-full bg-stone-200 dark:bg-stone-800">
                    {collection.coverImageUrl ? (
                      <Image
                        src={collection.coverImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="260px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Globe2 className="h-12 w-12 text-stone-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <div className="font-semibold text-[color:var(--foreground)] line-clamp-2">{collection.title}</div>
                    <p className="mt-1 flex-1 text-sm leading-snug text-stone-600 dark:text-stone-400 line-clamp-3">
                      {collection.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-[color:var(--glass-border)] pt-2">
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium leading-tight">
                        <span className="rounded-full border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-white dark:bg-emerald-700">
                          {counts.free} zdarma
                        </span>
                        <span className="text-stone-500 transition hover:text-amber-400 dark:text-stone-500 dark:hover:text-amber-400">
                          {counts.hidden} skrytých
                        </span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                        {rating.toFixed(1)}
                        <span className="sr-only">demo hodnocení</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </FullBleedSlider>
        )}
      </section>

      <section className="space-y-4 pb-8 text-left">
        <h2 className={cn(exploreSectionTitle, "text-left")}>Stojí za rozkliknutí</h2>
        {popularPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--glass-border)] py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            Nic k zobrazení.
          </div>
        ) : (
          <FullBleedContent>
            <div className="flex flex-wrap justify-center gap-3">
              {popularPosts.map((post) => (
                <div
                  key={post.id}
                  className="w-full min-w-[200px] max-w-[320px] flex-[1_1_200px] sm:max-w-[280px]"
                >
                  <PostCard
                    post={post}
                    compact
                    strip
                    stripDivider={false}
                    onOpen={openPost}
                    className="w-full min-w-0"
                  />
                </div>
              ))}
            </div>
          </FullBleedContent>
        )}
        {hasMorePopular && popularPosts.length > 0 && (
          <div className="flex justify-start pt-2">
            <button
              type="button"
              onClick={() => setPopularCount((n) => n + POPULAR_PAGE_SIZE)}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition",
                theme === "light"
                  ? "border-2 border-stone-900 bg-white text-stone-950 hover:bg-stone-50"
                  : "border-2 border-stone-100 bg-transparent text-stone-100 hover:bg-white/10",
              )}
            >
              Načíst další
            </button>
          </div>
        )}
      </section>

      <CreatorProfileDialog username={creatorDialogUsername} onClose={() => setCreatorDialogUsername(null)} />
      <PostDetailDialog postId={dialogPostId} onClose={() => setDialogPostId(null)} />
    </div>
  );
}
