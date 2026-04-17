import type { ExternalMapPoi, ExternalMapPoiDetail } from "@/lib/types";

export type WikipediaPoiBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type WikipediaApiPage = {
  pageid: number;
  title: string;
  description?: string;
  extract?: string;
  fullurl?: string;
  canonicalurl?: string;
  thumbnail?: {
    source?: string;
  };
  original?: {
    source?: string;
  };
  coordinates?: Array<{
    lat?: number;
    lon?: number;
  }>;
};

type WikipediaApiPayload = {
  query?: {
    pages?: WikipediaApiPage[];
  };
};

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const POSITIVE_TERMS = [
  "museum",
  "gallery",
  "castle",
  "palace",
  "church",
  "cathedral",
  "basilica",
  "theatre",
  "theater",
  "bridge",
  "park",
  "garden",
  "square",
  "tower",
  "fortress",
  "monument",
  "memorial",
  "synagogue",
  "abbey",
  "zoo",
  "reservoir",
  "lake",
  "river",
  "waterfall",
  "metro station",
  "railway station",
  "viewpoint",
  "lookout",
  "historic",
];
const NEGATIVE_TERMS = [
  "uprising",
  "battle",
  "war",
  "timeline",
  "empire",
  "organization",
  "association",
  "company",
  "school",
  "university",
  "broadcaster",
  "district",
  "municipality",
  "capital and largest city",
  "city in",
  "town in",
  "village in",
  "election",
];

const globalForWikipediaPoiCache = globalThis as unknown as {
  wikipediaPoiCache?: Map<string, { expiresAt: number; items: ExternalMapPoi[] }>;
  wikipediaPoiDetailCache?: Map<number, { expiresAt: number; item: ExternalMapPoiDetail }>;
};

function getWikipediaPoiCache() {
  if (!globalForWikipediaPoiCache.wikipediaPoiCache) {
    globalForWikipediaPoiCache.wikipediaPoiCache = new Map();
  }
  return globalForWikipediaPoiCache.wikipediaPoiCache;
}

function getWikipediaPoiDetailCache() {
  if (!globalForWikipediaPoiCache.wikipediaPoiDetailCache) {
    globalForWikipediaPoiCache.wikipediaPoiDetailCache = new Map();
  }
  return globalForWikipediaPoiCache.wikipediaPoiDetailCache;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function kmPerLongitudeDegree(latitude: number) {
  return 111.32 * Math.cos((latitude * Math.PI) / 180);
}

function boundsMetrics(bounds: WikipediaPoiBounds) {
  const midLat = (bounds.south + bounds.north) / 2;
  const widthDegrees =
    bounds.west <= bounds.east ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
  const heightDegrees = bounds.north - bounds.south;
  const widthKm = Math.max(widthDegrees * kmPerLongitudeDegree(midLat), 0.5);
  const heightKm = Math.max(heightDegrees * 111.32, 0.5);
  return { widthKm, heightKm, midLat };
}

function sampleViewportPoints(bounds: WikipediaPoiBounds) {
  const { widthKm, heightKm } = boundsMetrics(bounds);
  const columns = Math.min(4, Math.max(1, Math.ceil(widthKm / 12)));
  const rows = Math.min(4, Math.max(1, Math.ceil(heightKm / 12)));
  const points: Array<{ latitude: number; longitude: number }> = [];

  for (let row = 0; row < rows; row += 1) {
    const rowFactor = rows === 1 ? 0.5 : row / (rows - 1);
    const latitude = bounds.south + (bounds.north - bounds.south) * rowFactor;

    for (let column = 0; column < columns; column += 1) {
      const columnFactor = columns === 1 ? 0.5 : column / (columns - 1);
      const longitude = bounds.west <= bounds.east
        ? bounds.west + (bounds.east - bounds.west) * columnFactor
        : ((((bounds.west + ((360 - bounds.west + bounds.east) * columnFactor)) + 540) % 360) - 180);
      points.push({
        latitude: Number(latitude.toFixed(5)),
        longitude: Number(longitude.toFixed(5)),
      });
    }
  }

  return points;
}

function viewportRadiusMeters(bounds: WikipediaPoiBounds) {
  const { widthKm, heightKm } = boundsMetrics(bounds);
  return Math.max(1_500, Math.min(10_000, Math.round((Math.max(widthKm, heightKm) * 1000) / 3)));
}

function scoreWikipediaPage(page: WikipediaApiPage, placeLabel: string | null) {
  const title = normalizeText(page.title);
  const description = normalizeText(page.description);
  const extract = normalizeText(page.extract);
  const combined = `${title} ${description} ${extract}`.trim();
  const normalizedPlaceLabel = normalizeText(placeLabel);

  let score = 0;

  if (page.thumbnail?.source) score += 24;
  if (page.extract && page.extract.length > 90) score += 8;
  if (page.description) score += 6;

  for (const term of POSITIVE_TERMS) {
    if (combined.includes(term)) score += 16;
  }

  for (const term of NEGATIVE_TERMS) {
    if (combined.includes(term)) score -= 22;
  }

  if (normalizedPlaceLabel && title === normalizedPlaceLabel) score -= 40;
  if (description.includes("capital and largest city")) score -= 30;

  return score;
}

function shouldKeepWikipediaPage(page: WikipediaApiPage, placeLabel: string | null) {
  const score = scoreWikipediaPage(page, placeLabel);
  const hasCoords = Boolean(page.coordinates?.[0]?.lat != null && page.coordinates?.[0]?.lon != null);
  const hasLink = Boolean(page.fullurl || page.canonicalurl);
  return hasCoords && hasLink && score >= 10;
}

function toExternalPoi(page: WikipediaApiPage): ExternalMapPoi | null {
  const coords = page.coordinates?.[0];
  if (coords?.lat == null || coords?.lon == null) return null;
  const articleUrl = page.fullurl ?? page.canonicalurl;
  if (!articleUrl) return null;

  return {
    id: `wikipedia:${page.pageid}`,
    source: "wikipedia",
    pageId: page.pageid,
    title: page.title,
    description: page.description ?? null,
    summary: page.extract ?? null,
    thumbnailUrl: page.thumbnail?.source ?? null,
    articleUrl,
    latitude: coords.lat,
    longitude: coords.lon,
  };
}

function toExternalPoiDetail(page: WikipediaApiPage): ExternalMapPoiDetail {
  const articleUrl = page.fullurl ?? page.canonicalurl ?? `https://en.wikipedia.org/?curid=${page.pageid}`;

  return {
    id: `wikipedia:${page.pageid}`,
    source: "wikipedia",
    pageId: page.pageid,
    title: page.title,
    description: page.description ?? null,
    summary: page.extract ? page.extract.slice(0, 240) : null,
    extract: page.extract ?? null,
    thumbnailUrl: page.thumbnail?.source ?? null,
    imageUrl: page.original?.source ?? page.thumbnail?.source ?? null,
    articleUrl,
    latitude: page.coordinates?.[0]?.lat ?? null,
    longitude: page.coordinates?.[0]?.lon ?? null,
  };
}

async function fetchWikipediaPagesForPoint(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}) {
  const endpoint = new URL(WIKIPEDIA_API);
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("formatversion", "2");
  endpoint.searchParams.set("generator", "geosearch");
  endpoint.searchParams.set("ggscoord", `${input.latitude}|${input.longitude}`);
  endpoint.searchParams.set("ggsradius", String(input.radiusMeters));
  endpoint.searchParams.set("ggslimit", "24");
  endpoint.searchParams.set("ggsnamespace", "0");
  endpoint.searchParams.set("prop", "coordinates|pageimages|description|info|extracts");
  endpoint.searchParams.set("inprop", "url");
  endpoint.searchParams.set("piprop", "thumbnail");
  endpoint.searchParams.set("pithumbsize", "480");
  endpoint.searchParams.set("pilimit", "24");
  endpoint.searchParams.set("exintro", "1");
  endpoint.searchParams.set("explaintext", "1");
  endpoint.searchParams.set("exchars", "220");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Followable-Hidden-Location-MVP/0.1 (Wikipedia POI loader)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`wikipedia_geosearch_failed_${response.status}`);
  }

  const payload = (await response.json()) as WikipediaApiPayload;
  return payload.query?.pages ?? [];
}

async function fetchWikipediaPageDetail(pageId: number) {
  const endpoint = new URL(WIKIPEDIA_API);
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("formatversion", "2");
  endpoint.searchParams.set("pageids", String(pageId));
  endpoint.searchParams.set("prop", "coordinates|pageimages|description|info|extracts");
  endpoint.searchParams.set("inprop", "url");
  endpoint.searchParams.set("piprop", "thumbnail|original");
  endpoint.searchParams.set("pithumbsize", "960");
  endpoint.searchParams.set("exintro", "1");
  endpoint.searchParams.set("explaintext", "1");
  endpoint.searchParams.set("exchars", "1400");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Followable-Hidden-Location-MVP/0.1 (Wikipedia POI loader)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`wikipedia_page_detail_failed_${response.status}`);
  }

  const payload = (await response.json()) as WikipediaApiPayload;
  return payload.query?.pages?.[0] ?? null;
}

function cacheKeyForBounds(placeId: string, bounds: WikipediaPoiBounds) {
  return [
    placeId,
    bounds.west.toFixed(2),
    bounds.south.toFixed(2),
    bounds.east.toFixed(2),
    bounds.north.toFixed(2),
  ].join(":");
}

export async function loadWikipediaPoisForBounds(input: {
  placeId: string;
  placeLabel?: string | null;
  bounds: WikipediaPoiBounds;
}) {
  const cacheKey = cacheKeyForBounds(input.placeId, input.bounds);
  const cache = getWikipediaPoiCache();
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  const radiusMeters = viewportRadiusMeters(input.bounds);
  const points = sampleViewportPoints(input.bounds);
  const pagesById = new Map<number, WikipediaApiPage>();

  const batches = await Promise.all(
    points.map((point) =>
      fetchWikipediaPagesForPoint({
        latitude: point.latitude,
        longitude: point.longitude,
        radiusMeters,
      }).catch(() => []),
    ),
  );

  for (const batch of batches) {
    for (const page of batch) {
      if (!shouldKeepWikipediaPage(page, input.placeLabel ?? null)) continue;
      const existing = pagesById.get(page.pageid);
      if (!existing || scoreWikipediaPage(page, input.placeLabel ?? null) > scoreWikipediaPage(existing, input.placeLabel ?? null)) {
        pagesById.set(page.pageid, page);
      }
    }
  }

  const items = [...pagesById.values()]
    .sort((left, right) => scoreWikipediaPage(right, input.placeLabel ?? null) - scoreWikipediaPage(left, input.placeLabel ?? null))
    .map(toExternalPoi)
    .filter((item): item is ExternalMapPoi => item !== null)
    .slice(0, 60);

  cache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    items,
  });

  return items;
}

export async function loadWikipediaPoiDetail(pageId: number) {
  const cache = getWikipediaPoiDetailCache();
  const now = Date.now();
  const cached = cache.get(pageId);
  if (cached && cached.expiresAt > now) {
    return cached.item;
  }

  const page = await fetchWikipediaPageDetail(pageId);
  if (!page) {
    throw new Error("wikipedia_page_not_found");
  }

  const item = toExternalPoiDetail(page);
  cache.set(pageId, {
    expiresAt: now + CACHE_TTL_MS,
    item,
  });
  return item;
}

export const wikipediaPoiInternals = {
  boundsMetrics,
  sampleViewportPoints,
  viewportRadiusMeters,
  scoreWikipediaPage,
  shouldKeepWikipediaPage,
};
