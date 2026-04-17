"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Bookmark, Copy, Share2, Users, X } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { getTravelGroupSummaries } from "@/lib/travel-groups";
import type { HydratedPost } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostShareDialog({
  open,
  post,
  onClose,
}: {
  open: boolean;
  post: HydratedPost | null;
  onClose: () => void;
}) {
  const { viewerId, snapshot, hydratedPosts, localState, toggleSave, addToItinerary, sharePostToTravelGroup } = useDemoStore();
  const [isMounted, setIsMounted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const allGroups = useMemo(() => getTravelGroupSummaries(snapshot, hydratedPosts, localState), [snapshot, hydratedPosts, localState]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const isSaved = Boolean(post && localState.savedPostIds.includes(post.id));
  const itineraries = localState.itineraries ?? [];
  const editableGroups = useMemo(() => {
    if (!viewerId) return [];
    return allGroups.filter(
      (group) =>
        group.isUserCreated &&
        (group.owner.id === viewerId || localState.joinedGroupSlugs.includes(group.slug)),
    );
  }, [allGroups, localState.joinedGroupSlugs, viewerId]);

  const suggestedGroups = useMemo(() => {
    if (!post) return [];
    const postCountry = (post.location.country ?? "").toUpperCase();
    return allGroups
      .filter((group) => {
        const countryMatch =
          !postCountry || group.countryCodes.length === 0 || group.countryCodes.some((code) => code.toUpperCase() === postCountry);
        const topicMatch = post.topic ? group.topics.some((topic) => topic.slug === post.topic?.slug) : false;
        const tagMatch = post.tags.some((tag) => group.searchTags.some((searchTag) => searchTag.toLowerCase() === tag.toLowerCase()));
        return countryMatch && (topicMatch || tagMatch);
      })
      .slice(0, 4);
  }, [allGroups, post]);

  if (!open || !post || !isMounted) return null;

  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : `/post/${post.id}`;
  const shareText = `${post.post.title}\n${post.locationSummary}\n${postUrl}`;

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(message);
    } catch {
      setFeedback("Copy failed.");
    }
  };

  const handleSave = async () => {
    if (!viewerId) return;
    setBusyAction("save");
    try {
      await toggleSave(post.id);
      setFeedback(isSaved ? "Removed from saved places." : "Saved for later.");
    } finally {
      setBusyAction(null);
    }
  };

  const addToTrip = (itineraryId?: string) => {
    if (!viewerId) return;
    const targetId = addToItinerary({
      postId: post.id,
      itineraryId: itineraryId ?? "__new__",
      createTitle: itineraryId ? null : `Trip from ${post.location.city || post.location.region || "Followable"}`,
      countryCode: post.location.country ?? null,
      dayLabel: "Day 1",
      note: `Added from the share panel for ${post.post.title}.`,
      tags: post.tags.slice(0, 3),
    });
    if (!targetId) {
      setFeedback("Trip action failed.");
      return;
    }
    const title =
      itineraries.find((itinerary) => itinerary.id === targetId)?.title ??
      itineraries.find((itinerary) => itinerary.id === itineraryId)?.title ??
      "new trip";
    setFeedback(`Added to ${title}.`);
  };

  const shareToGroup = (groupSlug: string) => {
    const ok = sharePostToTravelGroup(groupSlug, post.id);
    if (!ok) {
      setFeedback("Group share failed.");
      return;
    }
    const groupName = editableGroups.find((group) => group.slug === groupSlug)?.name ?? "group";
    setFeedback(`Shared into ${groupName}.`);
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/55 backdrop-blur-sm"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer"
        aria-label="Close share dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(18,16,12,0.22)] dark:border-stone-700 dark:bg-stone-950"
      >
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
              Share
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-950 dark:text-stone-100">{post.post.title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
            <section className="space-y-4 rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Share-ready text</div>
                <p className="mt-2 rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
                  {post.post.title}
                  <br />
                  {post.locationSummary}
                  <br />
                  {postUrl}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(postUrl, "Link copied.")}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(shareText, "Recommendation copied.")}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
                >
                  <Share2 className="h-4 w-4" />
                  Copy recommendation
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!viewerId || busyAction === "save"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    isSaved
                      ? "border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950"
                      : "border-[color:var(--glass-border)] text-stone-700 dark:text-stone-200",
                  )}
                >
                  <Bookmark className="h-4 w-4" />
                  {isSaved ? "Saved" : "Save place"}
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Send into a trip</div>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  Add this place straight into a route draft without leaving the share flow.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addToTrip()}
                    disabled={!viewerId}
                    className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-950"
                  >
                    New trip draft
                  </button>
                  {itineraries.map((itinerary) => (
                    <button
                      key={itinerary.id}
                      type="button"
                      onClick={() => addToTrip(itinerary.id)}
                      disabled={!viewerId}
                      className="rounded-full border border-[color:var(--glass-border)] px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-60 dark:text-stone-200"
                    >
                      {itinerary.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  <Users className="h-4 w-4" />
                  Share to your groups
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  User-created groups can take this post directly into their feed via the existing featured-post model.
                </p>
                {editableGroups.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
                    No editable user-created groups yet. Create one first, then use this panel to push posts into it.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {editableGroups.slice(0, 4).map((group) => (
                      <div
                        key={group.slug}
                        className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                              {group.name}
                            </div>
                            <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                              {group.memberCount} members · {group.postCount} posts
                            </div>
                          </div>
                          <Link
                            href={`/groups/${group.slug}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
                          >
                            Open
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                          {group.shortDescription}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => shareToGroup(group.slug)}
                            className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-stone-950"
                          >
                            <Users className="h-3.5 w-3.5" />
                            Share to group
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void copyText(
                                `Possible fit for ${group.name}: ${post.post.title}\n${post.locationSummary}\n${postUrl}`,
                                `Copied note for ${group.name}.`,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy note
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  <Users className="h-4 w-4" />
                  Matching groups
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  These are still useful as context suggestions when you want to recommend a place into the right niche.
                </p>
                {suggestedGroups.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
                    No obvious group match yet. Browse all communities and pick the right angle manually.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {suggestedGroups.map((group) => (
                      <div key={group.slug} className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                              {group.name}
                            </div>
                            <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                              {group.memberCount} members · {group.postCount} posts
                            </div>
                          </div>
                          <Link
                            href={`/groups/${group.slug}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
                          >
                            Open
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{group.shortDescription}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {feedback ? (
          <div className="border-t border-stone-200/80 px-5 py-3 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300">
            {feedback}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
