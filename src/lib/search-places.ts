import type { GeocodeCandidate, SearchPlace } from "@/lib/types";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function matchSearchPlace(places: SearchPlace[], candidate: GeocodeCandidate) {
  const tokens = [
    candidate.label,
    candidate.placeName,
    candidate.city,
    candidate.region,
    candidate.country,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeText);

  return (
    places.find((place) => {
      const haystack = normalizeText(
        [place.label, place.city, place.region, place.country].filter(Boolean).join(" "),
      );

      return tokens.some((token) => haystack.includes(token) || token.includes(haystack));
    }) ?? null
  );
}
