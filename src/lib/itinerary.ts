import type { ItineraryEntry } from "@/lib/types";

type SortableItineraryEntry = Pick<ItineraryEntry, "dayLabel" | "sortOrder" | "timeLabel" | "createdAt">;

export function compareItineraryEntries<T extends Partial<SortableItineraryEntry>>(left: T, right: T) {
  const dayCompare = (left.dayLabel ?? "").localeCompare(right.dayLabel ?? "", undefined, { numeric: true });
  if (dayCompare !== 0) return dayCompare;

  const leftOrder = typeof left.sortOrder === "number" ? left.sortOrder : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.sortOrder === "number" ? right.sortOrder : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;

  const timeCompare = (left.timeLabel ?? "").localeCompare(right.timeLabel ?? "");
  if (timeCompare !== 0) return timeCompare;

  return (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
}

export function sortItineraryEntries<T extends Partial<SortableItineraryEntry>>(entries: T[]) {
  return [...entries].sort(compareItineraryEntries);
}
