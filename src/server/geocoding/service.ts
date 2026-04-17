import { seedData } from "@/lib/demo-data";
import type { GeocodeCandidate, GeocodingMode, SearchPlace } from "@/lib/types";
import { getGlobalSeedSearchPlaces } from "@/server/data/admin-divisions";

const DEFAULT_NOMINATIM = "https://nominatim.openstreetmap.org";

function searchPlaceToCandidate(place: SearchPlace, source: GeocodingMode): GeocodeCandidate {
  return {
    label: place.label,
    latitude: place.latitude,
    longitude: place.longitude,
    placeName: place.label,
    city: place.city ?? null,
    district: place.district ?? null,
    region: place.region ?? null,
    country: place.country ?? null,
    source,
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function nearestSeedCandidate(latitude: number, longitude: number) {
  const allSeeded = [
    ...getGlobalSeedSearchPlaces().map((place) => searchPlaceToCandidate(place, "seeded")),
    ...seedData.searchPlaces.map((place) => searchPlaceToCandidate(place, "seeded")),
    ...seedData.locations.slice(0, 80).map((location) => ({
      label: [location.placeName, location.city, location.region, location.country]
        .filter(Boolean)
        .join(", "),
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address ?? null,
      placeName: location.placeName ?? null,
      city: location.city ?? null,
      district: location.district ?? null,
      region: location.region ?? null,
      country: location.country ?? null,
      source: "seeded" as const,
    })),
  ];

  allSeeded.sort((left, right) => {
    const leftScore = Math.abs(left.latitude - latitude) + Math.abs(left.longitude - longitude);
    const rightScore = Math.abs(right.latitude - latitude) + Math.abs(right.longitude - longitude);
    return leftScore - rightScore;
  });

  return allSeeded[0] ?? null;
}

function seedSearch(query: string) {
  const needle = normalizeText(query);
  const seededPlaces = [...getGlobalSeedSearchPlaces(), ...seedData.searchPlaces]
    .filter((place) =>
      `${place.label} ${place.city ?? ""} ${place.district ?? ""} ${place.region ?? ""} ${place.country ?? ""}`
        .toLowerCase()
        .includes(needle),
    )
    .map((place) => searchPlaceToCandidate(place, "seeded"));

  const seededLocations = seedData.locations
    .filter((location) =>
      `${location.placeName ?? ""} ${location.address ?? ""} ${location.city ?? ""} ${location.region ?? ""}`
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, 6)
    .map((location) => ({
      label: [location.placeName, location.city, location.region, location.country]
        .filter(Boolean)
        .join(", "),
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address ?? null,
      placeName: location.placeName ?? null,
      city: location.city ?? null,
      district: location.district ?? null,
      region: location.region ?? null,
      country: location.country ?? null,
      source: "seeded" as const,
    }));

  return [...seededPlaces, ...seededLocations].slice(0, 8);
}

async function forwardMapbox(query: string): Promise<GeocodeCandidate[]> {
  const endpoint = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  endpoint.searchParams.set("access_token", process.env.MAPBOX_ACCESS_TOKEN!);
  endpoint.searchParams.set("autocomplete", "true");
  endpoint.searchParams.set("country", "cz");
  endpoint.searchParams.set("types", "place,locality,address,poi,region,district,country");
  endpoint.searchParams.set("limit", "8");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mapbox forward geocoding failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      center?: [number, number];
      context?: Array<{ id: string; text: string }>;
    }>;
  };

  return (payload.features ?? []).flatMap((feature) => {
    if (!feature.center) return [];

    const context = new Map(
      (feature.context ?? []).map((entry) => {
        const [kind] = entry.id.split(".");
        return [kind, entry.text];
      }),
    );

    return [
      {
        label: feature.place_name ?? feature.text ?? query,
        latitude: feature.center[1],
        longitude: feature.center[0],
        placeName: feature.text ?? null,
        city: context.get("place") ?? context.get("locality") ?? null,
        district: context.get("district") ?? null,
        region: context.get("region") ?? null,
        country: context.get("country") ?? null,
        source: "mapbox" as const,
      },
    ];
  });
}

async function reverseMapbox(latitude: number, longitude: number): Promise<GeocodeCandidate | null> {
  const endpoint = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`);
  endpoint.searchParams.set("access_token", process.env.MAPBOX_ACCESS_TOKEN!);
  endpoint.searchParams.set("types", "address,poi,place,locality,region,district,country");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mapbox reverse geocoding failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      center?: [number, number];
      context?: Array<{ id: string; text: string }>;
    }>;
  };

  const feature = payload.features?.[0];
  if (!feature?.center) return null;

  const context = new Map(
    (feature.context ?? []).map((entry) => {
      const [kind] = entry.id.split(".");
      return [kind, entry.text];
    }),
  );

  return {
    label: feature.place_name ?? feature.text ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude: feature.center[1],
    longitude: feature.center[0],
    placeName: feature.text ?? null,
    city: context.get("place") ?? context.get("locality") ?? null,
    district: context.get("district") ?? null,
    region: context.get("region") ?? null,
    country: context.get("country") ?? null,
    source: "mapbox",
  };
}

async function forwardNominatim(query: string): Promise<GeocodeCandidate[]> {
  const endpoint = new URL(`${process.env.NOMINATIM_BASE_URL || DEFAULT_NOMINATIM}/search`);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("limit", "8");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Followable-Hidden-Location-MVP/0.1",
      Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Nominatim forward geocoding failed with ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      county?: string;
      state?: string;
      country?: string;
      road?: string;
      house_number?: string;
      attraction?: string;
      amenity?: string;
      suburb?: string;
    };
    name?: string;
  }>;

  return payload.map((item) => ({
    label: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    address: [item.address?.road, item.address?.house_number].filter(Boolean).join(" ") || null,
    placeName: item.name ?? item.address?.attraction ?? item.address?.amenity ?? item.address?.suburb ?? null,
    city: item.address?.city ?? item.address?.town ?? item.address?.village ?? null,
    district: item.address?.county ?? null,
    region: item.address?.state ?? null,
    country: item.address?.country ?? null,
    source: "nominatim" as const,
  }));
}

async function reverseNominatim(latitude: number, longitude: number): Promise<GeocodeCandidate | null> {
  const endpoint = new URL(`${process.env.NOMINATIM_BASE_URL || DEFAULT_NOMINATIM}/reverse`);
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("addressdetails", "1");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Followable-Hidden-Location-MVP/0.1",
      Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Nominatim reverse geocoding failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    display_name?: string;
    lat?: string;
    lon?: string;
    name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      county?: string;
      state?: string;
      country?: string;
      road?: string;
      house_number?: string;
      attraction?: string;
      amenity?: string;
      suburb?: string;
    };
  };

  if (!payload.lat || !payload.lon) return null;

  return {
    label: payload.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude: Number(payload.lat),
    longitude: Number(payload.lon),
    address: [payload.address?.road, payload.address?.house_number].filter(Boolean).join(" ") || null,
    placeName: payload.name ?? payload.address?.attraction ?? payload.address?.amenity ?? payload.address?.suburb ?? null,
    city: payload.address?.city ?? payload.address?.town ?? payload.address?.village ?? null,
    district: payload.address?.county ?? null,
    region: payload.address?.state ?? null,
    country: payload.address?.country ?? null,
    source: "nominatim",
  };
}

export async function forwardGeocode(query: string) {
  if (!query.trim()) return [];

  if (process.env.MAPBOX_ACCESS_TOKEN) {
    try {
      return await forwardMapbox(query);
    } catch (error) {
      console.warn("Mapbox geocoding failed, falling back.", error);
    }
  }

  if (process.env.NOMINATIM_BASE_URL || process.env.NODE_ENV !== "production") {
    try {
      return await forwardNominatim(query);
    } catch (error) {
      console.warn("Nominatim geocoding failed, falling back to seeded search.", error);
    }
  }

  return seedSearch(query);
}

export async function reverseGeocode(latitude: number, longitude: number) {
  if (process.env.MAPBOX_ACCESS_TOKEN) {
    try {
      return await reverseMapbox(latitude, longitude);
    } catch (error) {
      console.warn("Mapbox reverse geocoding failed, falling back.", error);
    }
  }

  if (process.env.NOMINATIM_BASE_URL || process.env.NODE_ENV !== "production") {
    try {
      return await reverseNominatim(latitude, longitude);
    } catch (error) {
      console.warn("Nominatim reverse geocoding failed, falling back to seeded reverse.", error);
    }
  }

  return nearestSeedCandidate(latitude, longitude);
}
