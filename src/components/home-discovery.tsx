"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AdminDivisionNavigator } from "@/components/admin-division-navigator";
import { useWikipediaPois } from "@/components/use-wikipedia-pois";
import { ChevronDown, Layers, LocateFixed, SlidersHorizontal } from "@/components/icons";
import { MapTimeline } from "@/components/map-timeline";
import { MapView, type MapViewportBounds } from "@/components/map-view";
import { PostDetailDialog } from "@/components/post-detail-dialog";
import { PostCard } from "@/components/post-card";
import { useDiscoveryHeaderSearch } from "@/components/discovery-header-search-context";
import { useCountry } from "@/components/providers/country-context";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { getAdminSearchPlaces, getDemoWholeCountryPlace } from "@/lib/admin-regions-by-country";
import { getCountryBounds } from "@/lib/country-bounds";
import { getCountryMapConfig, isCountryDemoEnabled } from "@/lib/countries";
import { getDemoPoiPostsForCountry } from "@/lib/demo-pois-by-country";
import { filterPosts, getCreatorPosts, hydratePosts, topCreators } from "@/lib/discovery";
import { MAP_STYLE_OPTIONS } from "@/lib/map-style";
import type { DiscoveryFilters, FeedMode, SearchPlace } from "@/lib/types";
import { debugAgentLog } from "@/lib/debug-agent-log";
import { cn } from "@/lib/utils";

function postInViewport(lat: number, lng: number, b: MapViewportBounds): boolean {
  if (lat < b.south || lat > b.north) return false;
  if (b.west <= b.east) return lng >= b.west && lng <= b.east;
  return lng >= b.west || lng <= b.east;
}

function mapBoundsNearlyEqual(a: MapViewportBounds | null, b: MapViewportBounds, eps = 1e-5): boolean {
  if (!a) return false;
  return (
    Math.abs(a.west - b.west) < eps &&
    Math.abs(a.south - b.south) < eps &&
    Math.abs(a.east - b.east) < eps &&
    Math.abs(a.north - b.north) < eps
  );
}

const modeOptions: Array<{ value: FeedMode; label: string }> = [
  { value: "nearby", label: "Nearby" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "following", label: "Following" },
];

export function HomeDiscovery() {
  const { theme } = useTheme();
  const { isCzechia, countryCode } = useCountry();
  const { snapshot, viewerId, hydratedPosts, toggleFollow } = useDemoStore();
  const { setSearchInput } = useDiscoveryHeaderSearch();
  const isAllCountries = countryCode === "ALL";
  const defaultPlace =
    snapshot.searchPlaces.find((place) => place.id === "place-plzen-city") ?? snapshot.searchPlaces[0];
  const [mobileSurface, setMobileSurface] = useState<"map" | "feed">("map");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [dialogPostId, setDialogPostId] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<"all" | "latest" | "featured">("all");
  const [focusedCreatorId, setFocusedCreatorId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>({
    mode: "nearby",
    sortBy: "nearby",
    regionId: defaultPlace?.id,
    regionPlace: defaultPlace ?? null,
    topicSlug: undefined,
    visibility: "all",
    activeOnly: true,
    center: defaultPlace ? { latitude: defaultPlace.latitude, longitude: defaultPlace.longitude } : null,
  });
  const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [mapLayerId, setMapLayerId] = useState<string>("voyager");
  const [mapLayerDropdownOpen, setMapLayerDropdownOpen] = useState(false);
  const mapLayerDropdownRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
  const [mapViewportBounds, setMapViewportBounds] = useState<MapViewportBounds | null>(null);
  /** Same default on server + first client paint — localStorage applied after mount (avoids hydration mismatch). */
  const [panelRatio, setPanelRatio] = useState(0.55);
  const filtersPopoverRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const skipInitialPanelPersist = useRef(true);
  const feedScopeKeyRef = useRef(`${filters.regionId}|${filters.mode}|${focusedCreatorId ?? ""}`);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const v = localStorage.getItem("home-panel-ratio");
      if (v != null) {
        const n = Number.parseFloat(v);
        if (Number.isFinite(n) && n >= 0.2 && n <= 0.8) setPanelRatio(n);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (skipInitialPanelPersist.current) {
      skipInitialPanelPersist.current = false;
      return;
    }
    try {
      localStorage.setItem("home-panel-ratio", String(panelRatio));
    } catch {}
  }, [panelRatio]);

  const startSplitResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const container = splitContainerRef.current;
    if (!container) return;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    const SEP = 16;
    const onMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const rect = container.getBoundingClientRect();
      const inner = Math.max(rect.width - SEP, 1);
      const ratio = (moveEvent.clientX - rect.left) / inner;
      setPanelRatio(Math.min(0.8, Math.max(0.2, ratio)));
    };
    const onUp = () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /** Wheel/trackpad: document body is overflow:hidden — some engines won't scroll nested div; handle explicitly. */
  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const delta = e.deltaY;
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
      if ((delta < 0 && canScrollUp) || (delta > 0 && canScrollDown)) {
        e.preventDefault();
        el.scrollTop += delta;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mobileSurface, focusedCreatorId, feedTab]);

  useEffect(() => {
    const placeId = searchParams.get("place");
    if (placeId && defaultPlace) {
      const place = snapshot.searchPlaces.find((p) => p.id === placeId);
      if (place) {
        setFilters((prev) => ({
          ...prev,
          regionId: place.id,
          regionPlace: place,
          center: { latitude: place.latitude, longitude: place.longitude },
        }));
        setSearchInput(place.label);
      }
    }
  }, [searchParams, defaultPlace?.id, snapshot.searchPlaces, setSearchInput]);

  useEffect(() => {
    const placeId = searchParams.get("place");
    if (placeId) return;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (!lat || !lng) return;
    const la = Number.parseFloat(lat);
    const ln = Number.parseFloat(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
    setFilters((prev) => ({
      ...prev,
      center: { latitude: la, longitude: ln },
      mode: "nearby",
      sortBy: "nearby",
      regionId: undefined,
      regionPlace: null,
    }));
    const q = searchParams.get("q");
    if (q) {
      try {
        setSearchInput(decodeURIComponent(q));
      } catch {
        setSearchInput(q);
      }
    }
  }, [searchParams, setSearchInput]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersPopoverRef.current && !filtersPopoverRef.current.contains(event.target as Node)) {
        setFiltersPopoverOpen(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false);
      }
      if (mapLayerDropdownRef.current && !mapLayerDropdownRef.current.contains(event.target as Node)) {
        setMapLayerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filtersPopoverOpen, modeDropdownOpen, mapLayerDropdownOpen]);

  const postsForCenter = useMemo(
    () => hydratePosts(snapshot, viewerId, filters.center ?? null),
    [filters.center, snapshot, viewerId],
  );

  const seededCountries = useMemo(() => {
    const out = new Set<string>();
    snapshot.locations.forEach((loc) => {
      if (loc.country) out.add(String(loc.country).toUpperCase());
    });
    return out;
  }, [snapshot.locations]);

  useEffect(() => {
    if (isAllCountries) {
      setFilters((current) => ({
        ...current,
        regionId: undefined,
        regionPlace: null,
        center: current.center ?? { latitude: 50.0, longitude: 12.0 },
      }));
      return;
    }
    const desiredId = isCzechia ? "place-plzen-city" : `demo-${countryCode.toUpperCase()}-all`;
    const place = snapshot.searchPlaces.find((p) => p.id === desiredId);
    if (!place) return;
    setFilters((current) => ({
      ...current,
      regionId: place.id,
      regionPlace: place,
      center: { latitude: place.latitude, longitude: place.longitude },
    }));
  }, [countryCode, isCzechia, isAllCountries, snapshot.searchPlaces]);

  const filteredPosts = useMemo(
    () => filterPosts(snapshot, postsForCenter, viewerId, filters).slice(0, 30),
    [filters, postsForCenter, snapshot, viewerId],
  );

  const featuredCreators = useMemo(() => topCreators(snapshot), [snapshot]);
  const activeTopics = useMemo(() => snapshot.topics, [snapshot.topics]);

  const selectedRegionLabel = filters.regionId
    ? filters.regionPlace?.label ?? snapshot.searchPlaces.find((place) => place.id === filters.regionId)?.label ?? "Custom area"
    : isAllCountries
      ? "Všechny země"
      : "Custom area";

  const currentCountryRootPlace = useMemo(() => {
    if (isAllCountries) return null;
    return snapshot.searchPlaces.find((place) => place.id === `demo-${countryCode.toUpperCase()}-all`) ?? null;
  }, [countryCode, isAllCountries, snapshot.searchPlaces]);

  const quickPlaces = useMemo(() => {
    if (isAllCountries) {
      return snapshot.searchPlaces.filter((p) => p.kind === "country").slice(0, 7);
    }
    if (isCzechia) return snapshot.searchPlaces.slice(0, 7);
    const cc = countryCode.toUpperCase();
    const whole = snapshot.searchPlaces.find((p) => p.id === `demo-${cc}-all`) ?? null;
    const regions = snapshot.searchPlaces
      .filter((p) => (p.country ?? "").toUpperCase() === cc && p.kind === "region")
      .slice(0, 6);
    return (whole ? [whole, ...regions] : regions).slice(0, 7);
  }, [countryCode, isCzechia, isAllCountries, snapshot.searchPlaces]);

  const focusedCreator = useMemo(
    () => snapshot.users.find((user) => user.id === focusedCreatorId) ?? null,
    [focusedCreatorId, snapshot.users],
  );
  const isFollowingFocusedCreator =
    focusedCreator && viewerId
      ? snapshot.follows.some(
          (follow) => follow.followerId === viewerId && follow.followedUserId === focusedCreator.id,
        )
      : false;

  const focusedPosts = useMemo(
    () => (focusedCreatorId ? getCreatorPosts(snapshot, viewerId, focusedCreatorId) : []),
    [focusedCreatorId, snapshot, viewerId],
  );

  const sourcePosts = focusedCreator ? focusedPosts : filteredPosts;
  const timeBounds = useMemo(() => {
    if (sourcePosts.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const p of sourcePosts) {
      const t = new Date(p.post.createdAt).getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return min <= max ? { min, max } : null;
  }, [sourcePosts]);

  const feedScopeKey = `${filters.regionId}|${filters.mode}|${focusedCreatorId ?? ""}`;
  useEffect(() => {
    if (feedScopeKeyRef.current !== feedScopeKey) {
      feedScopeKeyRef.current = feedScopeKey;
      setTimeRange(null);
    }
  }, [feedScopeKey]);

  useEffect(() => {
    if (!timeBounds) {
      setTimeRange(null);
      return;
    }
    setTimeRange((prev) => {
      if (prev === null) return [timeBounds.min, timeBounds.max];
      const clampedStart = Math.max(timeBounds.min, Math.min(prev[0], timeBounds.max - 1));
      const clampedEnd = Math.min(timeBounds.max, Math.max(prev[1], timeBounds.min + 1));
      if (clampedStart > clampedEnd) return [timeBounds.min, timeBounds.max];
      return [clampedStart, clampedEnd];
    });
  }, [timeBounds?.min, timeBounds?.max]);

  const timeFilteredPosts = useMemo(() => {
    if (!timeRange || sourcePosts.length === 0) return sourcePosts;
    const [start, end] = timeRange;
    return sourcePosts.filter((p) => {
      const t = new Date(p.post.createdAt).getTime();
      return t >= start && t <= end;
    });
  }, [sourcePosts, timeRange]);

  const demoMapPosts = useMemo(() => {
    if (isAllCountries) return null;
    const cc = countryCode.toUpperCase();
    if (isCzechia || seededCountries.has(cc) || !isCountryDemoEnabled(cc)) return null;
    const u = snapshot.users[0];
    if (!u) return null;
    const t = snapshot.topics[0] ?? null;
    return getDemoPoiPostsForCountry(countryCode, u, t);
  }, [isAllCountries, isCzechia, countryCode, seededCountries, snapshot.users, snapshot.topics]);

  const demoHpPlaces = useMemo((): SearchPlace[] => {
    if (!demoMapPosts) return [];
    const whole = getDemoWholeCountryPlace(countryCode);
    const admin = getAdminSearchPlaces(countryCode);
    return admin.length > 0 ? [whole, ...admin] : [whole];
  }, [demoMapPosts, countryCode]);

  const demoHpDefaultId = demoHpPlaces[0]?.id ?? null;
  const [demoHpRegionId, setDemoHpRegionId] = useState<string | null>(null);
  useEffect(() => {
    if (!demoHpDefaultId) {
      setDemoHpRegionId(null);
      return;
    }
    setDemoHpRegionId(demoHpDefaultId);
  }, [countryCode, isCzechia, demoHpDefaultId]);

  const mapPosts = demoMapPosts ?? timeFilteredPosts;
  const activeWikipediaPlace = useMemo(() => {
    if (demoMapPosts) {
      return demoHpPlaces.find((place) => place.id === (demoHpRegionId ?? demoHpDefaultId)) ?? demoHpPlaces[0] ?? null;
    }
    return filters.regionPlace ?? (filters.regionId ? snapshot.searchPlaces.find((place) => place.id === filters.regionId) ?? null : null);
  }, [demoHpDefaultId, demoHpPlaces, demoHpRegionId, demoMapPosts, filters.regionId, filters.regionPlace, snapshot.searchPlaces]);
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
    place: activeWikipediaPlace,
  });
  const mapPostsForView = useMemo(() => {
    if (!demoMapPosts) return mapPosts;
    const id = demoHpRegionId ?? demoHpPlaces[0]?.id;
    const place = demoHpPlaces.find((p) => p.id === id) ?? demoHpPlaces[0];
    if (!place || place.kind === "country") return demoMapPosts;
    return demoMapPosts.filter((p) => p.location.region === place.region);
  }, [demoMapPosts, demoHpRegionId, demoHpPlaces, mapPosts]);

  const lastEmittedBoundsRef = useRef<MapViewportBounds | null>(null);
  const handleMapBounds = useCallback((b: MapViewportBounds) => {
    if (mapBoundsNearlyEqual(lastEmittedBoundsRef.current, b)) return;
    lastEmittedBoundsRef.current = b;
    setMapViewportBounds(b);
  }, []);

  const postsInMapViewport = useMemo(() => {
    if (!mapViewportBounds || mapPostsForView.length === 0) return mapPostsForView;
    return mapPostsForView.filter((p) =>
      postInViewport(p.displayLatitude, p.displayLongitude, mapViewportBounds),
    );
  }, [mapPostsForView, mapViewportBounds]);

  const viewportScopedPosts = useMemo(
    () => (mapViewportBounds ? postsInMapViewport : mapPostsForView),
    [mapPostsForView, mapViewportBounds, postsInMapViewport],
  );

  const viewportTopics = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; n: number }>();
    for (const p of viewportScopedPosts) {
      if (!p.topic?.slug) continue;
      const cur = counts.get(p.topic.slug);
      if (cur) cur.n += 1;
      else counts.set(p.topic.slug, { slug: p.topic.slug, name: p.topic.name, n: 1 });
    }
    return [...counts.values()].sort((a, b) => b.n - a.n);
  }, [viewportScopedPosts]);

  const feedPosts = useMemo(() => {
    const base = viewportScopedPosts;
    if (feedTab === "latest") {
      return [...base].sort(
        (left, right) =>
          new Date(right.post.createdAt).getTime() - new Date(left.post.createdAt).getTime(),
      );
    }
    return base;
  }, [feedTab, viewportScopedPosts]);
  const countryCfg = getCountryMapConfig(countryCode);
  const mapCenter =
    demoMapPosts != null
      ? { latitude: countryCfg.centerLat, longitude: countryCfg.centerLng }
      : focusedCreator && focusedPosts.length > 0
        ? { latitude: focusedPosts[0].displayLatitude, longitude: focusedPosts[0].displayLongitude }
        : filters.center;

  // #region agent log
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const wrap = mapWrapperRef.current;
      const split = splitContainerRef.current;
      const wrapRect = wrap?.getBoundingClientRect();
      const splitRect = split?.getBoundingClientRect();
      const wrapW = wrapRect?.width ?? 0;
      const wrapH = wrapRect?.height ?? 0;
      const splitW = splitRect?.width ?? 0;
      const splitH = splitRect?.height ?? 0;
      debugAgentLog({
        location: "home-discovery.tsx:mapLayout",
        message: "HP map column layout",
        data: {
          mapWrapperW: wrapW,
          mapWrapperH: wrapH,
          splitW,
          splitH,
          mapPostsLen: mapPostsForView.length,
          hasCenter: !!mapCenter,
          mobileSurface,
          mapColVisible: mobileSurface === "map",
        },
        hypothesisId: "B",
        runId: "post-fix",
      });
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(run));
    return () => {
      cancelled = true;
    };
  }, [mapPostsForView.length, mapCenter, mobileSurface]);
  // #endregion

  const openPost = useCallback((postId: string) => {
    if (postId.startsWith("demo_poi_")) return;
    setSelectedPostId(postId);
    setDialogPostId(postId);
  }, []);

  const focusCreator = (creatorId: string) => {
    setFocusedCreatorId(creatorId);
    setSelectedPostId(null);
    setFeedTab("all");
    if (mobileSurface === "map") {
      setMobileSurface("feed");
    }
  };

  const clearCreatorFocus = () => {
    setFocusedCreatorId(null);
    setSelectedPostId(null);
  };

  const handlePlaceSelection = useCallback(
    (place: SearchPlace) => {
      setFilters((current) => ({
        ...current,
        mode: current.mode === "following" ? "regional" : current.mode,
        regionId: place.id,
        regionPlace: place,
        center: { latitude: place.latitude, longitude: place.longitude },
        sortBy: current.mode === "nearby" ? "nearby" : current.sortBy,
      }));
      setSearchInput(place.label);
      setSelectedPostId(null);
      setFocusedCreatorId(null);
      setMobileSurface("map");
      const params = new URLSearchParams(searchParams.toString());
      params.set("place", place.id);
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, setSearchInput],
  );

  const requestGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setFilters((current) => ({
        ...current,
        center: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        mode: "nearby",
        sortBy: "nearby",
        regionId: undefined,
        regionPlace: null,
      }));
      setSearchInput("Current location");
      setSelectedPostId(null);
      setFocusedCreatorId(null);
      setMobileSurface("feed");
    });
  };

  const mapGrowInt = Math.round(panelRatio * 100);
  const splitVars = {
    ["--hp-map-grow" as string]: String(mapGrowInt),
    ["--hp-feed-grow" as string]: String(100 - mapGrowInt),
  } as CSSProperties;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden md:gap-0">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-0">
          <div className="flex items-center justify-between gap-2 rounded-full border-0 bg-white/70 p-1 text-[11px] font-medium text-stone-600 backdrop-blur-sm md:hidden dark:bg-white/10">
            <button
            type="button"
            onClick={() => setMobileSurface("map")}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center transition",
              mobileSurface === "map" ? "bg-stone-950 text-white" : "text-stone-600",
            )}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setMobileSurface("feed")}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center transition",
              mobileSurface === "feed" ? "bg-stone-950 text-white" : "text-stone-600",
            )}
          >
            Feed
          </button>
          </div>
        </div>

        <div
          ref={splitContainerRef}
          className="hp-discover-split flex min-h-0 flex-1 flex-col md:h-[calc(100dvh-4.25rem)] md:min-h-0 md:flex-row md:items-stretch"
          style={splitVars}
        >
          <div
            className={cn(
              "hp-discover-map-col relative flex min-w-0 flex-col overflow-hidden md:min-w-[260px]",
              mobileSurface === "map" ? "flex md:h-full" : "hidden md:flex md:h-full",
            )}
          >
            {/*
              Explicit block size like Explore (h-[520px]) — flex-1 chains often yield 0×0 for WebGL.
              Desktop: same height as split row. Mobile: min viewport band for tiles.
            */}
            <div
              ref={mapWrapperRef}
              className="relative z-0 w-full shrink-0 overflow-hidden bg-stone-950 min-h-[min(52dvh,560px)] md:h-[calc(100dvh-4.25rem)] md:min-h-[calc(100dvh-4.25rem)] md:max-h-[calc(100dvh-4.25rem)]"
            >
              <MapView
                key={`hp-map-${mapLayerId}-${countryCode}`}
                posts={mapPostsForView}
                externalPois={wikipediaPois}
                center={demoMapPosts ? undefined : mapCenter}
                fitBounds={demoMapPosts ? getCountryBounds(countryCode) : null}
                fitBoundsRevision={demoMapPosts ? countryCode : null}
                clusterMaxZoom={demoMapPosts ? 2 : 4}
                clusterRadius={demoMapPosts ? 56 : 30}
                selectedPostId={selectedPostId}
                onSelectPost={setSelectedPostId}
                onOpenPost={openPost}
                showPostOverlay={false}
                fullBleed
                mapLayerId={mapLayerId}
                controlPosition="bottom-left"
                className="box-border z-0 h-full w-full !min-h-0"
                debugSource="home"
                onBoundsChange={handleMapBounds}
              />
            <div className="pointer-events-none absolute inset-0 z-40 flex flex-col">
              <div className="flex justify-end p-2">
                <div
                  ref={filtersPopoverRef}
                  className="pointer-events-auto relative flex max-w-[min(100%,24rem)] flex-wrap items-center justify-end gap-1 rounded-xl border border-stone-200/90 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm dark:border-stone-600 dark:bg-stone-900/95"
                >
                  <button
                    type="button"
                    onClick={requestGeolocation}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                    aria-label="Near me"
                  >
                    <LocateFixed className="h-3.5 w-3.5" />
                  </button>
                  {!focusedCreator ? (
                    <button
                      type="button"
                      onClick={() => setFiltersPopoverOpen((open) => !open)}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 dark:border-stone-600",
                        filtersPopoverOpen ? "bg-stone-200 dark:bg-stone-600" : "bg-white dark:bg-stone-800",
                      )}
                      aria-label="Filters"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {!focusedCreator && filtersPopoverOpen ? (
                        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 max-w-[min(100vw-2rem,16rem)] rounded-xl border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-600 dark:bg-stone-900">
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-stone-500">Visibility</label>
                              <select
                                value={filters.visibility ?? "all"}
                                onChange={(event) =>
                                  setFilters((current) => ({
                                    ...current,
                                    visibility: event.target.value as DiscoveryFilters["visibility"],
                                  }))
                                }
                                className="h-8 w-full rounded-lg border border-stone-200 bg-white px-2 text-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                              >
                                <option value="all">All</option>
                                <option value="public">Public only</option>
                                <option value="subscriber_only">Subscriber only</option>
                                <option value="special_hidden_place">Special hidden</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-stone-500">Topic</label>
                              <select
                                value={filters.topicSlug ?? ""}
                                onChange={(event) =>
                                  setFilters((current) => ({ ...current, topicSlug: event.target.value || undefined }))
                                }
                                className="h-8 w-full rounded-lg border border-stone-200 bg-white px-2 text-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                              >
                                <option value="">All topics</option>
                                {activeTopics.map((topic) => (
                                  <option key={topic.id} value={topic.slug}>
                                    {topic.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div className="mb-1.5 text-[11px] font-medium text-stone-500">Region: {selectedRegionLabel}</div>
                              {isAllCountries || !currentCountryRootPlace ? (
                                <div className="flex flex-wrap gap-1">
                                  {quickPlaces.map((place) => (
                                    <button
                                      key={place.id}
                                      type="button"
                                      onClick={() => handlePlaceSelection(place)}
                                      className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px]",
                                        filters.regionId === place.id
                                          ? "bg-stone-900 text-white"
                                          : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800",
                                      )}
                                    >
                                      {place.label}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <AdminDivisionNavigator
                                  countryCode={countryCode}
                                  rootPlace={currentCountryRootPlace}
                                  selectedPlaceId={filters.regionId ?? null}
                                  onSelectPlace={handlePlaceSelection}
                                  className="rounded-xl border-stone-200/90 bg-stone-50/80 p-2.5 dark:border-stone-700 dark:bg-stone-950/60"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                  ) : null}
                  <div className="relative shrink-0" ref={mapLayerDropdownRef}>
                    <button
                      type="button"
                      onClick={() => void loadWikipediaPois()}
                      disabled={!mapViewportBounds || wikipediaPoisLoading || !activeWikipediaPlace}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
                        hasLoadedWikipediaPois
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-stone-200 bg-white text-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200",
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
                        className="inline-flex items-center rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                      >
                        Clear pins
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setMapLayerDropdownOpen((o) => !o)}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 dark:border-stone-600",
                        mapLayerDropdownOpen ? "bg-stone-200 dark:bg-stone-600" : "bg-white dark:bg-stone-800",
                      )}
                      aria-label="Map style"
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </button>
                    {mapLayerDropdownOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.35rem)] z-40 min-w-[132px] rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-600 dark:bg-stone-900">
                        {MAP_STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setMapLayerId(opt.id);
                              setMapLayerDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center px-3 py-2 text-left text-[11px] font-medium",
                              mapLayerId === opt.id ? "bg-stone-100 dark:bg-stone-700" : "hover:bg-stone-50 dark:hover:bg-stone-800",
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {(hasLoadedWikipediaPois || wikipediaPoisError) && (
                <div className="px-2 pb-1 text-right text-[10px] font-medium text-stone-600 dark:text-stone-300">
                  {wikipediaPoisError
                    ? "Wikipedia POI load failed."
                    : wikipediaPois.length > 0
                      ? `${wikipediaPois.length} Wikipedia POI currently shown across ${searchedWikipediaAreaCount} searched map area${searchedWikipediaAreaCount === 1 ? "" : "s"}.`
                      : "No Wikipedia POI found in the visible map area."}
                </div>
              )}
              <div className="mt-auto w-full px-2 pb-2 pt-6 md:px-3 md:pb-2 md:pr-2 md:pt-8">
                {timeBounds && timeRange ? (
                  <div
                    className={cn(
                      "pointer-events-auto w-full rounded-lg border px-2.5 py-1.5 shadow-sm",
                      theme === "light"
                        ? "border-stone-300 bg-white text-stone-900"
                        : "border-stone-700 bg-stone-900 text-stone-100",
                    )}
                  >
                    <MapTimeline
                      compact
                      variant={theme === "light" ? "lightPanel" : "darkPanel"}
                      minDate={timeBounds.min}
                      maxDate={timeBounds.max}
                      valueStart={timeRange[0]}
                      valueEnd={timeRange[1]}
                      onChange={setTimeRange}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            </div>
            {demoHpPlaces.length > 1 ? (
              <div className="relative z-30 flex shrink-0 gap-1.5 overflow-x-auto border-t border-stone-700/80 bg-stone-950/95 px-2 py-2 [-webkit-overflow-scrolling:touch] md:px-3">
                {demoHpPlaces.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => setDemoHpRegionId(place.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs",
                      (demoHpRegionId ?? demoHpDefaultId) === place.id
                        ? "bg-white text-stone-950"
                        : "border border-stone-600 bg-stone-900 text-stone-300 hover:border-stone-500",
                    )}
                  >
                    {place.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div
            role="separator"
            aria-label="Resize map and feed"
            className="group relative z-50 -ml-2 hidden w-2 shrink-0 self-stretch cursor-col-resize touch-none select-none md:flex"
            style={{ touchAction: "none" }}
            onPointerDown={startSplitResize}
          >
            {/* Pill centered on the divider line and on map height; half over map so map shows underneath */}
            <div
              className="pointer-events-none absolute left-0 top-1/2 flex h-14 w-2 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-stone-300/80 bg-white/95 shadow-[0_8px_20px_rgba(0,0,0,0.2)] dark:border-stone-500/70 dark:bg-stone-800/95 dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              aria-hidden
            >
              <span className="h-1 w-1 rounded-full bg-stone-500 transition-colors group-hover:bg-white dark:bg-stone-400 dark:group-hover:bg-white" />
              <span className="h-1 w-1 rounded-full bg-stone-500 transition-colors group-hover:bg-white dark:bg-stone-400 dark:group-hover:bg-white" />
              <span className="h-1 w-1 rounded-full bg-stone-500 transition-colors group-hover:bg-white dark:bg-stone-400 dark:group-hover:bg-white" />
            </div>
          </div>

          <div
            className={cn(
              "hp-discover-feed-col flex min-h-0 w-full flex-col overflow-hidden px-4 md:h-[calc(100dvh-4.25rem)] md:max-h-[calc(100dvh-4.25rem)] md:shrink-0 md:border-l md:border-[color:var(--glass-border)] md:bg-[color:var(--glass-bg)] md:backdrop-blur-md md:px-0 md:pl-8 md:text-left",
              mobileSurface === "feed" ? "min-h-[min(72dvh,640px)] flex-1 md:min-h-0" : "hidden md:flex",
            )}
          >
            {!focusedCreator ? (
              <div className="shrink-0 space-y-2 px-1 py-2 md:px-0">
                <div className="flex flex-wrap items-center justify-between gap-2 gap-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {(["all", "latest", "featured"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFeedTab(tab)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                          feedTab === tab
                            ? theme === "light"
                              ? "bg-stone-950 text-white"
                              : "bg-white text-stone-950"
                            : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800",
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="relative shrink-0" ref={modeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setModeDropdownOpen((o) => !o)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-stone-700 underline-offset-2 transition hover:underline dark:text-stone-200"
                    >
                      {modeOptions.find((o) => o.value === filters.mode)?.label ?? "Nearby"}
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                    </button>
                    {modeDropdownOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[120px] rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-600 dark:bg-stone-900">
                        {modeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setFilters((current) => ({
                                ...current,
                                mode: option.value,
                                sortBy:
                                  option.value === "popular"
                                    ? "popular"
                                    : option.value === "newest"
                                      ? "newest"
                                      : option.value === "nearby"
                                        ? "nearby"
                                        : current.sortBy,
                              }));
                              setModeDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center px-2.5 py-2 text-left text-[11px] font-medium",
                              filters.mode === option.value
                                ? "bg-stone-100 dark:bg-stone-700"
                                : "hover:bg-stone-50 dark:hover:bg-stone-800",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {feedTab === "featured" ? "Creators" : "Posts"}
                </p>
              </div>
            ) : null}

            {!focusedCreator && feedTab !== "featured" ? (
              <div className="shrink-0 py-2 md:px-0">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Topics in view
                </p>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 touch-pan-x">
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, topicSlug: undefined }))}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                      !filters.topicSlug
                        ? theme === "light"
                          ? "bg-stone-950 text-white"
                          : "bg-white text-stone-950"
                        : theme === "light"
                          ? "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                          : "border border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700",
                    )}
                  >
                    All topics
                  </button>
                  {viewportTopics.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, topicSlug: t.slug }))}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition",
                        filters.topicSlug === t.slug
                          ? theme === "light"
                            ? "bg-stone-950 text-white"
                            : "bg-white text-stone-950"
                          : theme === "light"
                            ? "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                            : "border border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700",
                      )}
                    >
                      {t.name}
                      <span
                        className={cn(
                          "ml-1 text-[10px]",
                          filters.topicSlug === t.slug
                            ? theme === "light"
                              ? "text-white/80"
                              : "text-stone-600"
                            : theme === "light"
                              ? "text-stone-500"
                              : "text-stone-300",
                        )}
                      >
                        ({t.n})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex min-h-[min(200px,35dvh)] w-full min-w-0 flex-1 flex-col overflow-hidden md:min-h-0">
              <div
                ref={feedScrollRef}
                className={cn(
                  "min-h-0 flex-1 basis-0 overflow-y-auto overscroll-y-contain py-2 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]",
                  focusedCreator ? "pt-8" : "",
                )}
              >
                {focusedCreator ? (
                  <>
                    <div className="sticky top-8 z-20 mb-4 rounded-xl border border-[color:var(--glass-border)] bg-white/70 px-3 py-2.5 backdrop-blur-sm dark:bg-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar
                            src={focusedCreator.avatarUrl}
                            alt={focusedCreator.displayName}
                            displayName={focusedCreator.displayName}
                            size="sm"
                            className="h-9 w-9 shrink-0 rounded-xl"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-stone-900">{focusedCreator.displayName}</div>
                            <div className="truncate text-[11px] text-stone-500">@{focusedCreator.username}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearCreatorFocus}
                          className="shrink-0 rounded-full border-0 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/10"
                        >
                          Back
                        </button>
                      </div>
                      {focusedCreator.bio ? (
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-stone-600">{focusedCreator.bio}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {viewerId && viewerId !== focusedCreator.id ? (
                          <button
                            type="button"
                            onClick={() => void toggleFollow(focusedCreator.id)}
                            className="rounded-full bg-stone-950 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-stone-800"
                          >
                            {isFollowingFocusedCreator ? "Following" : "Follow"}
                          </button>
                        ) : null}
                        <Link
                          href={`/creator/${focusedCreator.username}`}
                          className="rounded-full border-0 px-2.5 py-1 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10"
                        >
                          Open profile
                        </Link>
                      </div>
                    </div>
                    <div
                      key={`creator-${focusedCreator.id}`}
                      className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3"
                    >
                    {focusedPosts.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-stone-200 bg-stone-50/80 py-6 text-center text-xs text-stone-500">
                        No posts from this creator yet.
                      </div>
                    ) : (
                      focusedPosts.map((post) => (
                        <div key={post.id} onMouseEnter={() => setSelectedPostId(post.id)} className="min-w-0 h-full">
                          <PostCard
                            post={post}
                            highlighted={selectedPostId === post.id}
                            compact
                            strip
                            stripDivider={false}
                            onOpen={openPost}
                          />
                        </div>
                      ))
                    )}
                    </div>
                  </>
                ) : feedTab === "featured" ? (
                  <div key="feed-featured" className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {featuredCreators.slice(0, 6).map((creator) => (
                      <Link
                        key={creator.id}
                        href={`/creator/${creator.username}`}
                        className="h-full rounded-xl border border-[color:var(--glass-border)] bg-white/70 px-3 py-2.5 backdrop-blur-sm transition hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <div className="text-xs font-medium text-stone-900">{creator.displayName}</div>
                        <div className="mt-0.5 text-[11px] text-stone-500">@{creator.username}</div>
                        <div className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-stone-600">{creator.bio}</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div key={`feed-${feedTab}`} className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {feedPosts.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-stone-200 bg-stone-50/80 py-6 text-center text-xs text-stone-500">
                        No posts match these filters yet.
                      </div>
                    ) : (
                      feedPosts.map((post) => (
                        <div key={post.id} onMouseEnter={() => setSelectedPostId(post.id)} className="min-w-0 h-full">
                          <PostCard
                            post={post}
                            highlighted={selectedPostId === post.id}
                            compact
                            strip
                            stripDivider={false}
                            onOpen={openPost}
                            onFocusCreator={focusCreator}
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <PostDetailDialog postId={dialogPostId} onClose={() => setDialogPostId(null)} />
    </div>
  );
}
