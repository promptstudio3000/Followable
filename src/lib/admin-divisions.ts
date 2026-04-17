import type { SearchPlace } from "@/lib/types";

export type AdminDivisionBrowseItem = {
  id: string;
  geonameId: number;
  countryCode: string;
  level: number;
  featureCode: string;
  code: string;
  parentCode: string | null;
  name: string;
  asciiName: string;
  latitude: number;
  longitude: number;
};

export function adminDivisionToSearchPlace(
  item: AdminDivisionBrowseItem,
  ancestors: AdminDivisionBrowseItem[] = [],
): SearchPlace {
  if (item.level <= 1) {
    return {
      id: item.id,
      kind: item.level === 0 ? "country" : "region",
      label: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.countryCode,
      region: item.level === 1 ? item.name : undefined,
    };
  }

  const region = [...ancestors].reverse().find((entry) => entry.level === 1)?.name ?? null;

  return {
    id: item.id,
    kind: "district",
    label: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    district: item.name,
    region,
    country: item.countryCode,
  };
}
