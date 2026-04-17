"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapViewportBounds } from "@/components/map-view";
import type { ExternalMapPoi, SearchPlace } from "@/lib/types";

type UseWikipediaPoisArgs = {
  bounds: MapViewportBounds | null;
  place: SearchPlace | null;
};

const MAX_ACCUMULATED_POIS = 240;
const MAX_SEARCHED_AREAS = 36;

export function useWikipediaPois({ bounds, place }: UseWikipediaPoisArgs) {
  const [items, setItems] = useState<ExternalMapPoi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedAreaKeys, setSearchedAreaKeys] = useState<string[]>([]);

  const requestKey = useMemo(() => {
    if (!bounds || !place) return null;
    return [
      place.id,
      bounds.west.toFixed(2),
      bounds.south.toFixed(2),
      bounds.east.toFixed(2),
      bounds.north.toFixed(2),
    ].join(":");
  }, [bounds, place]);

  useEffect(() => {
    setItems([]);
    setError(null);
    setSearchedAreaKeys([]);
  }, [place?.id]);

  const load = useCallback(async () => {
    if (!bounds || !place || !requestKey) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        placeId: place.id,
        placeLabel: place.label,
        west: String(bounds.west),
        south: String(bounds.south),
        east: String(bounds.east),
        north: String(bounds.north),
      });
      const response = await fetch(`/api/wikipedia-pois?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("wikipedia_poi_load_failed");
      }

      const payload = (await response.json()) as { items?: ExternalMapPoi[] };
      setItems((currentItems) => {
        const merged = new Map(currentItems.map((item) => [item.id, item]));
        for (const item of payload.items ?? []) {
          merged.set(item.id, item);
        }
        return [...merged.values()].slice(-MAX_ACCUMULATED_POIS);
      });
      setSearchedAreaKeys((currentKeys) => {
        const nextKeys = currentKeys.filter((key) => key !== requestKey);
        nextKeys.push(requestKey);
        return nextKeys.slice(-MAX_SEARCHED_AREAS);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "wikipedia_poi_load_failed");
    } finally {
      setLoading(false);
    }
  }, [bounds, place, requestKey]);

  const clear = useCallback(() => {
    setItems([]);
    setError(null);
    setSearchedAreaKeys([]);
  }, []);

  const hasLoadedCurrentView = requestKey != null && searchedAreaKeys.includes(requestKey);

  return {
    items,
    loading,
    error,
    load,
    clear,
    hasLoadedCurrentView,
    hasAnyItems: items.length > 0,
    searchedAreaCount: searchedAreaKeys.length,
    currentRequestKey: requestKey,
  };
}
