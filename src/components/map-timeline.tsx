"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function MapTimeline({
  minDate,
  maxDate,
  valueStart,
  valueEnd,
  onChange,
  className,
  compact = false,
  variant = "default",
}: {
  minDate: number;
  maxDate: number;
  valueStart: number;
  valueEnd: number;
  onChange: (range: [number, number]) => void;
  className?: string;
  /** Shorter track, optional single date row */
  compact?: boolean;
  /** Light-friendly vs dark map chrome */
  variant?: "default" | "lightPanel" | "darkPanel";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const range = maxDate - minDate || 1;
  const minThumbGap = Math.max(60_000, Math.floor(range * 0.02));
  const startPct = ((valueStart - minDate) / range) * 100;
  const endPct = ((valueEnd - minDate) / range) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return minDate;
      const rect = track.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      return minDate + clamp(pct, 0, 1) * range;
    },
    [minDate, range],
  );

  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const valueStartRef = useRef(valueStart);
  const valueEndRef = useRef(valueEnd);
  valueStartRef.current = valueStart;
  valueEndRef.current = valueEnd;

  useEffect(() => {
    if (dragging === null) return;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const onMove = (e: MouseEvent) => {
      const v = valueFromClientX(e.clientX);
      const d = draggingRef.current;
      const vs = valueStartRef.current;
      const ve = valueEndRef.current;
      if (d === "start") {
        onChangeRef.current([clamp(v, minDate, ve - minThumbGap), ve]);
      } else if (d === "end") {
        onChangeRef.current([vs, clamp(v, vs + minThumbGap, maxDate)]);
      }
    };
    const onUp = () => {
      document.body.style.userSelect = prevUserSelect;
      setDragging(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, minDate, maxDate, minThumbGap, valueFromClientX]);

  const formatLabel = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric", day: "numeric" });
  };

  const trackH = compact ? "h-5" : "h-8";
  const railLight = variant === "lightPanel";
  const railDark = variant === "darkPanel";
  return (
    <div className={cn(compact ? "flex flex-col gap-0.5" : "flex flex-col gap-1", className)}>
      <div
        ref={trackRef}
        className={cn("relative w-full touch-none", trackH)}
        role="slider"
        aria-valuemin={minDate}
        aria-valuemax={maxDate}
        aria-valuenow={valueStart}
        aria-label="Time range"
      >
        <div className="absolute inset-0 flex items-center">
          <div
            className={cn(
              "h-1 w-full rounded-full",
              railDark ? "bg-stone-700" : railLight ? "bg-stone-200" : "bg-stone-200 dark:bg-stone-600",
            )}
          />
          <div
            className={cn(
              "absolute h-1 rounded-full",
              railDark ? "bg-amber-200/90" : railLight ? "bg-stone-700" : "bg-stone-500 dark:bg-stone-400",
            )}
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
        </div>
        <button
          type="button"
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 shadow focus:outline-none focus-visible:ring-2",
            compact ? "h-3 w-3" : "h-4 w-4",
            railDark
              ? "border-stone-900 bg-stone-400 focus-visible:ring-amber-400/50"
              : railLight
                ? "border-white bg-stone-700 focus-visible:ring-stone-400"
                : "border-white bg-stone-600 focus-visible:ring-stone-400 dark:bg-stone-500",
          )}
          style={{ left: `calc(${startPct}% - ${compact ? 6 : 8}px)` }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragging("start");
          }}
          onPointerDown={(e) => e.preventDefault()}
          aria-label="Start time"
        />
        <button
          type="button"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full border-2 shadow focus:outline-none focus-visible:ring-2",
            compact ? "h-3 w-3" : "h-4 w-4",
            railDark
              ? "border-stone-900 bg-stone-400 focus-visible:ring-amber-400/50"
              : railLight
                ? "border-white bg-stone-700 focus-visible:ring-stone-400"
                : "border-white bg-stone-600 focus-visible:ring-stone-400 dark:bg-stone-500",
          )}
          style={{ left: `calc(${endPct}% - ${compact ? 6 : 8}px)` }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging("end");
          }}
          aria-label="End time"
        />
      </div>
      {!compact ? (
        <div
          className={cn(
            "flex justify-between text-[10px]",
            railDark ? "text-stone-400" : "text-stone-500 dark:text-stone-400",
          )}
        >
          <span>{formatLabel(valueStart)}</span>
          <span>{formatLabel(valueEnd)}</span>
        </div>
      ) : (
        <div
          className={cn(
            "flex justify-between text-[9px]",
            railDark ? "text-stone-400" : "text-stone-500 dark:text-stone-400",
          )}
        >
          <span>{formatLabel(valueStart)}</span>
          <span>{formatLabel(valueEnd)}</span>
        </div>
      )}
    </div>
  );
}
