"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Search, Users } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useDiscoveryHeaderSearch } from "@/components/discovery-header-search-context";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";
import { matchSearchPlace } from "@/lib/search-places";
import type { GeocodeCandidate, SearchPlace } from "@/lib/types";

export function HeaderGlobalSearch() {
  const { theme } = useTheme();
  const { searchInput, setSearchInput } = useDiscoveryHeaderSearch();
  const { snapshot, search, geocode } = useDemoStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeCandidate[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const searchResults = useMemo(() => search(searchInput), [search, searchInput]);
  const showOverlay = Boolean(searchInput.trim());

  useEffect(() => {
    if (searchParams.get("focus") === "search") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!searchInput.trim() || searchInput.trim().length < 2) {
      setGeocodeResults([]);
      setIsSearchingPlaces(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const results = await geocode(searchInput);
        if (!cancelled) setGeocodeResults(results);
      } catch {
        if (!cancelled) setGeocodeResults([]);
      } finally {
        if (!cancelled) setIsSearchingPlaces(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [geocode, searchInput]);

  const goPlace = (place: SearchPlace) => {
    const params = new URLSearchParams(pathname === "/" ? searchParams.toString() : "");
    params.set("place", place.id);
    params.delete("lat");
    params.delete("lng");
    params.delete("q");
    router.push(`/?${params.toString()}`, { scroll: false });
    setSearchInput(place.label);
  };

  const goGeocode = (candidate: GeocodeCandidate) => {
    const matching = matchSearchPlace(snapshot.searchPlaces, candidate);
    if (matching) {
      goPlace(matching);
      return;
    }
    const params = new URLSearchParams();
    params.set("lat", String(candidate.latitude));
    params.set("lng", String(candidate.longitude));
    params.set("q", candidate.label);
    router.push(`/?${params.toString()}`, { scroll: false });
    setSearchInput(candidate.label);
  };

  const goPost = (postId: string) => {
    router.push(`/post/${postId}`);
    setSearchInput("");
  };

  const goTag = (tag: string) => {
    const params = new URLSearchParams();
    params.set("tag", tag);
    router.push(`/?${params.toString()}`, { scroll: false });
    setSearchInput("");
  };

  return (
    <div className="relative min-w-0 flex-1 max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        ref={inputRef}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search place, #tag, creator, group"
        style={{ colorScheme: theme }}
        className={cn(
          "h-11 w-full rounded-full border bg-[color:var(--header-bg)] py-2 pl-10 pr-4 text-sm shadow-none outline-none backdrop-blur-xl",
          theme === "light"
            ? "border-[color:var(--glass-border)] text-stone-900 placeholder:text-stone-500 focus:border-stone-500 focus:ring-1 focus:ring-stone-300"
            : "border-[color:var(--glass-border)] text-stone-100 placeholder:text-stone-400 focus:border-stone-500 focus:ring-1 focus:ring-stone-600",
        )}
      />
      {showOverlay ? (
        <>
          <button
            type="button"
            aria-label="Close search"
            className="fixed inset-0 top-14 z-40 bg-stone-950/15 dark:bg-black/35"
            onClick={() => setSearchInput("")}
          />
          <div
            className={cn(
              "fixed left-1/2 top-[4.25rem] z-50 max-h-[min(70vh,420px)] w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-xl border p-3 shadow-xl",
              theme === "light"
                ? "border-stone-200 bg-white"
                : "border-stone-700 bg-stone-900 text-stone-100",
            )}
          >
          {isSearchingPlaces ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500 dark:border-stone-600 dark:bg-stone-800">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Looking up places...
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Place lookup
              </div>
              <div className="space-y-1.5">
                {geocodeResults.slice(0, 4).map((candidate, index) => (
                  <button
                    key={`${candidate.label}-${index}`}
                    type="button"
                    onClick={() => goGeocode(candidate)}
                    className="block w-full rounded-lg border border-stone-200 px-2.5 py-2 text-left text-xs transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    <div className="font-medium text-stone-900 dark:text-stone-100">{candidate.label}</div>
                    <div className="mt-0.5 text-[11px] text-stone-500">{candidate.source}</div>
                  </button>
                ))}
                {geocodeResults.length === 0 && !isSearchingPlaces ? (
                  <div className="rounded-lg border border-dashed border-stone-300 px-2.5 py-2 text-xs text-stone-500 dark:border-stone-500">
                    No place match yet.
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Discovery
              </div>
              <div className="space-y-1.5">
                {searchResults.tags.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => goTag(tag)}
                    className="block w-full rounded-lg border border-stone-200 px-2.5 py-2 text-left text-xs transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    <span className="font-medium text-stone-900 dark:text-stone-100">#{tag}</span>
                    <span className="mt-0.5 block text-[11px] text-stone-500">Tag</span>
                  </button>
                ))}
                {searchResults.places.slice(0, 4).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => goPlace(place)}
                    className="block w-full rounded-lg border border-stone-200 px-2.5 py-2 text-left text-xs transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    {place.label}
                  </button>
                ))}
                {searchResults.creators.slice(0, 4).map((creator) => (
                  <Link
                    key={creator.id}
                    href={`/creator/${creator.username}`}
                    onClick={() => setSearchInput("")}
                    className="block rounded-lg border border-stone-200 px-2.5 py-2 text-xs transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    {creator.displayName}
                  </Link>
                ))}
                {searchResults.posts.slice(0, 4).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => goPost(post.id)}
                    className="block w-full rounded-lg border border-stone-200 px-2.5 py-2 text-left text-xs transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    {post.post.title}
                  </button>
                ))}
                {searchResults.groups.slice(0, 4).map((group) => (
                  <Link
                    key={group.slug}
                    href={`/groups/${group.slug}`}
                    onClick={() => setSearchInput("")}
                    className="block rounded-lg border border-stone-200 px-2.5 py-2 text-xs transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium text-stone-900 dark:text-stone-100">
                      <Users className="h-3.5 w-3.5 text-stone-400" />
                      {group.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-stone-500">{group.memberCount} members</span>
                  </Link>
                ))}
                {searchResults.places.length === 0 &&
                searchResults.tags.length === 0 &&
                searchResults.creators.length === 0 &&
                searchResults.posts.length === 0 &&
                searchResults.groups.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-stone-300 px-2.5 py-2 text-xs text-stone-500 dark:border-stone-500">
                    No match yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}
