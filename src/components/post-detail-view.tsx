"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { EditPostDialog } from "@/components/edit-post-dialog";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bookmark,
  ChevronDown,
  Flag,
  ImagePlus,
  LoaderCircle,
  Lock,
  MessageSquare,
  Share2,
  ShieldBan,
} from "@/components/icons";
import { MapView } from "@/components/map-view";
import { PostCard } from "@/components/post-card";
import { PostShareDialog } from "@/components/post-share-dialog";
import { useCountry } from "@/components/providers/country-context";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { ResponsiveMedia } from "@/components/responsive-media";
import { WalletPurchaseControls } from "@/components/wallet-purchase-controls";
import { getCreatorPosts, getPostById } from "@/lib/discovery";
import { cn, describeVisibility, formatMoney, formatRelativeDate } from "@/lib/utils";

export function PostDetailView({
  postId,
  variant = "page",
}: {
  postId: string;
  variant?: "page" | "dialog";
}) {
  const router = useRouter();
  const {
    snapshot,
    viewerId,
    localState,
    toggleFollow,
    toggleSubscription,
    toggleUnlock,
    addComment,
    toggleSave,
    addToItinerary,
    blockUser,
    reportTarget,
    featureModes,
    appendMediaToPost,
  } = useDemoStore();
  const { countryCode } = useCountry();
  const post = useMemo(() => getPostById(snapshot, viewerId, postId), [postId, snapshot, viewerId]);
  const [commentBody, setCommentBody] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [detailDialogTab, setDetailDialogTab] = useState<"conversation" | "media">("conversation");
  const [detailPageTab, setDetailPageTab] = useState<
    "overview" | "media" | "conversation" | "map" | "practical"
  >("overview");
  const [gatePopoverOpen, setGatePopoverOpen] = useState(false);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>("__auto__");
  const [newItineraryTitle, setNewItineraryTitle] = useState("");
  const [itineraryDayLabel, setItineraryDayLabel] = useState("Day 1");
  const [itineraryTimeLabel, setItineraryTimeLabel] = useState("");
  const [itineraryNote, setItineraryNote] = useState("");
  const [itineraryTags, setItineraryTags] = useState("");
  const [itinerarySavedMessage, setItinerarySavedMessage] = useState<string | null>(null);
  const itineraries = useMemo(() => localState.itineraries ?? [], [localState.itineraries]);

  useEffect(() => {
    if (selectedItineraryId !== "__auto__") return;
    if (itineraries.length > 0) {
      setSelectedItineraryId(itineraries[0]!.id);
      return;
    }
    setSelectedItineraryId("__new__");
  }, [itineraries, selectedItineraryId]);

  useEffect(() => {
    if (!itinerarySavedMessage) return;
    const timeout = window.setTimeout(() => setItinerarySavedMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [itinerarySavedMessage]);

  if (!post) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
        This post does not exist in the demo dataset.
      </div>
    );
  }

  const relatedPosts =
    variant === "page"
      ? getCreatorPosts(snapshot, viewerId, post.author.id)
          .filter((entry) => entry.id !== post.id)
          .slice(0, 4)
      : [];
  const isFollowing = viewerId
    ? snapshot.follows.some(
        (follow) => follow.followerId === viewerId && follow.followedUserId === post.author.id,
      )
    : false;
  const isSubscribed = localState.subscriptionCreatorIds.includes(post.author.id);
  const isSaved = localState.savedPostIds.includes(post.id);
  const canComment = Boolean(viewerId);
  const isAuthor = Boolean(viewerId && post.post.authorId === viewerId);
  const isEditableCreatedPost = Boolean(
    isAuthor && featureModes.appMode === "demo" && localState.createdPosts.some((bundle) => bundle.post.id === post.id),
  );
  const sortedMedia = [...post.media].sort((a, b) => a.order - b.order);

  const submitComment = async () => {
    if (!commentBody.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment({ postId: post.id, body: commentBody.trim() });
      setCommentBody("");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const report = () => {
    const reason = window.prompt("What should moderation know about this post?");
    if (!reason) return;
    void reportTarget("post", post.id, reason);
  };

  const onMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadBusy(true);
    try {
      await appendMediaToPost(post.id, files);
    } catch {
      window.alert("Upload failed. Try again.");
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  };

  const mediaLockedClass = post.isLocked ? "blur-[1px] saturate-75" : "";

  const locationTitle =
    [post.location.placeName, post.location.city].filter(Boolean).join(" · ") || post.locationSummary;

  const saveToItinerary = () => {
    if (!viewerId) return;
    const targetTitle =
      selectedItineraryId !== "__new__"
        ? itineraries.find((itinerary) => itinerary.id === selectedItineraryId)?.title ?? "trip"
        : newItineraryTitle.trim() || "New trip";
    const nextId = addToItinerary({
      postId: post.id,
      itineraryId: selectedItineraryId,
      createTitle: newItineraryTitle,
      countryCode: countryCode === "ALL" ? (post.location.country ?? null) : countryCode,
      dayLabel: itineraryDayLabel,
      timeLabel: itineraryTimeLabel,
      note: itineraryNote,
      tags: itineraryTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    if (!nextId) return;
    setPlanPanelOpen(false);
    setSelectedItineraryId(nextId);
    setNewItineraryTitle("");
    setItineraryTimeLabel("");
    setItineraryNote("");
    setItineraryTags("");
    setItinerarySavedMessage(`Added to ${targetTitle}`);
  };

  const gateCtaBlock =
    featureModes.appMode === "database" && featureModes.walletPaymentsEnabled ? (
      <WalletPurchaseControls
        targetType={post.post.visibilityType === "subscriber_only" ? "subscription" : "special_unlock"}
        creatorId={post.author.id}
        postId={post.id}
      />
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {post.post.visibilityType === "subscriber_only" ? (
          <button
            type="button"
            onClick={() => viewerId && toggleSubscription(post.author.id)}
            className="rounded-full bg-stone-950 px-2.5 py-1.5 text-[11px] font-semibold text-white"
          >
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => viewerId && toggleUnlock(post.id)}
            className="rounded-full bg-stone-950 px-2.5 py-1.5 text-[11px] font-semibold text-white"
          >
            Unlock {formatMoney(post.post.specialPrice, post.post.currency || "CZK")}
          </button>
        )}
        {!viewerId ? (
          <Link
            href="/sign-in"
            className="rounded-full border border-stone-300 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    );

  if (variant === "dialog") {
    const primaryMedia = sortedMedia[0];
    return (
      <div className="mx-auto max-w-none space-y-4 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {describeVisibility(post.post.visibilityType)}
          </span>
          {post.post.specialPrice ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {formatMoney(post.post.specialPrice, post.post.currency || "CZK")}
            </span>
          ) : null}
          {!post.isActive ? (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
              Archived
            </span>
          ) : null}
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-stone-950 dark:text-stone-100 sm:text-2xl">
          {post.post.title}
        </h1>

        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              src={post.author.avatarUrl}
              alt=""
              displayName={post.author.displayName}
              size="sm"
              className="h-9 w-9 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{post.author.displayName}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                <span>{formatRelativeDate(post.post.createdAt)}</span>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
                  {locationTitle}
                  {post.isLocked ? (
                    <button
                      type="button"
                      onClick={() => setGatePopoverOpen((o) => !o)}
                      className="inline-flex rounded-md p-1 text-amber-700 transition hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/40"
                      aria-expanded={gatePopoverOpen}
                      aria-label="Unlock location"
                    >
                      <Lock className="h-4 w-4 shrink-0" />
                    </button>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
          <details className="w-full sm:ml-auto sm:w-auto">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200">
              More <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="mt-2 space-y-2 border-t border-stone-200 pt-2 dark:border-stone-700">
              <p className="text-xs leading-5 text-stone-600 dark:text-stone-400">{post.author.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {viewerId && viewerId !== post.author.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => void toggleFollow(post.author.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                        isFollowing
                          ? "bg-stone-950 text-white"
                          : "border border-stone-200 text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-200",
                      )}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                    {isSubscribed ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
                        Subscribed
                      </span>
                    ) : featureModes.appMode === "database" && featureModes.walletPaymentsEnabled ? (
                      <WalletPurchaseControls targetType="subscription" creatorId={post.author.id} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSubscription(post.author.id)}
                        className="rounded-full border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:border-amber-400"
                      >
                        Subscribe
                      </button>
                    )}
                  </>
                )}
                <Link
                  href={`/creator/${post.author.username}`}
                  className="rounded-full border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
                >
                  Profile
                </Link>
              </div>
            </div>
          </details>
        </div>

        {post.isLocked && gatePopoverOpen ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100">
            <p className="text-amber-900/90 dark:text-amber-200/90">
              Exact coordinates and full notes unlock with subscription or purchase.
            </p>
            <div className="mt-2">{gateCtaBlock}</div>
          </div>
        ) : null}

        <div className="text-sm leading-6 text-stone-700 dark:text-stone-300">
          {post.isLocked ? post.post.teaser || post.post.body : post.post.body}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          <div className="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-900">
              {primaryMedia ? (
                <ResponsiveMedia
                  media={primaryMedia}
                  alt={primaryMedia.alt || post.post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  controls
                  className={cn("object-cover", mediaLockedClass)}
                />
              ) : (
                <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-stone-500">
                  No cover media
                </div>
              )}
              {post.isLocked ? <div className="pointer-events-none absolute inset-0 bg-stone-950/18" /> : null}
            </div>
            <p className="text-sm leading-snug text-stone-700 dark:text-stone-300">{post.locationSummary}</p>
          </div>

          <div className="flex min-h-0 flex-col gap-3 lg:col-span-1">
            <div className="min-h-[200px] w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
              <MapView
                posts={[post]}
                center={{ latitude: post.displayLatitude, longitude: post.displayLongitude }}
                className="h-[min(42vh,280px)] min-h-[200px] w-full rounded-none border-0 shadow-none lg:h-[min(38vh,320px)]"
                showPostOverlay={false}
              />
            </div>
            <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
              <div className="flex border-b border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => setDetailDialogTab("conversation")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition",
                    detailDialogTab === "conversation"
                      ? "border-b-2 border-stone-900 bg-stone-50 text-stone-900 dark:border-stone-100 dark:bg-stone-800/50 dark:text-stone-100"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Conversation
                </button>
                <button
                  type="button"
                  onClick={() => setDetailDialogTab("media")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition",
                    detailDialogTab === "media"
                      ? "border-b-2 border-stone-900 bg-stone-50 text-stone-900 dark:border-stone-100 dark:bg-stone-800/50 dark:text-stone-100"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200",
                  )}
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Media
                </button>
              </div>
              <div className="max-h-[min(40vh,320px)] overflow-y-auto p-3">
                {detailDialogTab === "conversation" ? (
                  <div className="space-y-2">
                    {post.comments.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-stone-200 py-4 text-center text-xs text-stone-500 dark:border-stone-600">
                        No comments yet.
                      </p>
                    ) : (
                      post.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg border border-stone-200 p-2 dark:border-stone-700">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-stone-900 dark:text-stone-100">
                              {comment.author.displayName}
                            </span>
                            <span className="text-[10px] text-stone-500">{formatRelativeDate(comment.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-stone-600 dark:text-stone-400">{comment.body}</p>
                        </div>
                      ))
                    )}
                    {canComment ? (
                      <div className="flex gap-2 pt-1">
                        <textarea
                          value={commentBody}
                          onChange={(e) => setCommentBody(e.target.value)}
                          placeholder="Add a note..."
                          className="min-h-[64px] flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs text-stone-900 outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                        />
                        <button
                          type="button"
                          onClick={() => void submitComment()}
                          disabled={isSubmittingComment || !commentBody.trim()}
                          className="self-end rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {isSubmittingComment ? "…" : "Post"}
                        </button>
                      </div>
                    ) : (
                      <p className="flex items-center gap-1.5 pt-2 text-xs text-stone-500">
                        <AlertTriangle className="h-3.5 w-3.5" /> Sign in to comment.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedMedia.length === 0 ? (
                      <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-center text-xs text-stone-500 dark:border-stone-600">
                        No media yet.
                      </div>
                    ) : (
                      sortedMedia.map((media) => (
                        <div
                          key={media.id}
                          className="relative aspect-video w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900"
                        >
                          <ResponsiveMedia
                            media={media}
                            alt={media.alt || post.post.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 33vw"
                            controls
                            className={cn("object-cover", mediaLockedClass)}
                          />
                          {post.isLocked ? <div className="pointer-events-none absolute inset-0 bg-stone-950/18" /> : null}
                        </div>
                      ))
                    )}
                    {isAuthor && featureModes.appMode === "demo" ? (
                      <label
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/80 px-3 py-6 transition hover:border-stone-400 dark:border-stone-600 dark:bg-stone-900/50",
                          uploadBusy && "pointer-events-none opacity-60",
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="sr-only"
                          disabled={uploadBusy}
                          onChange={(e) => void onMediaUpload(e)}
                        />
                        {uploadBusy ? (
                          <LoaderCircle className="h-6 w-6 animate-spin text-stone-400" />
                        ) : (
                          <ImagePlus className="h-6 w-6 text-stone-400" />
                        )}
                        <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                          {uploadBusy ? "Uploading…" : "Add photos or video"}
                        </span>
                      </label>
                    ) : null}
                    {isAuthor && featureModes.appMode !== "demo" ? (
                      <p className="text-center text-[11px] text-stone-500">Uploads available in demo mode.</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="rounded-full border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-600 transition hover:border-stone-900 dark:border-stone-600 dark:text-stone-400 dark:hover:border-stone-400"
            >
              #{tag}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
          <button
            type="button"
            onClick={() => viewerId && void toggleSave(post.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition",
              isSaved
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-200 text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-300",
            )}
          >
            <Bookmark className="h-3 w-3" /> Save
          </button>
          <button
            type="button"
            onClick={() => setShareDialogOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
          >
            <Share2 className="h-3 w-3" /> Share
          </button>
          {isEditableCreatedPost ? (
            <button
              type="button"
              onClick={() => setEditDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={report}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
          >
            <Flag className="h-3 w-3" /> Report
          </button>
        </div>
        <PostShareDialog open={shareDialogOpen} post={post} onClose={() => setShareDialogOpen(false)} />
        <EditPostDialog open={editDialogOpen} post={isEditableCreatedPost ? post : null} onClose={() => setEditDialogOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Back
        </button>
      </div>

      <section className="space-y-4 rounded-[28px] border border-stone-200/80 bg-white/95 p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/90 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {describeVisibility(post.post.visibilityType)}
          </span>
          {post.post.specialPrice ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {formatMoney(post.post.specialPrice, post.post.currency || "CZK")}
            </span>
          ) : null}
          {!post.isActive ? (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">Archived</span>
          ) : null}
          {post.isLocked ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
              Exact point locked
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_320px] lg:items-start">
          <div className="space-y-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-100 sm:text-3xl">
                {post.post.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-700 dark:text-stone-300">
                {post.isLocked ? post.post.teaser || post.post.body : post.post.body}
              </p>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3 dark:border-stone-700 dark:bg-stone-800/50">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={post.author.avatarUrl}
                  alt=""
                  displayName={post.author.displayName}
                  size="sm"
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{post.author.displayName}</div>
                  <div className="text-xs text-stone-500">
                    {formatRelativeDate(post.post.createdAt)} · {locationTitle}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlanPanelOpen((open) => !open)}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
                >
                  Add to trip
                </button>
                <button
                  type="button"
                  onClick={() => viewerId && void toggleSave(post.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition",
                    isSaved
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-300",
                  )}
                >
                  <Bookmark className="h-3 w-3" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setShareDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
                >
                  <Share2 className="h-3 w-3" /> Share
                </button>
                {isEditableCreatedPost ? (
                  <button
                    type="button"
                    onClick={() => setEditDialogOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
                  >
                    Edit
                  </button>
                ) : null}
                <Link
                  href={`/creator/${post.author.username}`}
                  className="rounded-full border border-stone-200 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
                >
                  Profile
                </Link>
                <Link
                  href="/itinerary"
                  className="rounded-full border border-stone-200 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
                >
                  Trips
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-600 transition hover:border-stone-900 dark:border-stone-600 dark:text-stone-400 dark:hover:border-stone-400"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Quick actions</div>
            <div className="flex flex-wrap gap-1.5">
              {viewerId && viewerId !== post.author.id ? (
                <button
                  type="button"
                  onClick={() => void toggleFollow(post.author.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition",
                    isFollowing
                      ? "bg-stone-950 text-white"
                      : "border border-stone-200 text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:text-stone-200",
                  )}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              ) : null}
              {viewerId && viewerId !== post.author.id ? (
                isSubscribed ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950">
                    Subscribed
                  </span>
                ) : featureModes.appMode === "database" && featureModes.walletPaymentsEnabled ? (
                  <WalletPurchaseControls targetType="subscription" creatorId={post.author.id} compact />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSubscription(post.author.id)}
                    className="rounded-full border border-amber-200 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:border-amber-400"
                  >
                    Subscribe
                  </button>
                )
              ) : null}
              <button
                type="button"
                onClick={report}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
              >
                <Flag className="h-3 w-3" /> Report
              </button>
              {viewerId && viewerId !== post.author.id ? (
                <button
                  type="button"
                  onClick={() => void blockUser(post.author.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-400"
                >
                  <ShieldBan className="h-3 w-3" /> Block
                </button>
              ) : null}
            </div>
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200">
                Creator note <ChevronDown className="h-3.5 w-3.5" />
              </summary>
              <p className="mt-2 text-xs leading-5 text-stone-600 dark:text-stone-400">{post.author.bio}</p>
            </details>
          </div>
        </div>

        {planPanelOpen ? (
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Add place to trip</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Pick a trip list, then place this stop into a specific day and time.
                </div>
              </div>
              <Link
                href="/itinerary"
                className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
              >
                Open trips
              </Link>
            </div>
            {viewerId ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {itineraries.length > 0 ? (
                  <div className="md:col-span-2">
                    <div className="text-xs font-medium text-stone-500 dark:text-stone-400">Your trip lists</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {itineraries.slice(0, 4).map((itinerary) => (
                        <button
                          key={itinerary.id}
                          type="button"
                          onClick={() => setSelectedItineraryId(itinerary.id)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            selectedItineraryId === itinerary.id
                              ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                              : "border border-[color:var(--glass-border)] text-stone-600 dark:text-stone-300",
                          )}
                        >
                          {itinerary.title}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedItineraryId("__new__")}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          selectedItineraryId === "__new__"
                            ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                            : "border border-dashed border-[color:var(--glass-border)] text-stone-600 dark:text-stone-300",
                        )}
                      >
                        + New trip
                      </button>
                    </div>
                  </div>
                ) : null}
                <label className="space-y-1">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Trip</span>
                  <select
                    value={selectedItineraryId}
                    onChange={(event) => setSelectedItineraryId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  >
                    <option value="__new__">Create new trip</option>
                    {itineraries.map((itinerary) => (
                      <option key={itinerary.id} value={itinerary.id}>
                        {itinerary.title}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedItineraryId === "__new__" ? (
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">New trip title</span>
                    <input
                      type="text"
                      value={newItineraryTitle}
                      onChange={(event) => setNewItineraryTitle(event.target.value)}
                      placeholder="Summer roadtrip"
                      className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                    />
                  </label>
                ) : null}
                <label className="space-y-1">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Day</span>
                  <input
                    type="text"
                    value={itineraryDayLabel}
                    onChange={(event) => setItineraryDayLabel(event.target.value)}
                    placeholder="Day 1"
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Time</span>
                  <input
                    type="text"
                    value={itineraryTimeLabel}
                    onChange={(event) => setItineraryTimeLabel(event.target.value)}
                    placeholder="08:30"
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Note</span>
                  <textarea
                    value={itineraryNote}
                    onChange={(event) => setItineraryNote(event.target.value)}
                    placeholder="Coffee first, then head to the river stop."
                    className="min-h-[80px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Tags</span>
                  <input
                    type="text"
                    value={itineraryTags}
                    onChange={(event) => setItineraryTags(event.target.value)}
                    placeholder="sunrise, vanlife, breakfast"
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={saveToItinerary}
                    disabled={selectedItineraryId === "__new__" && !newItineraryTitle.trim()}
                    className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
                  >
                    Add location
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-4">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Sign in to save this place into a trip
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  Once you sign in, this panel lets you choose an existing trip or create a new one directly from the place detail.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/sign-in?next=/post/${post.id}`}
                    className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
                  >
                    Sign in to add this place
                  </Link>
                  <Link
                    href="/itinerary"
                    className="inline-flex rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
                  >
                    Open trips workspace
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {itinerarySavedMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            {itinerarySavedMessage}.{" "}
            <Link href="/itinerary" className="font-semibold underline underline-offset-2">
              Open trip timeline
            </Link>
          </div>
        ) : null}

        {post.isLocked ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <Lock className="h-3.5 w-3.5" />
              {post.post.visibilityType === "subscriber_only" ? "Subscriber gate" : "Special place gate"}
            </div>
            <p className="mt-1.5 text-amber-900/85 dark:text-amber-200/90">
              Exact location and full notes stay compact until the entitlement is active.
            </p>
            <div className="mt-3">{gateCtaBlock}</div>
          </div>
        ) : null}

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {[
              ["overview", "Overview"],
              ["media", "Media"],
              ["conversation", "Conversation"],
              ["map", "Map"],
              ["practical", "Practical info"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setDetailPageTab(
                    value as "overview" | "media" | "conversation" | "map" | "practical",
                  )
                }
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-semibold transition",
                  detailPageTab === value
                    ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                    : "border border-stone-200 text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {detailPageTab === "overview" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Why this stop matters</div>
                  <div className="mt-2 text-sm leading-7 text-stone-700 dark:text-stone-300">
                    {post.isLocked ? post.post.teaser || post.post.body : post.post.body}
                  </div>
                </div>
                {relatedPosts.length > 0 ? (
                  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">More from this creator</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {relatedPosts.map((related) => (
                        <PostCard key={related.id} post={related} compact href={`/post/${related.id}`} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Trip snapshot</div>
                  <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                    <div>
                      <span className="font-medium text-stone-900 dark:text-stone-100">Best use:</span> quick detour,
                      save for itinerary, or unlock for exact navigation.
                    </div>
                    <div>
                      <span className="font-medium text-stone-900 dark:text-stone-100">Freshness:</span>{" "}
                      {formatRelativeDate(post.post.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium text-stone-900 dark:text-stone-100">Access:</span>{" "}
                      {post.canAccess ? "full location visible" : "preview only"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {detailPageTab === "media" ? (
          <div className="space-y-3">
            {sortedMedia.length === 0 ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-center text-sm text-stone-500 dark:border-stone-600 dark:bg-stone-900/40 dark:text-stone-400">
                No media yet.
              </div>
            ) : (
              sortedMedia.map((media) => (
                <div
                  key={media.id}
                  className="relative aspect-video w-full overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-900"
                >
                  <ResponsiveMedia
                    media={media}
                    alt={media.alt || post.post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 56rem"
                    controls
                    className={cn("object-cover", mediaLockedClass)}
                  />
                  {post.isLocked ? <div className="pointer-events-none absolute inset-0 bg-stone-950/18" /> : null}
                </div>
              ))
            )}
            {isAuthor && featureModes.appMode === "demo" ? (
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 transition hover:border-stone-400 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-900/50 dark:hover:border-stone-500",
                  uploadBusy && "pointer-events-none opacity-60",
                )}
              >
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="sr-only"
                  disabled={uploadBusy}
                  onChange={(e) => void onMediaUpload(e)}
                />
                {uploadBusy ? (
                  <LoaderCircle className="h-8 w-8 animate-spin text-stone-400" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-stone-400" />
                )}
                <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
                  {uploadBusy ? "Uploading…" : "Add photos or video"}
                </span>
                <span className="text-xs text-stone-500">PNG, JPG, WebP or video</span>
              </label>
            ) : null}
            {isAuthor && featureModes.appMode !== "demo" ? (
              <p className="text-center text-xs text-stone-500">Media uploads on post detail are available in demo mode.</p>
            ) : null}
          </div>
        ) : null}

        {detailPageTab === "conversation" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {post.comments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-200 py-4 text-center text-xs text-stone-500 dark:border-stone-600">
                  No comments yet.
                </p>
              ) : (
                post.comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-stone-900 dark:text-stone-100">{comment.author.displayName}</span>
                      <span className="text-[11px] text-stone-500">{formatRelativeDate(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-stone-600 dark:text-stone-400">{comment.body}</p>
                    {comment.replies.length > 0 ? (
                      <div className="mt-3 space-y-2 border-l border-stone-200 pl-3 dark:border-stone-600">
                        {comment.replies.map((reply) => (
                          <div key={reply.id}>
                            <span className="text-xs font-medium text-stone-900 dark:text-stone-100">{reply.author.displayName}</span>
                            <p className="text-sm text-stone-600 dark:text-stone-400">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            {canComment ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[88px] flex-1 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                />
                <button
                  type="button"
                  onClick={() => void submitComment()}
                  disabled={isSubmittingComment || !commentBody.trim()}
                  className="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
                >
                  {isSubmittingComment ? "Posting…" : "Post note"}
                </button>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-stone-500">
                <AlertTriangle className="h-3.5 w-3.5" /> Sign in to comment.
              </p>
            )}
          </div>
        ) : null}

        {detailPageTab === "map" ? (
          <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
            <div className="px-4 py-2 text-xs font-medium text-stone-500">
              {post.location.placeName || post.location.city} · {post.location.region}
            </div>
            <div className="h-[260px] min-h-[260px] sm:h-[340px]">
              <MapView
                posts={[post]}
                center={{ latitude: post.displayLatitude, longitude: post.displayLongitude }}
                className="h-full w-full rounded-none border-0 shadow-none"
                showPostOverlay={false}
              />
            </div>
            <div className="border-t border-stone-200 px-4 py-3 text-sm leading-6 text-stone-600 dark:border-stone-700 dark:text-stone-400">
              {post.canAccess ? (
                <>
                  {post.location.latitude.toFixed(5)}, {post.location.longitude.toFixed(5)}
                  {post.location.address ? ` · ${post.location.address}` : null}
                </>
              ) : (
                "Location preview only. Exact coordinates unlock with entitlement."
              )}
            </div>
          </div>
        ) : null}

        {detailPageTab === "practical" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Location details</h2>
              <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                <div><span className="font-medium text-stone-900 dark:text-stone-100">Place:</span> {post.location.placeName || "Unnamed spot"}</div>
                <div><span className="font-medium text-stone-900 dark:text-stone-100">City:</span> {post.location.city || "Unknown"}</div>
                <div><span className="font-medium text-stone-900 dark:text-stone-100">Region:</span> {post.location.region || "Unknown"}</div>
                <div><span className="font-medium text-stone-900 dark:text-stone-100">Address:</span> {post.canAccess ? post.location.address || "No address" : "Unlock required"}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/50">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Useful next features</h2>
              <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                <div>Itinerary slotting: add this stop to a day plan with arrival time.</div>
                <div>Suitability labels: sunrise, van, work, family, hike, rainy-day backup.</div>
                <div>Freshness checks: last verified by community and best season to visit.</div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <PostShareDialog open={shareDialogOpen} post={post} onClose={() => setShareDialogOpen(false)} />
      <EditPostDialog open={editDialogOpen} post={isEditableCreatedPost ? post : null} onClose={() => setEditDialogOpen(false)} />
    </div>
  );
}
