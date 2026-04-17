"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MapView } from "@/components/map-view";
import { PostCard } from "@/components/post-card";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { filterPosts, getRegionHighlights, getTopicBySlug, hydratePosts } from "@/lib/discovery";

export function TopicView({ slug }: { slug: string }) {
  const { snapshot, viewerId } = useDemoStore();
  const topic = useMemo(() => getTopicBySlug(snapshot, slug), [slug, snapshot]);

  if (!topic) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-10 text-center text-stone-500 backdrop-blur-md dark:text-stone-400">
        Téma nenalezeno.
      </div>
    );
  }

  const posts = filterPosts(snapshot, hydratePosts(snapshot, viewerId), viewerId, {
    mode: "topic",
    sortBy: "popular",
    topicSlug: topic.slug,
    activeOnly: true,
    visibility: "all",
  });
  const creators = getRegionHighlights(snapshot, viewerId, null).creators.filter((creator) =>
    creator.focusTopicSlugs.includes(topic.slug),
  );

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-6 shadow-sm backdrop-blur-md">
        <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Téma</div>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[color:var(--foreground)]">
          {topic.name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-stone-400">
          {topic.description}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--glass-border)]">
          <MapView posts={posts.slice(0, 24)} className="min-h-[360px] h-[420px] md:h-[520px]" />
        </div>
        <div className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 shadow-sm backdrop-blur-md">
          <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Doporučení tvůrci</div>
          <div className="mt-4 grid gap-3">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.username}`}
                className="rounded-xl border border-[color:var(--glass-border)] p-4 transition hover:border-stone-400 dark:hover:border-stone-500"
              >
                <div className="font-medium text-[color:var(--foreground)]">{creator.displayName}</div>
                <div className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{creator.bio}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Příspěvky v tématu</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} compact href={`/post/${post.id}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
