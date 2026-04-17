const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const CARTO_DARK_MATTER = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_POSITRON = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const DEFAULT_LIGHT_STYLE = CARTO_VOYAGER;
const DEFAULT_DARK_STYLE = CARTO_DARK_MATTER;

export const MAP_STYLE_OPTIONS = [
  { id: "voyager", label: "Voyager", lightUrl: CARTO_VOYAGER, darkUrl: CARTO_DARK_MATTER },
  { id: "dark_matter", label: "Dark Matter", lightUrl: CARTO_DARK_MATTER, darkUrl: CARTO_DARK_MATTER },
  { id: "positron", label: "Positron", lightUrl: CARTO_POSITRON, darkUrl: CARTO_DARK_MATTER },
] as const;

export type MapLayerId = (typeof MAP_STYLE_OPTIONS)[number]["id"];

export function getMapStyleUrlsForLayer(layerId: string): { light: string; dark: string } {
  const option = MAP_STYLE_OPTIONS.find((o) => o.id === layerId) ?? MAP_STYLE_OPTIONS[0];
  return { light: option.lightUrl, dark: option.darkUrl };
}

export function getMapStyleUrl() {
  if (process.env.NEXT_PUBLIC_MAP_STYLE_URL) {
    return process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  }

  if (process.env.NEXT_PUBLIC_MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`;
  }

  return DEFAULT_LIGHT_STYLE;
}

export function getMapStyleUrls() {
  const light = process.env.NEXT_PUBLIC_MAP_STYLE_URL
    ? process.env.NEXT_PUBLIC_MAP_STYLE_URL
    : process.env.NEXT_PUBLIC_MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
      : DEFAULT_LIGHT_STYLE;

  const dark = process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK
    ? process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK
    : process.env.NEXT_PUBLIC_MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
      : DEFAULT_DARK_STYLE;

  return { light, dark };
}

export function getMapMode() {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL || process.env.NEXT_PUBLIC_MAPTILER_KEY
    ? "custom-style"
    : "demo-style";
}
