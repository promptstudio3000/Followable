/** Rough map center + span (degrees) for demo POI scatter and map flyTo */
export type CountryMapConfig = {
  centerLat: number;
  centerLng: number;
  /** half-width of bbox for random-ish POI placement */
  spanLat: number;
  spanLng: number;
};

const COUNTRY_SEARCH_ALIASES: Record<string, string[]> = {
  ALL: ["all countries", "all", "everywhere", "evropa", "europe", "vsechny zeme", "všechny země"],
  CZ: ["czechia", "czech republic", "česko", "cesko", "česká republika", "cechy", "čechy", "bohemia"],
  SK: ["slovakia", "slovensko", "slovak republic"],
  PL: ["poland", "polska"],
  DE: ["germany", "deutschland", "německo", "nemecko"],
  AT: ["austria", "osterreich", "österreich", "rakousko"],
  FR: ["france", "francie"],
  IT: ["italy", "italia", "itálie", "italie"],
  ES: ["spain", "espana", "españa", "španělsko", "spanelsko"],
  PT: ["portugal", "portugalsko"],
  GB: ["united kingdom", "uk", "great britain", "britain", "england", "velká británie", "velka britanie"],
  IE: ["ireland", "eire", "irsko"],
  NL: ["netherlands", "holland", "nizozemsko"],
  BE: ["belgium", "belgie"],
  CH: ["switzerland", "suisse", "schweiz", "svycarsko", "švýcarsko"],
  HU: ["hungary", "madarsko", "maďarsko"],
  RO: ["romania", "rumunsko"],
  BG: ["bulgaria", "bulharsko"],
  GR: ["greece", "hellas", "řecko", "recko"],
  HR: ["croatia", "hrvatska", "chorvatsko"],
  SI: ["slovenia", "slovinsko"],
  DK: ["denmark", "danmark", "dánsko", "dansko"],
  SE: ["sweden", "sverige", "švédsko", "svedsko"],
  NO: ["norway", "norsko"],
  FI: ["finland", "suomi", "finsko"],
  EE: ["estonia", "eesti", "estonsko"],
  LV: ["latvia", "latvija", "lotyssko", "lotyšsko"],
  LT: ["lithuania", "lietuva", "litva"],
};

const DEFAULT_CONFIG: CountryMapConfig = {
  centerLat: 20,
  centerLng: 10,
  spanLat: 8,
  spanLng: 12,
};

/** Centers for common countries; others use DEFAULT_CONFIG */
export const COUNTRY_MAP_CONFIG: Record<string, CountryMapConfig> = {
  CZ: { centerLat: 49.75, centerLng: 15.5, spanLat: 2.2, spanLng: 4.5 },
  SK: { centerLat: 48.7, centerLng: 19.5, spanLat: 1.8, spanLng: 3.2 },
  PL: { centerLat: 51.9, centerLng: 19.3, spanLat: 3, spanLng: 4.5 },
  DE: { centerLat: 51.2, centerLng: 10.5, spanLat: 4, spanLng: 5 },
  AT: { centerLat: 47.5, centerLng: 14.5, spanLat: 2.5, spanLng: 4 },
  FR: { centerLat: 46.5, centerLng: 2.5, spanLat: 5, spanLng: 5 },
  IT: { centerLat: 42.8, centerLng: 12.6, spanLat: 4, spanLng: 4 },
  ES: { centerLat: 40.4, centerLng: -3.7, spanLat: 4, spanLng: 5 },
  PT: { centerLat: 39.6, centerLng: -8, spanLat: 2.5, spanLng: 2.5 },
  GB: { centerLat: 54.2, centerLng: -2.5, spanLat: 5, spanLng: 4 },
  IE: { centerLat: 53.3, centerLng: -8, spanLat: 2, spanLng: 2.5 },
  NL: { centerLat: 52.2, centerLng: 5.3, spanLat: 1.5, spanLng: 2 },
  BE: { centerLat: 50.5, centerLng: 4.5, spanLat: 1.2, spanLng: 1.5 },
  CH: { centerLat: 46.9, centerLng: 8.2, spanLat: 1.5, spanLng: 2 },
  HU: { centerLat: 47.2, centerLng: 19.5, spanLat: 2, spanLng: 3 },
  RO: { centerLat: 45.9, centerLng: 25, spanLat: 3, spanLng: 5 },
  BG: { centerLat: 42.7, centerLng: 25.5, spanLat: 2, spanLng: 3 },
  GR: { centerLat: 39, centerLng: 22.5, spanLat: 3, spanLng: 4 },
  HR: { centerLat: 45.1, centerLng: 15.2, spanLat: 2, spanLng: 3 },
  SI: { centerLat: 46.1, centerLng: 14.8, spanLat: 1, spanLng: 1.5 },
  US: { centerLat: 39.8, centerLng: -98.5, spanLat: 12, spanLng: 18 },
  CA: { centerLat: 56, centerLng: -96, spanLat: 15, spanLng: 25 },
  MX: { centerLat: 23.6, centerLng: -102.5, spanLat: 8, spanLng: 10 },
  BR: { centerLat: -14.2, centerLng: -51.9, spanLat: 12, spanLng: 14 },
  AR: { centerLat: -34, centerLng: -64, spanLat: 8, spanLng: 8 },
  JP: { centerLat: 36.2, centerLng: 138.3, spanLat: 5, spanLng: 6 },
  KR: { centerLat: 36.5, centerLng: 127.9, spanLat: 3, spanLng: 3 },
  CN: { centerLat: 35.8, centerLng: 104.2, spanLat: 12, spanLng: 16 },
  IN: { centerLat: 22.5, centerLng: 79, spanLat: 10, spanLng: 12 },
  AU: { centerLat: -25.3, centerLng: 133.8, spanLat: 12, spanLng: 16 },
  NZ: { centerLat: -41.3, centerLng: 174.8, spanLat: 6, spanLng: 8 },
  ZA: { centerLat: -29, centerLng: 25, spanLat: 6, spanLng: 8 },
  EG: { centerLat: 26.8, centerLng: 30.8, spanLat: 4, spanLng: 5 },
  MA: { centerLat: 32, centerLng: -6, spanLat: 4, spanLng: 4 },
  TR: { centerLat: 39, centerLng: 35, spanLat: 4, spanLng: 6 },
  UA: { centerLat: 48.5, centerLng: 31.5, spanLat: 4, spanLng: 6 },
  SE: { centerLat: 62, centerLng: 15, spanLat: 8, spanLng: 4 },
  NO: { centerLat: 64, centerLng: 10, spanLat: 8, spanLng: 3 },
  FI: { centerLat: 64.5, centerLng: 26, spanLat: 6, spanLng: 5 },
  DK: { centerLat: 56, centerLng: 10, spanLat: 2.5, spanLng: 2 },
  IS: { centerLat: 64.9, centerLng: -19, spanLat: 2, spanLng: 3 },
  LT: { centerLat: 55.2, centerLng: 23.9, spanLat: 2, spanLng: 3 },
  LV: { centerLat: 56.9, centerLng: 24.6, spanLat: 2, spanLng: 2.5 },
  EE: { centerLat: 58.6, centerLng: 25.0, spanLat: 2, spanLng: 3 },
  BA: { centerLat: 44.0, centerLng: 17.8, spanLat: 2, spanLng: 2.5 },
  RS: { centerLat: 44.2, centerLng: 20.9, spanLat: 3, spanLng: 4 },
  ME: { centerLat: 42.8, centerLng: 19.3, spanLat: 1.5, spanLng: 2 },
  MK: { centerLat: 41.6, centerLng: 21.7, spanLat: 1.5, spanLng: 2 },
  AL: { centerLat: 41.2, centerLng: 20.1, spanLat: 2, spanLng: 2 },
  CY: { centerLat: 35.0, centerLng: 33.4, spanLat: 1.2, spanLng: 2 },
  MT: { centerLat: 35.9, centerLng: 14.4, spanLat: 0.5, spanLng: 0.8 },
  LU: { centerLat: 49.8, centerLng: 6.1, spanLat: 0.5, spanLng: 0.6 },
  MC: { centerLat: 43.7, centerLng: 7.4, spanLat: 0.2, spanLng: 0.3 },
  AD: { centerLat: 42.5, centerLng: 1.5, spanLat: 0.3, spanLng: 0.4 },
  SM: { centerLat: 43.9, centerLng: 12.5, spanLat: 0.2, spanLng: 0.3 },
  VA: { centerLat: 41.9, centerLng: 12.5, spanLat: 0.1, spanLng: 0.1 },
  LI: { centerLat: 47.1, centerLng: 9.5, spanLat: 0.3, spanLng: 0.5 },
  BY: { centerLat: 53.7, centerLng: 27.9, spanLat: 2.6, spanLng: 4.2 },
  MD: { centerLat: 47.0, centerLng: 28.9, spanLat: 1.0, spanLng: 1.8 },
  KZ: { centerLat: 48.0, centerLng: 67.0, spanLat: 12, spanLng: 18 },
  GE: { centerLat: 42.3, centerLng: 43.4, spanLat: 2, spanLng: 3 },
  AM: { centerLat: 40.1, centerLng: 45.0, spanLat: 1.5, spanLng: 2 },
  AZ: { centerLat: 40.1, centerLng: 47.6, spanLat: 3, spanLng: 4 },
};

export function getCountryMapConfig(code: string): CountryMapConfig {
  return COUNTRY_MAP_CONFIG[code.toUpperCase()] ?? DEFAULT_CONFIG;
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Státy s demo POI na mapě a plně vybratelné ve výběru */
export function isCountryDemoEnabled(code: string): boolean {
  return code.toUpperCase() in COUNTRY_MAP_CONFIG;
}

/** Display name in Czech (for header + picker) */
export function getCountryNameCs(code: string): string {
  const c = code.toUpperCase();
  if (c === "ALL") return "Všechny země";
  try {
    const dn = new Intl.DisplayNames(["cs"], { type: "region" });
    return dn.of(c) ?? c;
  } catch {
    return c;
  }
}

function getCountryNameEn(code: string): string {
  const c = code.toUpperCase();
  if (c === "ALL") return "All countries";
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(c) ?? c;
  } catch {
    return c;
  }
}

export function getCountrySearchAliases(code: string) {
  const c = code.toUpperCase();
  const values = [
    c,
    getCountryNameCs(c),
    getCountryNameEn(c),
    ...(COUNTRY_SEARCH_ALIASES[c] ?? []),
  ];
  return Array.from(new Set(values.filter(Boolean)));
}

export function getCountrySearchIndex(code: string, fallbackName?: string) {
  const values = [fallbackName ?? "", ...getCountrySearchAliases(code)];
  return Array.from(new Set(values.flatMap((value) => [value, normalizeSearchText(value)])))
    .filter(Boolean)
    .join(" ");
}

let _sorted: { code: string; name: string }[] | null = null;

/** All valid-looking ISO alpha-2 regions, sorted by Czech name */
export function getCountriesSortedCs(): { code: string; name: string }[] {
  if (_sorted) return _sorted;
  const dn = new Intl.DisplayNames(["cs"], { type: "region" });
  const pairs: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a) + String.fromCharCode(b);
      const name = dn.of(code);
      if (!name || name === code) continue;
      pairs.push({ code, name });
    }
  }
  pairs.sort((x, y) => x.name.localeCompare(y.name, "cs"));
  _sorted = pairs;
  return pairs;
}
