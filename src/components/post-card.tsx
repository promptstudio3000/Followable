"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, type SyntheticEvent, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Bookmark, Heart, ImageOff, Lock, MessageSquare, Share2 } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { ResponsiveMedia } from "@/components/responsive-media";
import type { HydratedPost } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";

type PostCardProps = {
  post: HydratedPost;
  highlighted?: boolean;
  compact?: boolean;
  strip?: boolean;
  stripDivider?: boolean;
  onOpen?: (postId: string) => void;
  onFocusCreator?: (creatorId: string) => void;
  href?: string;
  className?: string;
  numberedIndex?: number | null;
  showActions?: boolean;
  showLocation?: boolean;
};

function visibilityLabel(post: HydratedPost) {
  if (post.post.visibilityType === "subscriber_only") return "Subscriber";
  if (post.post.visibilityType === "special_hidden_place") return "Hidden";
  return "Public";
}

export function PostCard({
  post,
  highlighted = false,
  compact = false,
  strip = false,
  stripDivider = true,
  onOpen,
  onFocusCreator,
  href,
  className,
  numberedIndex = null,
  showActions = true,
  showLocation = true,
}: PostCardProps) {
  const router = useRouter();
  const { viewerId, localState, toggleReaction, toggleSave } = useDemoStore();
  const [sharing, setSharing] = useState(false);

  const primaryMedia = post.media[0];
  const visibleTags = useMemo(() => post.tags.slice(0, strip ? 2 : compact ? 3 : 4), [compact, post.tags, strip]);
  const extraTagCount = Math.max(0, post.tags.length - visibleTags.length);
  const bodyText = post.isLocked ? post.post.teaser || post.post.body : post.post.body;
  const isSaved = localState.savedPostIds.includes(post.id);
  const hasWanted = localState.reactionByPostId[post.id] === "want";

  const activate = () => {
    if (onOpen) {
      onOpen(post.id);
      return;
    }
    if (href) {
      router.push(href);
    }
  };

  const stop = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const shareLink = async (event: SyntheticEvent) => {
    stop(event);
    if (typeof window === "undefined") return;
    setSharing(true);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    } catch {
      // no-op
    } finally {
      window.setTimeout(() => setSharing(false), 900);
    }
  };

  const actionButton = (
    icon: ReactNode,
    label: string,
    handler: (event: SyntheticEvent) => void,
    active?: boolean,
  ) => (
    <button
      type="button"
      onClick={handler}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
        active
          ? "border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950"
          : "border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
      )}
    >
      {icon}
      {label}
    </button>
  );

  const actionRow = showActions ? (
    <div className="flex flex-wrap items-center gap-2">
      {actionButton(
        <Heart className="h-3.5 w-3.5" />,
        hasWanted ? "Wanted" : "Want",
        (event) => {
          stop(event);
          if (!viewerId) return;
          void toggleReaction(post.id, "want");
        },
        hasWanted,
      )}
      {actionButton(
        <Bookmark className="h-3.5 w-3.5" />,
        isSaved ? "Saved" : "Save",
        (event) => {
          stop(event);
          if (!viewerId) return;
          void toggleSave(post.id);
        },
        isSaved,
      )}
      {actionButton(
        <Share2 className="h-3.5 w-3.5" />,
        sharing ? "Copied" : "Share",
        shareLink,
      )}
      <span className="ml-auto inline-flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
        <span className="inline-flex items-center gap-1">
          <Heart className="h-[11px] w-[11px] opacity-70" />
          {post.reactions.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-[11px] w-[11px] opacity-70" />
          {post.comments.length}
        </span>
      </span>
    </div>
  ) : null;

  return (
    <article
      role={onOpen || href ? "button" : undefined}
      tabIndex={onOpen || href ? 0 : undefined}
      onClick={onOpen || href ? activate : undefined}
      onKeyDown={
        onOpen || href
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      className={cn(
        "group h-full min-w-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40",
        strip
          ? cn(
              "bg-transparent py-3",
              stripDivider && "border-b border-stone-200/80 dark:border-stone-700/80",
            )
          : "timeline-card rounded-[26px] px-4 py-4",
        highlighted && "border-stone-950 shadow-[0_16px_36px_rgba(27,24,19,0.12)] dark:border-white/80",
        className,
      )}
    >
      <div className={cn("min-w-0", strip ? "space-y-3" : compact ? "space-y-3" : "space-y-4")}>
        <div className="flex items-start gap-3">
          {numberedIndex != null ? (
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-sm font-semibold text-white dark:bg-white dark:text-stone-950">
              {numberedIndex}
            </div>
          ) : null}
          <Avatar
            src={post.author.avatarUrl}
            alt=""
            displayName={post.author.displayName}
            size="sm"
            className={cn("shrink-0", strip ? "h-9 w-9" : "h-10 w-10")}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {onFocusCreator ? (
                <button
                  type="button"
                  onClick={(event) => {
                    stop(event);
                    onFocusCreator(post.author.id);
                  }}
                  className="truncate text-left text-sm font-semibold text-stone-900 hover:underline dark:text-stone-100"
                >
                  {post.author.displayName}
                </button>
              ) : (
                <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {post.author.displayName}
                </div>
              )}
              <span className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                @{post.author.username}
              </span>
              <span className="text-[11px] text-stone-400">·</span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {formatRelativeDate(post.post.createdAt)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
              <span className="rounded-full border border-[color:var(--glass-border)] px-2 py-0.5 font-semibold">
                {visibilityLabel(post)}
              </span>
              {post.isLocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-950 dark:bg-amber-900/30 dark:text-amber-100">
                  <Lock className="h-3 w-3" />
                  Preview only
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={cn(
            strip
              ? "grid gap-3 md:grid-cols-[minmax(0,1fr)_96px]"
              : compact
                ? "space-y-3"
                : "grid gap-4 md:grid-cols-[minmax(0,1fr)_156px]",
          )}
        >
          <div className="min-w-0 space-y-2">
            <div className="space-y-1.5">
              <h3
                className={cn(
                  "min-w-0 text-stone-900 dark:text-stone-100",
                  strip ? "line-clamp-2 text-sm font-semibold" : compact ? "line-clamp-2 text-base font-semibold" : "line-clamp-2 text-lg font-semibold",
                )}
              >
                {post.post.title}
              </h3>
              {showLocation ? (
                <div className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                  {post.locationSummary}
                </div>
              ) : null}
            </div>

            <p
              className={cn(
                "text-stone-600 dark:text-stone-400",
                strip ? "line-clamp-3 text-sm leading-5" : compact ? "line-clamp-3 text-sm leading-6" : "line-clamp-3 text-sm leading-6",
              )}
            >
              {bodyText}
            </p>

            {(visibleTags.length > 0 || post.topic) && (
              <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 dark:text-stone-300">
                {post.topic ? (
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                    {post.topic.name}
                  </span>
                ) : null}
                {visibleTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[color:var(--glass-border)] px-2.5 py-1">
                    #{tag}
                  </span>
                ))}
                {extraTagCount > 0 ? (
                  <span className="rounded-full border border-dashed border-[color:var(--glass-border)] px-2.5 py-1 text-stone-500 dark:text-stone-400">
                    +{extraTagCount}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-900",
              strip ? "h-24 md:h-full" : compact ? "aspect-[4/3]" : "aspect-square",
            )}
          >
            {primaryMedia ? (
              <ResponsiveMedia
                media={primaryMedia}
                alt={post.post.title}
                fill
                sizes={strip ? "180px" : compact ? "(max-width: 768px) 100vw, 320px" : "160px"}
                className={cn("object-cover transition duration-300 group-hover:scale-[1.02]", post.isLocked && "blur-[1px] saturate-75")}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-stone-100/80 dark:bg-stone-800/50"
                role="img"
                aria-label="No media"
              >
                <ImageOff className="h-9 w-9 text-stone-400 dark:text-stone-500" aria-hidden />
              </div>
            )}
            {post.isLocked ? <div className="pointer-events-none absolute inset-0 bg-stone-950/12" /> : null}
          </div>
        </div>

        {actionRow}
      </div>
    </article>
  );
}
