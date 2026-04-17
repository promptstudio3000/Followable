import { formatDistanceToNowStrict, formatISO } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Location, VisibilityType } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Human-readable distance from viewer (hydratePosts with center). */
export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatRelativeDate(value: string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function formatMoney(value?: number | null, currency = "CZK") {
  if (value == null) return null;
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function shortLocation(location: Location) {
  return [location.placeName, location.city, location.region, location.country]
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

export function coordsToGeokey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
}

export function isoDaysAgo(daysAgo: number) {
  return formatISO(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000));
}

export function describeVisibility(type: VisibilityType) {
  if (type === "public") return "Public";
  if (type === "subscriber_only") return "Subscriber only";
  return "Special hidden place";
}

export function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(latitudeB - latitudeA);
  const dLng = degreesToRadians(longitudeB - longitudeA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(latitudeA)) *
      Math.cos(degreesToRadians(latitudeB)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
