"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MapView } from "@/components/map-view";
import { PostCard } from "@/components/post-card";
import { Bookmark, Copy, Globe2, Heart, Lock, Share2, Sparkles, Trash2, Users } from "@/components/icons";
import { useCountry } from "@/components/providers/country-context";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { buildAiItineraryDraft } from "@/lib/ai-itinerary";
import { sortItineraryEntries } from "@/lib/itinerary";
import { buildPublicItinerarySnapshot, encodePublicItinerarySnapshot } from "@/lib/public-itinerary-share";
import { cn, formatRelativeDate } from "@/lib/utils";

function panelClass() {
  return "rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur-md";
}

type PlannerMode = "manual" | "ai";
type PlannerScope = "country" | "saved" | "following";
type ItineraryTab = "route" | "stops" | "notes";

const AI_SCOPE_OPTIONS: Array<{
  value: PlannerScope;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    value: "country",
    label: "Current country",
    description: "Plan from all unlocked active places in this country.",
    icon: Sparkles,
  },
  {
    value: "saved",
    label: "Saved places",
    description: "Stay close to places you already marked as interesting.",
    icon: Heart,
  },
  {
    value: "following",
    label: "Following",
    description: "Only use places from creators you currently follow.",
    icon: Users,
  },
];

const AI_PROMPT_EXAMPLES = [
  "První den chci nakoupit, pak vyhlídku a večer vodu na přespání v karavanu. Druhý den chci hezké město na oběd a památky.",
  "2 days by van with one coffee stop, one swim stop, and a sunset viewpoint each day",
  "Family-friendly day with lunch, easy walk, and a calm place by water",
];

export function ItineraryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { countryCode, countryName } = useCountry();
  const {
    snapshot,
    viewerId,
    localState,
    hydratedPosts,
    createItinerary,
    addToItinerary,
    updateItineraryEntry,
    moveItineraryEntry,
    moveItineraryEntryToDayEdge,
    reorderItineraryEntry,
    removeItineraryEntry,
    updateItinerarySharing,
  } = useDemoStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("manual");
  const [aiTitle, setAiTitle] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiScope, setAiScope] = useState<PlannerScope>("country");
  const [aiTagFilter, setAiTagFilter] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [activeTripTab, setActiveTripTab] = useState<ItineraryTab>("route");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingDayLabel, setEditingDayLabel] = useState("");
  const [editingTimeLabel, setEditingTimeLabel] = useState("");
  const [editingNote, setEditingNote] = useState("");
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [isAiPlannerPending, startAiPlannerTransition] = useTransition();

  const itineraries = localState.itineraries ?? [];
  const postsById = useMemo(() => new Map(hydratedPosts.map((post) => [post.id, post])), [hydratedPosts]);
  const highlightedTripId = searchParams.get("trip");

  const followedCreatorIds = useMemo(() => {
    const ids = new Set(localState.followingIds);
    snapshot.follows
      .filter((follow) => follow.followerId === viewerId)
      .forEach((follow) => ids.add(follow.followedUserId));
    return ids;
  }, [localState.followingIds, snapshot.follows, viewerId]);

  const countryPosts = useMemo(() => {
    return hydratedPosts.filter((post) => {
      if (!post.canAccess || !post.isActive) return false;
      if (countryCode === "ALL") return true;
      return (post.location.country ?? "").toUpperCase() === countryCode;
    });
  }, [countryCode, hydratedPosts]);

  const savedPostIds = useMemo(() => new Set(localState.savedPostIds), [localState.savedPostIds]);
  const savedCountryPosts = useMemo(
    () => countryPosts.filter((post) => savedPostIds.has(post.id)),
    [countryPosts, savedPostIds],
  );
  const followingCountryPosts = useMemo(
    () => countryPosts.filter((post) => followedCreatorIds.has(post.author.id)),
    [countryPosts, followedCreatorIds],
  );

  const plannerPostsBase = useMemo(() => {
    if (aiScope === "saved") return savedCountryPosts;
    if (aiScope === "following") return followingCountryPosts;
    return countryPosts;
  }, [aiScope, countryPosts, followingCountryPosts, savedCountryPosts]);

  const plannerTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    plannerPostsBase.forEach((post) => {
      post.tags.forEach((tag) => {
        const normalized = tag.toLowerCase();
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);
  }, [plannerPostsBase]);

  const plannerPosts = useMemo(() => {
    if (!aiTagFilter) return plannerPostsBase;
    return plannerPostsBase.filter((post) => post.tags.some((tag) => tag.toLowerCase() === aiTagFilter));
  }, [aiTagFilter, plannerPostsBase]);

  const selectedItinerary =
    itineraries.find((itinerary) => itinerary.id === highlightedTripId) ??
    itineraries[0] ??
    null;

  const orderedEntries = useMemo(() => {
    if (!selectedItinerary) return [];
    return sortItineraryEntries(selectedItinerary.entries);
  }, [selectedItinerary]);

  const orderedRouteStops = useMemo(() => {
    return orderedEntries.map((entry) => ({
      entry,
      post: postsById.get(entry.postId) ?? null,
    }));
  }, [orderedEntries, postsById]);

  const groupedRouteStops = useMemo(() => {
    return orderedRouteStops.reduce<Record<string, typeof orderedRouteStops>>((acc, stop) => {
      const key = stop.entry.dayLabel;
      acc[key] = acc[key] ? [...acc[key], stop] : [stop];
      return acc;
    }, {});
  }, [orderedRouteStops]);

  const dayLabels = useMemo(
    () => Object.keys(groupedRouteStops).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [groupedRouteStops],
  );

  const activeSelectedStopId = useMemo(() => {
    if (orderedRouteStops.length === 0) return null;
    if (selectedStopId && orderedRouteStops.some((stop) => stop.post?.id === selectedStopId)) {
      return selectedStopId;
    }
    return orderedRouteStops.find((stop) => stop.post)?.post?.id ?? null;
  }, [orderedRouteStops, selectedStopId]);

  const selectedStop = orderedRouteStops.find((stop) => stop.post?.id === activeSelectedStopId) ?? null;
  const draggedStop = useMemo(
    () => (draggedEntryId ? orderedRouteStops.find((stop) => stop.entry.id === draggedEntryId) ?? null : null),
    [draggedEntryId, orderedRouteStops],
  );
  const selectedItinerarySnapshot = useMemo(
    () => (selectedItinerary ? buildPublicItinerarySnapshot(selectedItinerary, postsById) : null),
    [postsById, selectedItinerary],
  );
  const publicSharePath = useMemo(
    () =>
      selectedItinerarySnapshot
        ? `/itinerary/public?data=${encodeURIComponent(encodePublicItinerarySnapshot(selectedItinerarySnapshot))}`
        : null,
    [selectedItinerarySnapshot],
  );
  const internalSharePath = selectedItinerary ? `/itinerary?trip=${selectedItinerary.id}` : null;

  useEffect(() => {
    if (!shareFeedback) return;
    const timeout = window.setTimeout(() => setShareFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [shareFeedback]);

  const selectTrip = (tripId: string) => {
    router.replace(`/itinerary?trip=${tripId}`, { scroll: false });
  };

  const startEntryEditing = (entry: (typeof orderedEntries)[number]) => {
    setEditingEntryId(entry.id);
    setEditingDayLabel(entry.dayLabel);
    setEditingTimeLabel(entry.timeLabel ?? "");
    setEditingNote(entry.note ?? "");
  };

  const cancelEntryEditing = () => {
    setEditingEntryId(null);
    setEditingDayLabel("");
    setEditingTimeLabel("");
    setEditingNote("");
  };

  const clearDragState = () => {
    setDraggedEntryId(null);
    setDragTargetId(null);
  };

  const saveEntryEditing = () => {
    if (!selectedItinerary || !editingEntryId || !editingDayLabel.trim()) return;
    updateItineraryEntry({
      itineraryId: selectedItinerary.id,
      entryId: editingEntryId,
      dayLabel: editingDayLabel,
      timeLabel: editingTimeLabel,
      note: editingNote,
    });
    cancelEntryEditing();
  };

  const createNewItinerary = () => {
    const nextId = createItinerary({
      title,
      description,
      countryCode: countryCode === "ALL" ? null : countryCode,
    });
    if (!nextId) return;
    setTitle("");
    setDescription("");
    router.replace(`/itinerary?trip=${nextId}`, { scroll: false });
  };

  const createAiItinerary = () => {
    if (!viewerId) {
      setAiMessage("Sign in first to save an AI-generated trip.");
      return;
    }

    startAiPlannerTransition(() => {
      const draft = buildAiItineraryDraft({
        prompt: aiPrompt,
        posts: plannerPosts,
        countryCode: countryCode === "ALL" ? null : countryCode,
        regionLabel: countryCode === "ALL" ? "All countries" : countryName,
        selectedTag: aiTagFilter,
        focusedCreatorName:
          aiScope === "following"
            ? "Following creators"
            : aiScope === "saved"
              ? "Saved places"
              : null,
        title: aiTitle,
      });

      if (draft.entries.length === 0) {
        setAiWarnings(draft.warnings);
        setAiMessage("The planner could not build a usable trip draft from this scope.");
        return;
      }

      const itineraryId = createItinerary({
        title: draft.title,
        description: draft.description,
        countryCode: countryCode === "ALL" ? null : countryCode,
      });

      if (!itineraryId) {
        setAiWarnings(draft.warnings);
        setAiMessage("The draft was generated, but the itinerary could not be saved.");
        return;
      }

      draft.entries.forEach((entry) => {
        addToItinerary({
          postId: entry.postId,
          itineraryId,
          dayLabel: entry.dayLabel,
          timeLabel: entry.timeLabel,
          note: entry.note,
          tags: entry.tags,
          countryCode: countryCode === "ALL" ? null : countryCode,
        });
      });

      setAiWarnings(draft.warnings);
      setAiMessage(`Created "${draft.title}" with ${draft.entries.length} AI-selected stops.`);
      setAiTitle("");
      setAiPrompt("");
      setAiTagFilter(null);
      router.replace(`/itinerary?trip=${itineraryId}`, { scroll: false });
    });
  };

  const copyShareLink = async (path: string | null, label: string) => {
    if (!path || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setShareFeedback(label);
    } catch {
      setShareFeedback("Copy failed.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className={cn(panelClass(), "p-5 sm:p-6")}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
            <Bookmark className="h-4 w-4" />
            Trips workspace
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-[2rem]">
                Plan with an ordered route, not with loose bookmarks.
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-[15px]">
                Keep the Followable planning layer practical: ordered stops, day-by-day structure, and a permanent map
                workspace that stays aligned with your current route. Current country: {countryName}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                {itineraries.length} trips
              </span>
              <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                {countryCode === "ALL" ? "All countries" : countryName}
              </span>
              <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                {plannerPosts.length} planner places
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[20px] border border-[color:var(--glass-border)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Ordered route
              </div>
              <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                Keep day labels, stop order, and pin numbering in sync.
              </div>
            </div>
            <div className="rounded-[20px] border border-[color:var(--glass-border)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Fast sharing
              </div>
              <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                Every itinerary can stay private, use a link, or become public.
              </div>
            </div>
            <div className="rounded-[20px] border border-[color:var(--glass-border)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Map-first
              </div>
              <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                Scroll the route, hover stops, and keep the map aligned.
              </div>
            </div>
          </div>
        </div>

        <aside className={cn(panelClass(), "p-4")}>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "manual", label: "Manual" },
              { value: "ai", label: "AI planner" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPlannerMode(option.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  plannerMode === option.value
                    ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                    : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!viewerId ? (
            <div className="mt-4 space-y-3 rounded-[24px] border border-[color:var(--glass-border)] bg-stone-50/70 p-4 dark:bg-white/5">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Sign in to create trips</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Trips are saved to your Followable session. After sign-in you can create a new itinerary here and add places from any post detail.
                </p>
              </div>
              <Link
                href="/sign-in?next=/itinerary"
                className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
              >
                Sign in to continue
              </Link>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Current UX problem was that the create button looked active, but unauthenticated users could not save anything.
              </p>
            </div>
          ) : plannerMode === "manual" ? (
            <div className="mt-4 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Create trip</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Start with a compact shell and keep filling it from the map or post detail.
                </p>
              </div>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Trip title"
                className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description (optional)"
                className="min-h-[88px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
              />
              <button
                type="button"
                onClick={createNewItinerary}
                disabled={!title.trim()}
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
              >
                Create itinerary
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Plan with AI</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Generate an editable route draft from your current country, your saved places, or creators you
                  already follow.
                </p>
              </div>

              <div className="space-y-2">
                {AI_SCOPE_OPTIONS.map((scope) => {
                  const Icon = scope.icon;
                  const count =
                    scope.value === "saved"
                      ? savedCountryPosts.length
                      : scope.value === "following"
                        ? followingCountryPosts.length
                        : countryPosts.length;

                  return (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() => {
                        setAiScope(scope.value);
                        setAiTagFilter(null);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                        aiScope === scope.value
                          ? "border-stone-400 bg-stone-50 dark:border-stone-500 dark:bg-stone-900/40"
                          : "border-[color:var(--glass-border)] hover:border-stone-400",
                      )}
                    >
                      <span className="mt-0.5 rounded-full border border-[color:var(--glass-border)] p-2">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[color:var(--foreground)]">{scope.label}</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">{count} places</span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-stone-600 dark:text-stone-400">
                          {scope.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={aiTitle}
                  onChange={(event) => setAiTitle(event.target.value)}
                  placeholder={`AI trip${countryCode === "ALL" ? "" : ` · ${countryName}`}`}
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
                <textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder="První den chci nakoupit, pak vyhlídku a večer vodu na přespání v karavanu..."
                  className="min-h-[120px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
                />
              </div>

              {plannerTagCounts.length > 0 ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                    Optional tag subset
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAiTagFilter(null)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        aiTagFilter == null
                          ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                          : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                      )}
                    >
                      All tags
                    </button>
                    {plannerTagCounts.map(([tag, count]) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setAiTagFilter(tag)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          aiTagFilter === tag
                            ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                            : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                        )}
                      >
                        #{tag} ({count})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  <span>Planner scope</span>
                  <span>{plannerPosts.length} eligible places</span>
                </div>
                <div className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                  {countryCode === "ALL" ? "All countries" : countryName}
                  {aiTagFilter ? ` · #${aiTagFilter}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {AI_PROMPT_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setAiPrompt(example)}
                    className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-400 dark:text-stone-300"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={createAiItinerary}
                disabled={!aiPrompt.trim() || plannerPosts.length === 0 || isAiPlannerPending}
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
              >
                {isAiPlannerPending ? "Planning..." : "Generate AI draft"}
              </button>
            </div>
          )}
        </aside>
      </section>

      {aiMessage ? (
        <div className={cn(panelClass(), "px-5 py-4 text-sm text-stone-700 dark:text-stone-200")}>
          {aiMessage}
        </div>
      ) : null}

      {aiWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
          {aiWarnings.join(" ")}
        </div>
      ) : null}

      {itineraries.length === 0 ? (
        <div className={cn(panelClass(), "px-6 py-12 text-center")}>
          <div className="text-lg font-semibold text-[color:var(--foreground)]">No itinerary yet.</div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            {viewerId
              ? "Open any location detail and use “Add to trip” to start planning Day 1, Day 2, and timed stops."
              : "Sign in first, then create your first trip here or open any location detail and use “Add to trip”."}
          </p>
          {!viewerId ? (
            <Link
              href="/sign-in?next=/itinerary"
              className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
            >
              Sign in to create a trip
            </Link>
          ) : null}
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
          <aside className={cn(panelClass(), "p-3.5")}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Your trips
              </div>
              <span className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:text-stone-300">
                {itineraries.length}
              </span>
            </div>
            <div className="workspace-scroll-shadow mt-3 max-h-[calc(100dvh-15rem)] space-y-2 overflow-y-auto pr-1">
              {itineraries.map((itinerary) => {
                const isActive = itinerary.id === selectedItinerary?.id;
                return (
                  <button
                    key={itinerary.id}
                    type="button"
                    onClick={() => selectTrip(itinerary.id)}
                    className={cn(
                      "w-full rounded-[22px] border px-3.5 py-3 text-left transition",
                      isActive
                        ? "border-stone-400 bg-white/60 dark:border-stone-500 dark:bg-white/10"
                        : "border-[color:var(--glass-border)] hover:border-stone-400",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--foreground)]">{itinerary.title}</div>
                        <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          Updated {formatRelativeDate(itinerary.updatedAt)}
                        </div>
                        {itinerary.description ? (
                          <div className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
                            {itinerary.description}
                          </div>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                        {itinerary.entries.length}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:text-stone-300">
                        {itinerary.shareMode}
                      </span>
                      {itinerary.shareMode === "public" ? <Globe2 className="h-4 w-4 text-stone-400" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className={cn(panelClass(), "min-w-0 p-4")}>
            {selectedItinerary ? (
              <>
                <div className="space-y-3 border-b border-[color:var(--glass-border)] pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold text-[color:var(--foreground)]">
                        {selectedItinerary.title}
                      </h2>
                      {selectedItinerary.description ? (
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
                          {selectedItinerary.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        Updated {formatRelativeDate(selectedItinerary.updatedAt)}
                      </p>
                    </div>
                    <Link
                      href="/"
                      className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
                    >
                      Add more places
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {dayLabels.length} days
                    </span>
                    <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {orderedRouteStops.length} stops
                    </span>
                    <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold capitalize text-stone-600 dark:text-stone-300">
                      {selectedItinerary.shareMode}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--glass-border)] px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: "route", label: "Route" },
                        { value: "stops", label: "Stops" },
                        { value: "notes", label: "Notes" },
                      ] as const).map((tab) => (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setActiveTripTab(tab.value)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            activeTripTab === tab.value
                              ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                              : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: "private", label: "Private", icon: Lock },
                        { value: "link", label: "Link", icon: Share2 },
                        { value: "public", label: "Public", icon: Globe2 },
                      ] as const).map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateItinerarySharing(selectedItinerary.id, option.value)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                              selectedItinerary.shareMode === option.value
                                ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                                : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyShareLink(internalSharePath, "Trip link copied.")}
                      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy trip link
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareLink(publicSharePath, "Public route link copied.")}
                      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200"
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      Copy public link
                    </button>
                    {publicSharePath ? (
                      <Link
                        href={publicSharePath}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-stone-950"
                      >
                        Open public route
                      </Link>
                    ) : null}
                  </div>
                  {shareFeedback ? (
                    <div className="text-xs text-stone-500 dark:text-stone-400">{shareFeedback}</div>
                  ) : null}
                </div>

                {activeTripTab === "route" ? (
                  <div className="workspace-scroll-shadow mt-4 max-h-[calc(100dvh-14rem)] space-y-4 overflow-y-auto pr-2">
                    {dayLabels.map((dayLabel) => (
                      <section key={dayLabel} className="rounded-[24px] border border-[color:var(--glass-border)] p-3">
                        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--glass-border)] pb-2">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                              {dayLabel}
                            </div>
                            <div className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                              Drag stops to reorder within the day.
                            </div>
                          </div>
                          <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                            {groupedRouteStops[dayLabel]?.length ?? 0} stops
                          </div>
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {draggedStop?.entry.dayLabel === dayLabel ? (
                            <button
                              type="button"
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setDragTargetId(`start:${dayLabel}`);
                              }}
                              onDragLeave={() => {
                                if (dragTargetId === `start:${dayLabel}`) setDragTargetId(null);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (!selectedItinerary || !draggedEntryId) {
                                  clearDragState();
                                  return;
                                }
                                moveItineraryEntryToDayEdge(selectedItinerary.id, draggedEntryId, dayLabel, "start");
                                clearDragState();
                              }}
                              className={cn(
                                "flex w-full items-center justify-center rounded-2xl border border-dashed px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                                dragTargetId === `start:${dayLabel}`
                                  ? "border-stone-950 bg-stone-50 text-stone-950 dark:border-white dark:bg-white/12 dark:text-white"
                                  : "border-[color:var(--glass-border)] text-stone-400 dark:text-stone-500",
                              )}
                            >
                              Drop at start of {dayLabel}
                            </button>
                          ) : null}
                          {groupedRouteStops[dayLabel]?.map((stop, index) => {
                            const globalIndex = orderedRouteStops.findIndex((entry) => entry.entry.id === stop.entry.id) + 1;
                            const isEditing = editingEntryId === stop.entry.id;
                            const previousStop = globalIndex > 1 ? orderedRouteStops[globalIndex - 2] : null;
                            const nextStop = globalIndex < orderedRouteStops.length ? orderedRouteStops[globalIndex] : null;
                            const canMoveUp = previousStop?.entry.dayLabel === stop.entry.dayLabel;
                            const canMoveDown = nextStop?.entry.dayLabel === stop.entry.dayLabel;
                            const isDragged = draggedEntryId === stop.entry.id;
                            const isDragTarget = dragTargetId === `entry:${stop.entry.id}` && draggedEntryId !== stop.entry.id;
                            return (
                              <div
                                key={stop.entry.id}
                                onDragOver={(event) => {
                                  if (!draggedEntryId || draggedEntryId === stop.entry.id) return;
                                  if (!draggedStop || draggedStop.entry.dayLabel !== stop.entry.dayLabel) return;
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                  setDragTargetId(`entry:${stop.entry.id}`);
                                }}
                                onDragLeave={() => {
                                  if (dragTargetId === `entry:${stop.entry.id}`) {
                                    setDragTargetId(null);
                                  }
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (!selectedItinerary || !draggedEntryId || draggedEntryId === stop.entry.id) {
                                    clearDragState();
                                    return;
                                  }
                                  reorderItineraryEntry(selectedItinerary.id, draggedEntryId, stop.entry.id);
                                  clearDragState();
                                }}
                                className={cn(
                                  "rounded-[22px] border p-3 transition",
                                  stop.post?.id === activeSelectedStopId
                                    ? "border-stone-400 bg-white/60 dark:border-stone-500 dark:bg-white/8"
                                    : "border-[color:var(--glass-border)]",
                                  isDragged && "opacity-55",
                                  isDragTarget && "border-stone-950 bg-stone-50/90 shadow-[0_12px_28px_rgba(27,24,19,0.08)] dark:border-white dark:bg-white/12",
                                )}
                                onMouseEnter={() => stop.post && setSelectedStopId(stop.post.id)}
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex shrink-0 items-center gap-2">
                                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-stone-950 text-sm font-semibold text-white dark:bg-white dark:text-stone-950">
                                        {globalIndex}
                                      </div>
                                      <button
                                        type="button"
                                        aria-label={`Drag stop ${globalIndex}`}
                                        draggable={!isEditing}
                                        onDragStart={(event) => {
                                          if (isEditing) {
                                            event.preventDefault();
                                            return;
                                          }
                                          event.dataTransfer.effectAllowed = "move";
                                          event.dataTransfer.setData("text/plain", stop.entry.id);
                                          setDraggedEntryId(stop.entry.id);
                                          setDragTargetId(null);
                                        }}
                                        onDragEnd={clearDragState}
                                        className={cn(
                                          "group inline-flex cursor-grab items-center gap-1 rounded-full border border-[color:var(--glass-border)] px-2 py-1 text-[11px] font-semibold text-stone-400 transition hover:border-stone-400 hover:text-stone-600 active:cursor-grabbing dark:text-stone-500 dark:hover:text-stone-300",
                                          isEditing && "pointer-events-none opacity-40",
                                        )}
                                      >
                                        <span className="grid grid-cols-2 gap-[2px]">
                                          {Array.from({ length: 6 }).map((_, dotIndex) => (
                                            <span
                                              key={dotIndex}
                                              className="h-[3px] w-[3px] rounded-full bg-current opacity-70"
                                            />
                                          ))}
                                        </span>
                                        <span>Move</span>
                                      </button>
                                    </div>
                                    <div className="min-w-0">
                                      {isEditing ? (
                                        <div className="space-y-2.5">
                                          <div className="grid gap-2 sm:grid-cols-[120px_120px_minmax(0,1fr)]">
                                            <input
                                              type="text"
                                              value={editingDayLabel}
                                              onChange={(event) => setEditingDayLabel(event.target.value)}
                                              placeholder="Day 1"
                                              className="h-9 rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-3 text-sm text-[color:var(--foreground)] outline-none"
                                            />
                                            <input
                                              type="text"
                                              value={editingTimeLabel}
                                              onChange={(event) => setEditingTimeLabel(event.target.value)}
                                              placeholder="09:30"
                                              className="h-9 rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-3 text-sm text-[color:var(--foreground)] outline-none"
                                            />
                                            <div className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 sm:flex sm:items-center sm:justify-end">
                                              inline route edit
                                            </div>
                                          </div>
                                          <textarea
                                            value={editingNote}
                                            onChange={(event) => setEditingNote(event.target.value)}
                                            placeholder="Why this stop belongs here"
                                            className="min-h-[74px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-3 py-2.5 text-sm leading-6 text-[color:var(--foreground)] outline-none"
                                          />
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              onClick={saveEntryEditing}
                                              disabled={!editingDayLabel.trim()}
                                              className="rounded-full bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={cancelEntryEditing}
                                              className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                                              {stop.entry.dayLabel}
                                            </div>
                                            <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-0.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                                              {stop.entry.timeLabel || `Stop ${index + 1}`}
                                            </span>
                                          </div>
                                          {stop.entry.note ? (
                                            <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">
                                              {stop.entry.note}
                                            </p>
                                          ) : null}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => moveItineraryEntry(selectedItinerary.id, stop.entry.id, "up")}
                                      disabled={!canMoveUp || isEditing}
                                      className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-35 dark:text-stone-300"
                                    >
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveItineraryEntry(selectedItinerary.id, stop.entry.id, "down")}
                                      disabled={!canMoveDown || isEditing}
                                      className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-35 dark:text-stone-300"
                                    >
                                      Down
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => (isEditing ? cancelEntryEditing() : startEntryEditing(stop.entry))}
                                      className={cn(
                                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                        isEditing
                                          ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                                          : "border border-[color:var(--glass-border)] text-stone-600 dark:text-stone-300",
                                      )}
                                    >
                                      {isEditing ? "Editing" : "Edit"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeItineraryEntry(selectedItinerary.id, stop.entry.id)}
                                      className="rounded-full border border-rose-200 p-1.5 text-rose-700"
                                      aria-label="Remove itinerary stop"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {stop.post ? (
                                  <PostCard
                                    post={stop.post}
                                    compact
                                    highlighted={stop.post.id === activeSelectedStopId}
                                    numberedIndex={globalIndex}
                                    href={`/post/${stop.post.id}`}
                                  />
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-6 text-sm text-stone-500 dark:text-stone-400">
                                    Post no longer available.
                                  </div>
                                )}
                                {stop.entry.tags.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {stop.entry.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-medium text-stone-600 dark:text-stone-300"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          {draggedStop?.entry.dayLabel === dayLabel ? (
                            <button
                              type="button"
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setDragTargetId(`end:${dayLabel}`);
                              }}
                              onDragLeave={() => {
                                if (dragTargetId === `end:${dayLabel}`) setDragTargetId(null);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (!selectedItinerary || !draggedEntryId) {
                                  clearDragState();
                                  return;
                                }
                                moveItineraryEntryToDayEdge(selectedItinerary.id, draggedEntryId, dayLabel, "end");
                                clearDragState();
                              }}
                              className={cn(
                                "flex w-full items-center justify-center rounded-2xl border border-dashed px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                                dragTargetId === `end:${dayLabel}`
                                  ? "border-stone-950 bg-stone-50 text-stone-950 dark:border-white dark:bg-white/12 dark:text-white"
                                  : "border-[color:var(--glass-border)] text-stone-400 dark:text-stone-500",
                              )}
                            >
                              Drop at end of {dayLabel}
                            </button>
                          ) : null}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : null}

                {activeTripTab === "stops" ? (
                  <div className="workspace-scroll-shadow mt-4 max-h-[calc(100dvh-14rem)] space-y-2.5 overflow-y-auto pr-2">
                    {orderedRouteStops.map((stop, index) =>
                      stop.post ? (
                        <div key={stop.entry.id} onMouseEnter={() => setSelectedStopId(stop.post!.id)}>
                          <PostCard
                            post={stop.post}
                            compact
                            highlighted={stop.post.id === activeSelectedStopId}
                            numberedIndex={index + 1}
                            href={`/post/${stop.post.id}`}
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : null}

                {activeTripTab === "notes" ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[color:var(--glass-border)] p-4">
                      <div className="text-sm font-semibold text-[color:var(--foreground)]">Day structure</div>
                      <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                        {dayLabels.map((dayLabel) => (
                          <div key={dayLabel} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--glass-border)] px-3 py-2">
                            <span>{dayLabel}</span>
                            <span className="text-xs text-stone-500 dark:text-stone-400">
                              {groupedRouteStops[dayLabel]?.length ?? 0} stops
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--glass-border)] p-4">
                      <div className="text-sm font-semibold text-[color:var(--foreground)]">Practical notes</div>
                      <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                        <div>Use day labels to keep the route human-readable before you optimize it.</div>
                        <div>Add short notes for parking, weather fallback, food timing, or overnight constraints.</div>
                        <div>Keep tags functional: `sunset`, `backup`, `coffee`, `van`, `family`, `rainy-day`.</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <aside className={cn(panelClass(), "flex min-h-0 flex-col p-3.5")}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  Route map
                </div>
                <div className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                  {selectedItinerary?.title ?? "Current trip"}
                </div>
              </div>
              <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
                {orderedRouteStops.length} numbered pins
              </span>
            </div>
            <div className="mt-3 min-h-[300px] flex-1 overflow-hidden rounded-[22px]">
              <MapView
                posts={orderedRouteStops.flatMap((stop) => (stop.post ? [stop.post] : []))}
                selectedPostId={activeSelectedStopId}
                onSelectPost={setSelectedStopId}
                markerMode="numbered"
                orderedPostIds={orderedRouteStops.map((stop) => stop.post?.id).filter(Boolean) as string[]}
                clusterPosts={false}
                showPostOverlay={false}
                className="h-[420px] min-h-[420px] rounded-[24px] border-0 shadow-none"
              />
            </div>
            <div className="mt-3 rounded-[22px] border border-[color:var(--glass-border)] p-3.5">
              <div className="text-sm font-semibold text-[color:var(--foreground)]">Active stop</div>
              {selectedStop?.post ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-[color:var(--glass-border)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                      {selectedStop.entry.dayLabel}
                      {selectedStop.entry.timeLabel ? ` · ${selectedStop.entry.timeLabel}` : ""}
                    </div>
                    <div className="mt-1 text-base font-semibold text-[color:var(--foreground)]">
                      {selectedStop.post.post.title}
                    </div>
                    <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                      {selectedStop.post.locationSummary}
                    </div>
                  </div>
                  <Link
                    href={`/post/${selectedStop.post.id}`}
                    className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
                  >
                    Open place detail
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                  Hover a stop or click a pin to keep the route and the map in sync.
                </p>
              )}
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
