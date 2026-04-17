"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Avatar } from "@/components/avatar";
import { PostDetailView } from "@/components/post-detail-view";
import { PostCard } from "@/components/post-card";
import { Bookmark, Heart, Sparkles, Star, Users } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { creatorSubscriptionLabel, getCreatorStats, topCreators } from "@/lib/discovery";
import type { HydratedPost } from "@/lib/types";
import { cn } from "@/lib/utils";

type FollowingTab = "following" | "for-you" | "trending";

const FOLLOWING_TABS: Array<{ value: FollowingTab; label: string; description: string }> = [
  { value: "following", label: "Following", description: "Newest places from creators you already trust." },
  { value: "for-you", label: "For you", description: "A personalized mix boosted by your follows, saves, and recency." },
  { value: "trending", label: "Trending", description: "High-signal places rising across the network right now." },
];

function panelClass() {
  return "rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur-md";
}

function parseTab(value: string | null): FollowingTab {
  return value === "for-you" || value === "trending" ? value : "following";
}

function scoreForYou(input: {
  post: HydratedPost;
  followedCreators: Set<string>;
  subscribedCreators: Set<string>;
  savedPostIds: Set<string>;
  preferredTags: Set<string>;
  preferredTopics: Set<string>;
}) {
  const { post, followedCreators, subscribedCreators, savedPostIds, preferredTags, preferredTopics } = input;
  const followBoost = followedCreators.has(post.author.id) ? 90 : 0;
  const subscriptionBoost = subscribedCreators.has(post.author.id) ? 75 : 0;
  const savedBoost = savedPostIds.has(post.id) ? 55 : 0;
  const topicBoost = post.topic?.slug && preferredTopics.has(post.topic.slug) ? 40 : 0;
  const tagBoost = post.tags.some((tag) => preferredTags.has(tag.toLowerCase())) ? 30 : 0;
  const freshnessBoost = Math.max(
    0,
    24 - Math.min(24, (Date.now() - new Date(post.post.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  );

  return followBoost + subscriptionBoost + savedBoost + topicBoost + tagBoost + freshnessBoost + post.popularityScore / 8;
}

function scoreTrending(post: HydratedPost) {
  const freshness = Math.max(
    0,
    18 - Math.min(18, (Date.now() - new Date(post.post.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  );
  return post.popularityScore + freshness + post.engagementCount * 1.5;
}

export function FollowingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot, viewerId, hydratedPosts, localState, toggleFollow } = useDemoStore();

  const activeTab = parseTab(searchParams.get("tab"));
  const selectedPostId = searchParams.get("post");

  const followedCreatorIds = useMemo(
    () =>
      new Set(
        snapshot.follows
          .filter((follow) => follow.followerId === viewerId)
          .map((follow) => follow.followedUserId),
      ),
    [snapshot.follows, viewerId],
  );

  const activePosts = useMemo(
    () => hydratedPosts.filter((post) => post.isActive),
    [hydratedPosts],
  );

  const followedPosts = useMemo(
    () =>
      [...activePosts]
        .filter((post) => followedCreatorIds.has(post.author.id))
        .sort((left, right) => new Date(right.post.createdAt).getTime() - new Date(left.post.createdAt).getTime()),
    [activePosts, followedCreatorIds],
  );

  const personalizedPosts = useMemo(() => {
    const subscribedCreators = new Set(localState.subscriptionCreatorIds);
    const savedPostIds = new Set(localState.savedPostIds);
    const savedPosts = hydratedPosts.filter((post) => savedPostIds.has(post.id));
    const preferredTags = new Set(savedPosts.flatMap((post) => post.tags.map((tag) => tag.toLowerCase())));
    const preferredTopics = new Set(savedPosts.map((post) => post.topic?.slug).filter(Boolean) as string[]);

    return [...activePosts].sort((left, right) => {
      return (
        scoreForYou({
          post: right,
          followedCreators: followedCreatorIds,
          subscribedCreators,
          savedPostIds,
          preferredTags,
          preferredTopics,
        }) -
        scoreForYou({
          post: left,
          followedCreators: followedCreatorIds,
          subscribedCreators,
          savedPostIds,
          preferredTags,
          preferredTopics,
        })
      );
    });
  }, [activePosts, followedCreatorIds, hydratedPosts, localState.savedPostIds, localState.subscriptionCreatorIds]);

  const trendingPosts = useMemo(
    () => [...activePosts].sort((left, right) => scoreTrending(right) - scoreTrending(left)),
    [activePosts],
  );

  const feedPosts = useMemo(() => {
    if (activeTab === "following") return followedPosts;
    if (activeTab === "trending") return trendingPosts;
    return personalizedPosts;
  }, [activeTab, followedPosts, personalizedPosts, trendingPosts]);

  const selectedPost = useMemo(
    () => feedPosts.find((post) => post.id === selectedPostId) ?? null,
    [feedPosts, selectedPostId],
  );

  const suggestedCreators = useMemo(
    () =>
      topCreators(snapshot)
        .filter((creator) => creator.id !== viewerId && !followedCreatorIds.has(creator.id))
        .slice(0, 6),
    [followedCreatorIds, snapshot, viewerId],
  );

  const setRouteState = useCallback(
    (next: { tab?: FollowingTab; postId?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      const tab = next.tab ?? activeTab;

      params.set("tab", tab);
      if (next.postId) params.set("post", next.postId);
      else params.delete("post");

      router.replace(`/following?${params.toString()}`, { scroll: false });
    },
    [activeTab, router, searchParams],
  );

  const handleOpenPost = useCallback(
    (postId: string) => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        router.push(`/post/${postId}`);
        return;
      }

      setRouteState({ postId });
    },
    [router, setRouteState],
  );

  const followingCount = followedCreatorIds.size;
  const followedPostCount = followedPosts.length;
  const tabMeta = FOLLOWING_TABS.find((tab) => tab.value === activeTab) ?? FOLLOWING_TABS[0];

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-6 pb-8">
      <section className={cn(panelClass(), "overflow-hidden p-6 sm:p-7")}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
              <Heart className="h-4 w-4" />
              Trusted timeline
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
              Keep the feed fast, social, and still grounded in place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400 sm:text-base">
              Followable&apos;s returning-user surface should feel closer to a great social timeline: clear tabs,
              stable scroll position, and detail that opens without breaking the browsing loop.
            </p>
          </div>

          <div className="grid min-w-[240px] gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-[color:var(--glass-border)] bg-white/50 px-4 py-3 dark:bg-white/5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Following
              </div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">{followingCount}</div>
            </div>
            <div className="rounded-3xl border border-[color:var(--glass-border)] bg-white/50 px-4 py-3 dark:bg-white/5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Feed posts
              </div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">{followedPostCount}</div>
            </div>
            <div className="rounded-3xl border border-[color:var(--glass-border)] bg-white/50 px-4 py-3 dark:bg-white/5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Current mode
              </div>
              <div className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">{tabMeta.label}</div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "grid gap-6",
          selectedPost ? "lg:grid-cols-[minmax(0,0.88fr)_minmax(380px,0.92fr)]" : "lg:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <div className={cn(panelClass(), "min-w-0 p-4 sm:p-5")}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--glass-border)] pb-4">
            <div>
              <div className="text-xl font-semibold text-[color:var(--foreground)]">Feed</div>
              <p className="mt-1 max-w-xl text-sm text-stone-600 dark:text-stone-400">{tabMeta.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FOLLOWING_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setRouteState({ tab: tab.value, postId: null })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    activeTab === tab.value
                      ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                      : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {viewerId && suggestedCreators.length > 0 && feedPosts.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-[color:var(--glass-border)] pb-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                Add more signal
              </span>
              {suggestedCreators.slice(0, 3).map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => void toggleFollow(creator.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-400 dark:text-stone-200"
                >
                  <Avatar
                    src={creator.avatarUrl}
                    alt=""
                    displayName={creator.displayName}
                    size="sm"
                    className="h-5 w-5 shrink-0"
                  />
                  {creator.displayName}
                </button>
              ))}
            </div>
          ) : null}

          {!viewerId ? (
            <div className="mt-5 rounded-3xl border border-dashed border-[color:var(--glass-border)] px-6 py-12 text-center">
              <div className="text-lg font-semibold text-[color:var(--foreground)]">Sign in to activate Following.</div>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                The feed works best when it can connect trusted creators, saved places, and premium access into one
                returning-user stream.
              </p>
              <Link
                href="/sign-in"
                className="mt-5 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
              >
                Sign in
              </Link>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-3xl border border-dashed border-[color:var(--glass-border)] px-6 py-10">
                <div className="text-lg font-semibold text-[color:var(--foreground)]">Your following feed is empty.</div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Follow a few creators first and this surface becomes your high-trust travel stream. Once it is live,
                  the next roadmap step is the desktop split view you asked for: cards stay visible while place detail
                  opens to the side.
                </p>
              </div>

              {suggestedCreators.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {suggestedCreators.map((creator) => {
                    const stats = getCreatorStats(snapshot, creator.id);
                    return (
                      <article
                        key={creator.id}
                        className="rounded-3xl border border-[color:var(--glass-border)] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            src={creator.avatarUrl}
                            alt=""
                            displayName={creator.displayName}
                            size="sm"
                            className="h-11 w-11 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                              {creator.displayName}
                            </div>
                            <div className="truncate text-xs text-stone-500">@{creator.username}</div>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600 dark:text-stone-400">
                              {creator.bio}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                          <span>{stats.followerCount} followers</span>
                          <span>·</span>
                          <span>{stats.postCount} posts</span>
                          {creatorSubscriptionLabel(snapshot, creator.id) ? (
                            <>
                              <span>·</span>
                              <span>{creatorSubscriptionLabel(snapshot, creator.id)}</span>
                            </>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleFollow(creator.id)}
                          className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
                        >
                          Follow
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="workspace-scroll-shadow mt-5 space-y-4 lg:max-h-[calc(100dvh-16rem)] lg:overflow-y-auto lg:pr-2">
              {feedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  highlighted={selectedPostId === post.id}
                  onOpen={handleOpenPost}
                  className={cn(
                    "w-full",
                    selectedPostId === post.id && "ring-2 ring-stone-300/70 dark:ring-stone-600/70",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {selectedPost ? (
          <aside className={cn(panelClass(), "hidden min-w-0 lg:flex lg:max-h-[calc(100dvh-9rem)] lg:flex-col lg:overflow-hidden")}>
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--glass-border)] px-5 py-4">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-[color:var(--foreground)]">
                  {selectedPost.post.title}
                </div>
                <div className="truncate text-sm text-stone-500 dark:text-stone-400">{selectedPost.locationSummary}</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/post/${selectedPost.id}`}
                  className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
                >
                  Open page
                </Link>
                <button
                  type="button"
                  onClick={() => setRouteState({ postId: null })}
                  className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <PostDetailView postId={selectedPost.id} variant="dialog" />
            </div>
          </aside>
        ) : (
          <aside className={cn(panelClass(), "hidden p-5 lg:block")}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              <Sparkles className="h-3.5 w-3.5" />
              Split view
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[color:var(--foreground)]">
              Open a card and keep the list visible.
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
              This screen is the first implementation step from the roadmap: desktop retains the feed context while the
              place detail opens on the same page. Mobile still uses the full detail route for simpler navigation.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                  <Users className="h-4 w-4" />
                  Following
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Most trustworthy stream. Best when you already know which creators improve your trips.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                  <Star className="h-4 w-4" />
                  For you
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Mixes follows, saves, topic affinity, and recency to build a softer recommendation stream.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                  <Bookmark className="h-4 w-4" />
                  Next step
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Once this feed is stable, the next roadmap move is to connect it more tightly with trip planning and
                  AI itinerary generation.
                </p>
              </div>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}
