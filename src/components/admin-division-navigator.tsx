"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "@/components/icons";
import type { AdminDivisionBrowseItem } from "@/lib/admin-divisions";
import { adminDivisionToSearchPlace } from "@/lib/admin-divisions";
import type { SearchPlace } from "@/lib/types";
import { cn } from "@/lib/utils";

type AdminDivisionNavigatorProps = {
  countryCode: string;
  rootPlace: SearchPlace;
  selectedPlaceId?: string | null;
  onSelectPlace: (place: SearchPlace) => void;
  className?: string;
};

function levelLabel(level: number) {
  if (level <= 1) return "Admin 1";
  if (level === 2) return "Admin 2";
  if (level === 3) return "Admin 3";
  return "Admin 4";
}

async function fetchDivisionChildren(countryCode: string, parentCode: string | null, level: number) {
  const params = new URLSearchParams({
    country: countryCode,
    level: String(level),
  });
  if (parentCode) params.set("parentCode", parentCode);

  const response = await fetch(`/api/admin-divisions?${params.toString()}`, {
    method: "GET",
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("admin_divisions_fetch_failed");
  }

  const payload = (await response.json()) as { items?: AdminDivisionBrowseItem[] };
  return payload.items ?? [];
}

export function AdminDivisionNavigator({
  countryCode,
  rootPlace,
  selectedPlaceId,
  onSelectPlace,
  className,
}: AdminDivisionNavigatorProps) {
  const cacheRef = useRef(new Map<string, AdminDivisionBrowseItem[]>());
  const [stack, setStack] = useState<AdminDivisionBrowseItem[]>([]);
  const [items, setItems] = useState<AdminDivisionBrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentParent = stack[stack.length - 1] ?? null;
  const currentLevel = currentParent ? currentParent.level + 1 : 1;
  const cacheKey = `${countryCode}:${currentParent?.code ?? "root"}:${currentLevel}`;

  useEffect(() => {
    setStack([]);
  }, [countryCode]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setItems(cached);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextItems = await fetchDivisionChildren(countryCode, currentParent?.code ?? null, currentLevel);
        cacheRef.current.set(cacheKey, nextItems);
        if (cancelled) return;
        startTransition(() => {
          setItems(nextItems);
        });
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "admin_divisions_fetch_failed");
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, countryCode, currentLevel, currentParent?.code]);

  const currentPath = useMemo(() => [rootPlace, ...stack.map((item) => adminDivisionToSearchPlace(item, stack))], [rootPlace, stack]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-3 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
        {currentPath.map((place, index) => {
          const isLast = index === currentPath.length - 1;
          return (
            <div key={place.id} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-45" /> : null}
              <button
                type="button"
                onClick={() => {
                  if (index === 0) {
                    setStack([]);
                    onSelectPlace(rootPlace);
                    return;
                  }
                  const nextStack = stack.slice(0, index);
                  setStack(nextStack);
                  onSelectPlace(adminDivisionToSearchPlace(nextStack[nextStack.length - 1]!, nextStack));
                }}
                className={cn(
                  "rounded-full px-2 py-0.5 transition",
                  isLast
                    ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                    : "hover:bg-stone-950/6 dark:hover:bg-white/8",
                )}
              >
                {place.label}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[color:var(--foreground)]">
            {currentParent ? `Pod ${currentParent.name}` : `Celá země: ${rootPlace.label}`}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            {currentLevel <= 4 ? `${levelLabel(currentLevel)} vrstva` : "Konec hierarchie"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setStack([]);
            onSelectPlace(rootPlace);
          }}
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold transition",
            selectedPlaceId === rootPlace.id
              ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
              : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300 dark:hover:border-stone-500",
          )}
        >
          Celá země
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const place = adminDivisionToSearchPlace(item, stack);
          const active = selectedPlaceId === place.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectPlace(place);
                if (item.level < 4) {
                  setStack((current) => [...current, item]);
                }
              }}
              className={cn(
                "inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-1.5 text-left text-xs font-semibold transition",
                active
                  ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                  : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300 dark:hover:border-stone-500",
              )}
            >
              <span>{item.name}</span>
              {item.level < 4 ? <ChevronRight className="h-3.5 w-3.5 opacity-55" /> : null}
            </button>
          );
        })}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
            Tady už další podvrstva není.
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
            Načítám podvrstvu…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
            Podvrstvu se teď nepodařilo načíst.
          </div>
        ) : null}
      </div>
    </div>
  );
}
