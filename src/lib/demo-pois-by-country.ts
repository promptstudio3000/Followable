import { getCountryMapConfig } from "@/lib/countries";
import { getAdminRegionSeeds } from "@/lib/admin-regions-by-country";
import { getPostPlaceMetadata, withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import type { HydratedPost, Location, Post, Topic, User } from "@/lib/types";

const DEMO_TITLES = [
  "Demo výhled",
  "Skryté místo (demo)",
  "Lokální tip",
  "Tiché zákoutí",
  "Off-grid bod",
  "Průvodcovský špendlík",
  "Objevitelský POI",
  "Mapový náhled",
];

function hashSeed(s: string, i: number): number {
  let h = i * 17;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k) + i * 13) >>> 0;
  return (h % 1000) / 1000;
}

function makeDemoHydrated(
  id: string,
  title: string,
  lat: number,
  lng: number,
  author: User,
  countryCode: string,
  regionName: string | null,
  topic: Topic | null,
): HydratedPost {
  const now = new Date().toISOString();
  const location: Location = withCanonicalPlaceLinkage({
    id: `loc_${id}`,
    latitude: lat,
    longitude: lng,
    address: null,
    placeName: title,
    city: null,
    district: null,
    region: regionName,
    country: countryCode,
    geokey: `${lat.toFixed(3)}:${lng.toFixed(3)}`,
    createdAt: now,
    updatedAt: now,
  });
  const post: Post = {
    id,
    authorId: author.id,
    locationId: location.id,
    title,
    body: "Ukázkový bod na mapě — plný obsah pro tuto zemi přibude později.",
    visibilityType: "public",
    teaser: null,
    topicId: topic?.id ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const summary = regionName ? `${regionName}, ${countryCode}` : countryCode;
  return {
    id,
    post,
    author,
    location,
    place: getPostPlaceMetadata({ location }),
    topic: topic ?? null,
    tags: ["demo", "map"],
    media: [],
    reactions: [],
    comments: [],
    savesCount: 0,
    popularityScore: Math.round(hashSeed(id, 0) * 100),
    distanceKm: null,
    isActive: true,
    canAccess: true,
    isLocked: false,
    accessKind: "public",
    displayLatitude: lat,
    displayLongitude: lng,
    locationSummary: summary,
    regionKey: regionName ? `${countryCode}|${regionName}` : countryCode,
    engagementCount: 0,
  };
}

export function getDemoPoiPostsForCountry(countryCode: string, author: User, topic: Topic | null): HydratedPost[] {
  const cfg = getCountryMapConfig(countryCode);
  const code = countryCode.toUpperCase();
  const admin = getAdminRegionSeeds(code);

  if (admin.length > 0) {
    const out: HydratedPost[] = [];
    let idx = 0;
    for (const r of admin) {
      for (let k = 0; k < 2; k++) {
        const u = hashSeed(r.id, k);
        const v = hashSeed(`${r.id}y`, k);
        const spread = 0.55;
        const lat = r.latitude + (u - 0.5) * 2 * spread;
        const lng = r.longitude + (v - 0.5) * 2 * spread;
        const title = DEMO_TITLES[idx % DEMO_TITLES.length];
        out.push(
          makeDemoHydrated(
            `demo_poi_${code}_${r.id}_${k}`,
            title,
            lat,
            lng,
            author,
            code,
            r.label,
            topic,
          ),
        );
        idx += 1;
      }
    }
    return out;
  }

  return DEMO_TITLES.map((title, i) => {
    const u = hashSeed(code, i);
    const v = hashSeed(code + "y", i);
    const lat = cfg.centerLat + (u - 0.5) * 2 * cfg.spanLat * 0.85;
    const lng = cfg.centerLng + (v - 0.5) * 2 * cfg.spanLng * 0.85;
    return makeDemoHydrated(`demo_poi_${code}_${i}`, title, lat, lng, author, code, null, topic);
  });
}
