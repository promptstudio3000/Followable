"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useMemo, useState } from "react";
import { MapView } from "@/components/map-view";
import { PostDetailDialog } from "@/components/post-detail-dialog";
import { PostCard } from "@/components/post-card";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { WalletPurchaseControls } from "@/components/wallet-purchase-controls";
import {
  creatorSubscriptionLabel,
  getCreatorByUsername,
  getCreatorPosts,
  getCreatorStats,
} from "@/lib/discovery";
import { cn } from "@/lib/utils";

export function CreatorProfileView({ username }: { username: string }) {
  const { snapshot, viewerId, toggleFollow, toggleSubscription, localState, featureModes } = useDemoStore();
  const creator = useMemo(() => getCreatorByUsername(snapshot, username), [snapshot, username]);
  const [dialogPostId, setDialogPostId] = useState<string | null>(null);

  if (!creator) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-10 text-center text-stone-500 backdrop-blur-md dark:text-stone-400">
        Tvůrce nenalezen.
      </div>
    );
  }

  const posts = getCreatorPosts(snapshot, viewerId, creator.id);
  const collections = snapshot.collections.filter((collection) => collection.ownerId === creator.id);
  const stats = getCreatorStats(snapshot, creator.id);
  const isFollowing = viewerId ? snapshot.follows.some((follow) => follow.followerId === viewerId && follow.followedUserId === creator.id) : false;
  const isSubscribed = localState.subscriptionCreatorIds.includes(creator.id);
  const focusTopics = creator.focusTopicSlugs
    .map((slug) => snapshot.topics.find((entry) => entry.slug === slug))
    .filter(Boolean);
  const visibleTopics = focusTopics.slice(0, 3);
  const extraTopics = focusTopics.length - visibleTopics.length;

  const openPost = (postId: string) => setDialogPostId(postId);

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] shadow-sm backdrop-blur-md">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[150px] lg:h-[170px]">
            <MapView posts={posts.slice(0, 30)} className="h-full rounded-none border-0" />
          </div>
          <div className="p-3">
            <div className="flex items-center gap-3">
              <Avatar
                src={creator.avatarUrl}
                alt={creator.displayName}
                displayName={creator.displayName}
                size="lg"
                className="h-14 w-14 rounded-2xl"
              />
              <div>
                <div className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[color:var(--foreground)]">
                  {creator.displayName}
                </div>
                <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">@{creator.username}</div>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-stone-600 dark:text-stone-400">{creator.bio}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-stone-500 dark:text-stone-400">
              <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-1">
                {stats.followerCount} followers
              </span>
              <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-1">
                {stats.postCount} posts
              </span>
              <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-1">
                {stats.collectionCount} collections
              </span>
              {creator.homeRegion ? (
                <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-1">
                  {creator.homeRegion}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleTopics.map((topic) =>
                topic ? (
                  <Link
                    key={topic.slug}
                    href={`/topics/${topic.slug}`}
                    className="rounded-full border border-stone-200 px-2 py-1 text-[11px] text-stone-700 transition hover:border-stone-900"
                  >
                    {topic.name}
                  </Link>
                ) : null,
              )}
              {extraTopics > 0 ? (
                <span className="rounded-full border border-dashed border-stone-200 px-2 py-1 text-[11px] text-stone-400">
                  +{extraTopics}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {viewerId && viewerId !== creator.id ? (
                <button
                  type="button"
                  onClick={() => void toggleFollow(creator.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    isFollowing ? "bg-stone-950 text-white" : "border border-stone-200 text-stone-700 hover:border-stone-400",
                  )}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              ) : null}
              <Link
                href={`/creator/${creator.username}`}
                className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-400 dark:text-stone-200"
              >
                Full page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Recent posts</div>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[color:var(--foreground)]">
            Channel feed
          </h2>
          <div className="mt-4 grid gap-3">
            {posts.slice(0, 8).map((post) => (
              <PostCard key={post.id} post={post} compact onOpen={openPost} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Collections</div>
            <div className="mt-3 grid gap-3">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="rounded-2xl border border-stone-200 p-3 transition hover:border-stone-900 hover:bg-stone-50"
                >
                  <div className="font-medium text-stone-900">{collection.title}</div>
                  <div className="mt-1 text-xs leading-5 text-stone-600">{collection.description}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Support me</div>
            <div className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--foreground)]">
              Unlock paid access
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              Subscriptions unlock exact locations and private notes.
            </p>
            {creatorSubscriptionLabel(snapshot, creator.id) ? (
              <div className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                {creatorSubscriptionLabel(snapshot, creator.id)}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {viewerId && viewerId !== creator.id ? (
                isSubscribed ? (
                  <div className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950">
                    Subscribed
                  </div>
                ) : featureModes.appMode === "database" && featureModes.walletPaymentsEnabled ? (
                  <WalletPurchaseControls targetType="subscription" creatorId={creator.id} />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSubscription(creator.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      isSubscribed ? "bg-amber-100 text-amber-950" : "border border-amber-200 text-amber-900 hover:border-amber-400",
                    )}
                  >
                    {isSubscribed ? "Subscribed in demo" : creatorSubscriptionLabel(snapshot, creator.id) || "Subscribe"}
                  </button>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <PostDetailDialog postId={dialogPostId} onClose={() => setDialogPostId(null)} />
    </div>
  );
}
