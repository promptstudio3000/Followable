"use client";

import { memo, type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, {
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import type { Map as MlMap } from "maplibre-gl";
import { useTheme } from "@/components/providers/theme-provider";
import { getMapStyleUrls, getMapStyleUrlsForLayer } from "@/lib/map-style";
import type { CountryBounds } from "@/lib/country-bounds";
import type { ExternalMapPoi, ExternalMapPoiDetail, HydratedPost } from "@/lib/types";
import { debugAgentLog } from "@/lib/debug-agent-log";
import { cn, describeVisibility, formatMoney } from "@/lib/utils";

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "posts",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#292524",
    "circle-radius": ["step", ["get", "point_count"], 22, 10, 28, 25, 36, 50, 42],
    "circle-opacity": 0.92,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fafaf9",
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: "posts",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
  },
  paint: {
    "text-color": "#f5f5f4",
  },
};

const unclusteredCircleLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  source: "posts",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "match",
      ["get", "visibilityType"],
      "public",
      "#14532d",
      "subscriber_only",
      "#92400e",
      "#7f1d1d",
    ],
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#f5f5f4",
  },
};

const unclusteredPinLayer: LayerProps = {
  id: "unclustered-point",
  type: "symbol",
  source: "posts",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": [
      "match",
      ["get", "visibilityType"],
      "public",
      "pin_public",
      "subscriber_only",
      "pin_subscriber",
      "pin_special",
    ],
    "icon-size": 0.78,
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "icon-padding": 2,
  },
};

const wikiPoiLayer: LayerProps = {
  id: "wiki-poi-point",
  type: "circle",
  source: "wiki-pois",
  paint: {
    "circle-color": "#2563eb",
    "circle-radius": 7,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#eff6ff",
    "circle-opacity": 0.92,
  },
};

const numberedCircleLayer: LayerProps = {
  id: "numbered-point",
  type: "circle",
  source: "posts",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#171717",
    "circle-radius": 13,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fafaf9",
  },
};

const numberedLabelLayer: LayerProps = {
  id: "numbered-label",
  type: "symbol",
  source: "posts",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "text-field": ["get", "pinLabel"],
    "text-size": 11,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
  },
  paint: {
    "text-color": "#fafaf9",
  },
};

function pinDataUrl(fill: string, stroke: string): string {
  const w = 52;
  const h = 60;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const cx = w / 2;
  const r = 15;
  const cy = 17;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineTo(cx, h - 5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - 1, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
  return canvas.toDataURL();
}

function loadDataUrlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("pin image load failed"));
    img.src = dataUrl;
  });
}

async function addPinImagesToMap(map: MlMap) {
  const specs = [
    { id: "pin_public", fill: "#22c55e", stroke: "#14532d" },
    { id: "pin_subscriber", fill: "#fb923c", stroke: "#9a3412" },
    { id: "pin_special", fill: "#f87171", stroke: "#7f1d1d" },
  ] as const;
  for (const { id, fill, stroke } of specs) {
    const url = pinDataUrl(fill, stroke);
    if (!url) continue;
    const img = await loadDataUrlImage(url);
    if (map.hasImage(id)) {
      map.removeImage(id);
    }
    map.addImage(id, img, { pixelRatio: 2 });
  }
}

type MapClickEvent = Parameters<NonNullable<ComponentProps<typeof Map>["onClick"]>>[0];

const INTERACTIVE_LAYER_IDS = [
  "clusters",
  "unclustered-point",
  "numbered-point",
  "numbered-label",
  "selected-point",
  "wiki-poi-point",
] as const;

export type MapViewportBounds = { west: number; south: number; east: number; north: number };

type MapViewProps = {
  posts: HydratedPost[];
  externalPois?: ExternalMapPoi[];
  center?: { latitude: number; longitude: number } | null;
  /** When set, map fits this box (whole country); overrides center flyTo until cleared. */
  fitBounds?: CountryBounds | null;
  fitBoundsRevision?: string | null;
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  onOpenPost?: (postId: string) => void;
  showPostOverlay?: boolean;
  selectable?: boolean;
  selectedPoint?: { latitude: number; longitude: number } | null;
  onSelectPoint?: (point: { latitude: number; longitude: number }) => void;
  className?: string;
  fullBleed?: boolean;
  mapLayerId?: string;
  /** Map zoom + geolocate; attribution tucked bottom-left when set */
  controlPosition?: "top-right" | "bottom-left";
  showGeolocateWhenSelectable?: boolean;
  /** Debug: identify mount source for logging */
  debugSource?: string;
  onBoundsChange?: (bounds: MapViewportBounds) => void;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterPosts?: boolean;
  markerMode?: "default" | "numbered";
  orderedPostIds?: string[];
};

export const MapView = memo(function MapView({
  posts,
  externalPois = [],
  center,
  selectedPostId,
  onSelectPost,
  onOpenPost,
  showPostOverlay = true,
  selectable = false,
  selectedPoint,
  onSelectPoint,
  className,
  fullBleed = false,
  mapLayerId,
  controlPosition = "top-right",
  showGeolocateWhenSelectable = false,
  debugSource,
  onBoundsChange,
  fitBounds,
  /** Bumps fit when country changes (e.g. countryCode) so bounds always re-apply after remount/layout. */
  fitBoundsRevision,
  clusterMaxZoom = 4,
  clusterRadius = 30,
  clusterPosts = true,
  markerMode = "default",
  orderedPostIds = [],
}: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalPopupPostId, setInternalPopupPostId] = useState<string | null>(selectedPostId ?? null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [poiDetailById, setPoiDetailById] = useState<Record<string, ExternalMapPoiDetail>>({});
  const [poiDetailErrorById, setPoiDetailErrorById] = useState<Record<string, string>>({});
  const [pinImagesLoaded, setPinImagesLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const popupPostId = selectedPostId ?? internalPopupPostId;
  const { theme } = useTheme();
  const { light: lightStyle, dark: darkStyle } = useMemo(
    () => (mapLayerId ? getMapStyleUrlsForLayer(mapLayerId) : getMapStyleUrls()),
    [mapLayerId],
  );
  const mapStyle = theme === "dark" ? darkStyle : lightStyle;
  const fitWest = fitBounds?.west;
  const fitSouth = fitBounds?.south;
  const fitEast = fitBounds?.east;
  const fitNorth = fitBounds?.north;
  const centerLatitude = center?.latitude;
  const centerLongitude = center?.longitude;

  // #region agent log
  useEffect(() => {
    if (!debugSource) return;
    const el = containerRef.current;
    const w = el ? el.getBoundingClientRect().width : 0;
    const h = el ? el.getBoundingClientRect().height : 0;
    debugAgentLog({
      location: "map-view.tsx:mount",
      message: "MapView mount",
      data: { debugSource, postsCount: posts.length, center: center ?? null, containerW: w, containerH: h },
      hypothesisId: "A",
    });
  }, [debugSource, posts.length, center]);
  // #endregion

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry?.contentRect?.width ?? 0;
      const h = entry?.contentRect?.height ?? 0;
      // #region agent log
      if (debugSource) {
        debugAgentLog({
          location: "map-view.tsx:ResizeObserver",
          message: "MapView resize observed",
          data: { debugSource, contentRectW: w, contentRectH: h },
          hypothesisId: "A",
        });
      }
      // #endregion
      mapRef.current?.getMap()?.resize();
    });
    ro.observe(el);
    const t1 = window.setTimeout(() => mapRef.current?.getMap()?.resize(), 50);
    const t2 = window.setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [debugSource]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const resetFrame = window.requestAnimationFrame(() => setPinImagesLoaded(false));
    const run = () => {
      void addPinImagesToMap(map)
        .then(() => setPinImagesLoaded(true))
        .catch(() => setPinImagesLoaded(false));
    };
    map.on("style.load", run);
    window.requestAnimationFrame(() => {
      if (map.isStyleLoaded()) run();
    });
    return () => {
      window.cancelAnimationFrame(resetFrame);
      map.off("style.load", run);
    };
  }, [mapReady, mapStyle]);

  const featureCollection = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: posts.map((post) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [post.displayLongitude, post.displayLatitude],
        },
        properties: {
          postId: post.id,
          title: post.post.title,
          visibilityType: post.post.visibilityType,
          pinLabel:
            markerMode === "numbered"
              ? (() => {
                  const index = orderedPostIds.findIndex((id) => id === post.id);
                  return index >= 0 ? String(index + 1) : "";
                })()
              : "",
        },
      })),
    }),
    [markerMode, orderedPostIds, posts],
  );

  const externalPoiFeatureCollection = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: externalPois.map((poi) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [poi.longitude, poi.latitude],
        },
        properties: {
          poiId: poi.id,
          title: poi.title,
        },
      })),
    }),
    [externalPois],
  );

  const selectedPost = posts.find((post) => post.id === popupPostId) ?? null;
  const activeSelectedPoiId =
    selectedPoiId && externalPois.some((poi) => poi.id === selectedPoiId) ? selectedPoiId : null;
  const selectedPoi = externalPois.find((poi) => poi.id === activeSelectedPoiId) ?? null;
  const selectedPoiDetail = selectedPoi ? poiDetailById[selectedPoi.id] ?? null : null;
  const poiDetailError = selectedPoi ? poiDetailErrorById[selectedPoi.id] ?? null : null;
  const poiDetailLoading = Boolean(selectedPoi && !selectedPoiDetail && !poiDetailError);

  const selectedPointLayer = useMemo<LayerProps>(
    () => ({
      id: "selected-point",
      type: "circle",
      source: "posts",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "postId"], popupPostId ?? ""]],
      paint: {
        "circle-color": "#f59e0b",
        "circle-radius": 11,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#f8fafc",
      },
    }),
    [popupPostId],
  );

  const handleMapClick = (event: MapClickEvent) => {
    if (!selectable || !onSelectPoint) return;
    onSelectPoint({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
  };

  const handleLayerClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id;
      const map = mapRef.current?.getMap();
      const source = map?.getSource("posts") as
        | {
            getClusterExpansionZoom: (clusterId: number, callback: (error: Error | null, zoom: number) => void) => void;
          }
        | undefined;

      source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || !map) return;
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
          duration: 500,
        });
      });
      return;
    }

    const nextPostId = String(feature.properties?.postId ?? "");
    setSelectedPoiId(null);
    setInternalPopupPostId(nextPostId);
    onSelectPost?.(nextPostId);
  };

  useEffect(() => {
    if (!selectedPoi || poiDetailById[selectedPoi.id] || poiDetailErrorById[selectedPoi.id]) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/wikipedia-pois/${selectedPoi.pageId}`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("wikipedia_poi_detail_load_failed");
        }
        const payload = (await response.json()) as { item?: ExternalMapPoiDetail };
        if (!payload.item) {
          throw new Error("wikipedia_poi_detail_missing");
        }
        if (cancelled) return;
        setPoiDetailById((current) => ({
          ...current,
          [selectedPoi.id]: payload.item!,
        }));
      })
      .catch((detailError) => {
        if (cancelled) return;
        setPoiDetailErrorById((current) => ({
          ...current,
          [selectedPoi.id]:
            detailError instanceof Error ? detailError.message : "wikipedia_poi_detail_load_failed",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [poiDetailById, poiDetailErrorById, selectedPoi]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapReady) return;

    if (fitWest != null && fitSouth != null && fitEast != null && fitNorth != null) {
      let cancelled = false;
      const pad = 44;
      const opts = {
        padding: { top: pad, bottom: pad, left: pad, right: pad },
        duration: 700,
        maxZoom: 10.8,
      } as const;
      const corners: [[number, number], [number, number]] = [
        [fitWest, fitSouth],
        [fitEast, fitNorth],
      ];
      const apply = () => {
        if (cancelled) return;
        try {
          map.resize();
          map.fitBounds(corners, opts);
        } catch {
          /* ignore */
        }
      };
      apply();
      const t1 = window.setTimeout(apply, 150);
      const t2 = window.setTimeout(apply, 400);
      const t3 = window.setTimeout(apply, 800);
      map.once("idle", apply);
      return () => {
        cancelled = true;
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }

    if (centerLatitude != null && centerLongitude != null) {
      map.flyTo({
        center: [centerLongitude, centerLatitude],
        zoom: 9.5,
        duration: 600,
      });
    }
  }, [
    mapReady,
    fitWest,
    fitSouth,
    fitEast,
    fitNorth,
    fitBoundsRevision,
    centerLatitude,
    centerLongitude,
  ]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const handleResize = () => map.resize();
    const frame = window.requestAnimationFrame(handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [className, posts.length]);

  useEffect(() => {
    if (!mapReady || !onBoundsChange) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const emit = () => {
      const b = map.getBounds();
      onBoundsChange({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    emit();
    map.on("moveend", emit);
    return () => {
      map.off("moveend", emit);
    };
  }, [mapReady, onBoundsChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "map-view-maplibre-host relative min-h-[280px] overflow-hidden bg-stone-950",
        !selectable && "[&_.maplibregl-canvas-container]:cursor-grab [&_.maplibregl-canvas-container:active]:cursor-grabbing",
        controlPosition === "bottom-left" && "map-controls-bl",
        fullBleed ? "rounded-none border-0 shadow-none" : "rounded-2xl border border-stone-200 shadow-[0_20px_70px_rgba(21,21,21,0.16)]",
        className,
      )}
    >
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: center?.latitude ?? 49.7475,
          longitude: center?.longitude ?? 13.3776,
          zoom: center ? 9.2 : 8.6,
        }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={{
          compact: false,
          customAttribution:
            "Map data © OpenStreetMap contributors · Basemap styles © CARTO · Map rendering © MapLibre GL",
        }}
        interactiveLayerIds={[...INTERACTIVE_LAYER_IDS]}
        onLoad={() => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          const el = containerRef.current;
          const w = el ? el.getBoundingClientRect().width : 0;
          const h = el ? el.getBoundingClientRect().height : 0;
          // #region agent log
          if (debugSource) {
            debugAgentLog({
              location: "map-view.tsx:onLoad",
              message: "MapView onLoad",
              data: { debugSource, containerW: w, containerH: h },
              hypothesisId: "D",
            });
          }
          // #endregion
          window.requestAnimationFrame(() => map.resize());
          setMapReady(true);
        }}
        onClick={(event) => {
          const queriedFeatures = mapRef.current?.queryRenderedFeatures(event.point, {
            layers: [...INTERACTIVE_LAYER_IDS],
          }) ?? [];
          const features = event.features?.length ? event.features : queriedFeatures;

          if (features?.length) {
            const poiFeature = features.find((feature) => feature.layer.id === "wiki-poi-point");
            if (poiFeature?.properties?.poiId) {
              setSelectedPoiId(String(poiFeature.properties.poiId));
              setInternalPopupPostId(null);
              onSelectPost?.(null);
              return;
            }

            handleLayerClick({ ...event, features } as MapLayerMouseEvent);
            return;
          }

          if (selectable) {
            handleMapClick(event);
          } else {
            setInternalPopupPostId(null);
            setSelectedPoiId(null);
            onSelectPost?.(null);
          }
        }}
        onMouseMove={undefined}
        dragRotate={false}
      >
        <NavigationControl position={controlPosition} />
        {!selectable || showGeolocateWhenSelectable ? (
          <GeolocateControl
            position={controlPosition}
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation={false}
            showUserLocation
          />
        ) : null}
        <Source
          id="posts"
          type="geojson"
          data={featureCollection}
          cluster={clusterPosts}
          clusterMaxZoom={clusterMaxZoom}
          clusterRadius={clusterRadius}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          {markerMode === "numbered" ? (
            [
              <Layer key="numbered-circle" {...numberedCircleLayer} />,
              <Layer key="numbered-label" {...numberedLabelLayer} />,
            ]
          ) : (
            <Layer {...(pinImagesLoaded ? unclusteredPinLayer : unclusteredCircleLayer)} />
          )}
          {popupPostId ? <Layer {...selectedPointLayer} /> : null}
        </Source>
        {externalPois.length > 0 ? (
          <Source id="wiki-pois" type="geojson" data={externalPoiFeatureCollection}>
            <Layer {...wikiPoiLayer} />
          </Source>
        ) : null}
        {selectedPoint ? (
          <Popup
            longitude={selectedPoint.longitude}
            latitude={selectedPoint.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={8}
          >
            <div className="text-xs font-medium text-stone-900">Selected point</div>
          </Popup>
        ) : null}
        {selectedPoi ? (
          <Popup
            longitude={selectedPoi.longitude}
            latitude={selectedPoi.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={10}
          >
            <div className="max-w-[300px] text-stone-900">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                Wikipedia POI
              </div>
              <div className="mt-1 text-sm font-semibold">
                {selectedPoiDetail?.title ?? selectedPoi.title}
              </div>
              {(selectedPoiDetail?.description ?? selectedPoi.description) ? (
                <div className="mt-1 text-xs text-stone-600">
                  {selectedPoiDetail?.description ?? selectedPoi.description}
                </div>
              ) : null}
              {(selectedPoiDetail?.imageUrl ?? selectedPoiDetail?.thumbnailUrl ?? selectedPoi.thumbnailUrl) ? (
                <div className="mt-2 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPoiDetail?.imageUrl ?? selectedPoiDetail?.thumbnailUrl ?? selectedPoi.thumbnailUrl ?? ""}
                    alt=""
                    className="h-28 w-full object-cover"
                  />
                </div>
              ) : null}
              {poiDetailLoading ? (
                <p className="mt-2 text-xs leading-5 text-stone-500">Loading article details...</p>
              ) : null}
              {poiDetailError ? (
                <p className="mt-2 text-xs leading-5 text-rose-600">Wikipedia detail load failed.</p>
              ) : null}
              {(selectedPoiDetail?.extract ?? selectedPoi.summary) ? (
                <p className="mt-2 line-clamp-6 text-xs leading-5 text-stone-700">
                  {selectedPoiDetail?.extract ?? selectedPoi.summary}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={selectedPoiDetail?.articleUrl ?? selectedPoi.articleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open article
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPoiId(null)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700"
                >
                  Close
                </button>
              </div>
            </div>
          </Popup>
        ) : null}
      </Map>

      {showPostOverlay && selectedPost ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20">
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-stone-950/92 p-4 text-white shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-stone-300">
                  {describeVisibility(selectedPost.post.visibilityType)}
                </div>
                <div className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
                  {selectedPost.post.title}
                </div>
                <div className="mt-1 text-sm text-stone-300">{selectedPost.locationSummary}</div>
              </div>
              {selectedPost.post.specialPrice ? (
                <div className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-950">
                  {formatMoney(selectedPost.post.specialPrice, selectedPost.post.currency || "CZK")}
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              {onOpenPost ? (
                <button
                  type="button"
                  onClick={() => onOpenPost(selectedPost.id)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950"
                >
                  Open post
                </button>
              ) : (
                <Link href={`/post/${selectedPost.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950">
                  Open post
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setInternalPopupPostId(null);
                  onSelectPost?.(null);
                }}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

MapView.displayName = "MapView";
