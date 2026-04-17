"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapView } from "@/components/map-view";
import { PostCard } from "@/components/post-card";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { getCollectionBySlug, getCollectionItems, hydratePosts } from "@/lib/discovery";
import type { HydratedPost } from "@/lib/types";

export function CollectionView({ slug }: { slug: string }) {
  const { snapshot, viewerId } = useDemoStore();
  const [sortOrder, setSortOrder] = useState<"default" | "newest">("newest");
  const [addPostInput, setAddPostInput] = useState("");
  const [addedPostIds, setAddedPostIds] = useState<string[]>([]);

  const collection = useMemo(() => getCollectionBySlug(snapshot, slug), [slug, snapshot]);

  if (!collection) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-10 text-center text-stone-500 backdrop-blur-md dark:text-stone-400">
        Kolekce nenalezena.
      </div>
    );
  }

  const items = getCollectionItems(snapshot, viewerId, collection.id);
  const hydratedAll = useMemo(() => hydratePosts(snapshot, viewerId), [snapshot, viewerId]);
  const addedPosts = useMemo(
    () =>
      addedPostIds
        .map((id) => hydratedAll.find((p) => p.id === id))
        .filter(Boolean) as HydratedPost[],
    [addedPostIds, hydratedAll],
  );
  const allPosts = useMemo(() => {
    const combined = [...items.posts, ...addedPosts];
    return sortOrder === "newest"
      ? combined.sort(
          (a, b) =>
            new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime(),
        )
      : combined;
  }, [items.posts, addedPosts, sortOrder]);

  const topic = collection.topicId ? snapshot.topics.find((entry) => entry.id === collection.topicId) : null;
  const owner = snapshot.users.find((user) => user.id === collection.ownerId);

  const handleAddPost = () => {
    const raw = addPostInput.trim();
    if (!raw) return;
    let postId: string | null = null;
    const postSlugMatch = raw.match(/\/post\/([^/?#]+)/);
    if (postSlugMatch) postId = postSlugMatch[1];
    else if (snapshot.posts.some((p) => p.id === raw)) postId = raw;
    if (postId && !allPosts.some((p) => p.id === postId)) {
      setAddedPostIds((prev) => [...prev, postId!]);
      setAddPostInput("");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-500 dark:text-stone-400">
          <span>Kolekce</span>
          {topic ? (
            <span className="rounded-full bg-stone-200/80 px-3 py-1 text-xs font-semibold text-stone-800 dark:bg-stone-700 dark:text-stone-200">
              {topic.name}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[color:var(--foreground)]">
          {collection.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-stone-400">{collection.description}</p>
        {owner ? (
          <Link
            href={`/creator/${owner.username}`}
            className="mt-4 inline-flex rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-stone-400 dark:hover:border-stone-500"
          >
            Kurátor: {owner.displayName}
          </Link>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--glass-border)]">
          <MapView posts={allPosts} className="min-h-[360px] h-[420px] md:h-[520px]" />
        </div>
        <div className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md sm:p-5">
          <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Související tvůrci</div>
          <div className="mt-4 grid gap-3">
            {items.users.map((user) => (
              <Link
                key={user.id}
                href={`/creator/${user.username}`}
                className="rounded-xl border border-[color:var(--glass-border)] p-4 transition hover:border-stone-400 dark:hover:border-stone-500"
              >
                <div className="font-medium text-[color:var(--foreground)]">{user.displayName}</div>
                <div className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{user.bio}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Příspěvky v kolekci</div>
          <div className="flex items-center gap-2">
            <label htmlFor="collection-sort" className="text-xs text-stone-500 dark:text-stone-400">
              Řazení:
            </label>
            <select
              id="collection-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "default" | "newest")}
              className="rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-1.5 text-sm text-[color:var(--foreground)]"
            >
              <option value="newest">Newest first</option>
              <option value="default">Default order</option>
            </select>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            type="text"
            value={addPostInput}
            onChange={(e) => setAddPostInput(e.target.value)}
            placeholder="Post URL or ID"
            className="min-w-[200px] rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-stone-400"
          />
          <button
            type="button"
            onClick={handleAddPost}
            className="rounded-full border-2 border-stone-900 bg-white px-4 py-2 text-sm font-semibold text-stone-950 shadow-sm transition hover:bg-stone-50"
          >
            Přidat do kolekce
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {allPosts.map((post) => (
            <PostCard key={post.id} post={post} compact href={`/post/${post.id}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
