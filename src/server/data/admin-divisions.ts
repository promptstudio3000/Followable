import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { getCountryNameCs } from "@/lib/countries";
import type { SearchPlace, SeedData } from "@/lib/types";

export type AdminDivisionLevel = 0 | 1 | 2 | 3 | 4;

type AdminDivisionSeedTuple = [
  id: string,
  geonameId: number,
  countryCode: string,
  level: AdminDivisionLevel,
  featureCode: string,
  code: string,
  parentCode: string | null,
  name: string,
  asciiName: string,
  latitude: number,
  longitude: number,
];

export type AdminDivisionSeedRecord = {
  id: string;
  geonameId: number;
  countryCode: string;
  level: AdminDivisionLevel;
  featureCode: string;
  code: string;
  parentCode: string | null;
  name: string;
  asciiName: string;
  latitude: number;
  longitude: number;
};

const seedFilePath = resolve(process.cwd(), "src", "server", "data", "generated", "admin-divisions.seed.json");

let cachedSeedRecords: AdminDivisionSeedRecord[] | null = null;
let cachedAllSearchPlaces: SearchPlace[] | null = null;

function getRawSeedRows(): AdminDivisionSeedTuple[] {
  if (!existsSync(seedFilePath)) {
    throw new Error(
      `Admin division seed file is missing at ${seedFilePath}. Run npm run db:build-admin-divisions-seed first.`,
    );
  }

  return JSON.parse(readFileSync(seedFilePath, "utf-8")) as AdminDivisionSeedTuple[];
}

function toRecord(row: AdminDivisionSeedTuple): AdminDivisionSeedRecord {
  return {
    id: row[0],
    geonameId: row[1],
    countryCode: row[2],
    level: row[3],
    featureCode: row[4],
    code: row[5],
    parentCode: row[6],
    name: row[7],
    asciiName: row[8],
    latitude: row[9],
    longitude: row[10],
  };
}

function buildAncestryByCode(divisions: AdminDivisionSeedRecord[]) {
  const byCode = new Map(divisions.map((division) => [division.code, division]));
  return {
    byCode,
    getAncestorName(code: string | null | undefined, level: AdminDivisionLevel) {
      let cursor = code ? byCode.get(code) ?? null : null;
      while (cursor) {
        if (cursor.level === level) return cursor.name;
        cursor = cursor.parentCode ? byCode.get(cursor.parentCode) ?? null : null;
      }
      return null;
    },
  };
}

function toSearchPlace(
  division: AdminDivisionSeedRecord,
  ancestry: ReturnType<typeof buildAncestryByCode>,
): SearchPlace {
  if (division.level === 0) {
    return {
      id: `demo-${division.countryCode}-all`,
      kind: "country",
      label: getCountryNameCs(division.countryCode),
      latitude: division.latitude,
      longitude: division.longitude,
      country: division.countryCode,
      radiusKm: 800,
    };
  }

  if (division.level === 1) {
    return {
      id: division.id,
      kind: "region",
      label: division.name,
      latitude: division.latitude,
      longitude: division.longitude,
      region: division.name,
      country: division.countryCode,
    };
  }

  return {
    id: division.id,
    kind: "district",
    label: division.name,
    latitude: division.latitude,
    longitude: division.longitude,
    district: division.name,
    region: ancestry.getAncestorName(division.parentCode, 1),
    country: division.countryCode,
  };
}

export function getAdminDivisionSeedRecords(): AdminDivisionSeedRecord[] {
  if (!cachedSeedRecords) {
    cachedSeedRecords = getRawSeedRows().map(toRecord);
  }
  return cachedSeedRecords;
}

export function buildAdminDivisionSearchPlaces(
  divisions: AdminDivisionSeedRecord[],
  options?: { maxLevel?: AdminDivisionLevel; includeCountries?: boolean },
): SearchPlace[] {
  const maxLevel = options?.maxLevel ?? 2;
  const includeCountries = options?.includeCountries ?? true;
  const ancestry = buildAncestryByCode(divisions);

  return divisions
    .filter((division) => {
      if (division.level === 0) return includeCountries;
      return division.level <= maxLevel;
    })
    .map((division) => toSearchPlace(division, ancestry))
    .sort((left, right) =>
      left.label.localeCompare(right.label, "cs", { sensitivity: "base" }) ||
      (left.country ?? "").localeCompare(right.country ?? "", "en"),
    );
}

export function getGlobalSeedSearchPlaces(): SearchPlace[] {
  if (!cachedAllSearchPlaces) {
    cachedAllSearchPlaces = buildAdminDivisionSearchPlaces(getAdminDivisionSeedRecords(), {
      maxLevel: 2,
      includeCountries: true,
    });
  }
  return cachedAllSearchPlaces;
}

export function mergeSeedDataSearchPlaces(snapshot: SeedData): SeedData {
  const seen = new Set<string>();
  const searchPlaces = [...snapshot.searchPlaces, ...getGlobalSeedSearchPlaces()].filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });

  return {
    ...snapshot,
    searchPlaces,
  };
}

export function getAdminDivisionSeedChildren(input: {
  countryCode?: string | null;
  parentCode?: string | null;
  level?: number | null;
  query?: string | null;
}) {
  const needle = input.query?.trim().toLocaleLowerCase("en") ?? "";
  return getAdminDivisionSeedRecords()
    .filter((division) => {
      if (input.countryCode && division.countryCode !== input.countryCode.toUpperCase()) return false;
      if (input.parentCode != null && division.parentCode !== input.parentCode) return false;
      if (input.level != null && division.level !== input.level) return false;
      if (!needle) return true;
      return (
        division.name.toLocaleLowerCase("en").includes(needle) ||
        division.asciiName.toLocaleLowerCase("en").includes(needle)
      );
    })
    .sort((left, right) =>
      left.name.localeCompare(right.name, "cs", { sensitivity: "base" }) ||
      left.code.localeCompare(right.code, "en"),
    );
}
