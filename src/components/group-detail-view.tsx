"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { MapView } from "@/components/map-view";
import { PostCard } from "@/components/post-card";
import { WalletPurchaseControls } from "@/components/wallet-purchase-controls";
import { CheckCircle2, Copy, Globe2, Lock, MessageSquare, Search, Sparkles, WalletCards } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useCountry } from "@/components/providers/country-context";
import { getTravelGroupBySlug, normalizeTravelGroupInviteCode } from "@/lib/travel-groups";
import { cn } from "@/lib/utils";

function panelClass() {
  return "rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur-md";
}

function accessCopy(accessType: "public" | "private" | "paid") {
  if (accessType === "public") {
    return {
      icon: Globe2,
      label: "Public community",
      className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    };
  }
  if (accessType === "private") {
    return {
      icon: Lock,
      label: "Private group",
      className: "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
    };
  }
  return {
    icon: WalletCards,
    label: "Paid community",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  };
}

export function GroupDetailView({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const {
    snapshot,
    hydratedPosts,
    viewerId,
    localState,
    toggleSubscription,
    toggleGroupMembership,
    featureModes,
  } = useDemoStore();
  const { countryCode, countryName } = useCountry();
  const [query, setQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState(searchParams.get("invite") ?? "");
  const [passwordInput, setPasswordInput] = useState("");
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<string[]>([]);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const group = useMemo(
    () => getTravelGroupBySlug(snapshot, hydratedPosts, slug, localState),
    [hydratedPosts, localState, slug, snapshot],
  );

  useEffect(() => {
    setQuestionnaireAnswers(group?.questionnaire?.questions.map(() => "") ?? []);
  }, [group?.questionnaire]);

  const access = group ? accessCopy(group.accessType) : null;
  const isOwner = Boolean(group && viewerId === group.owner.id);
  const joinedViaLocal = Boolean(group && localState.joinedGroupSlugs.includes(group.slug));
  const hasPaidAccess = Boolean(group && localState.subscriptionCreatorIds.includes(group.owner.id));
  const hasAccess =
    !group
      ? false
      : group.accessType === "public" || isOwner || joinedViaLocal || (group.accessType === "paid" && hasPaidAccess);

  const filteredPosts = useMemo(() => {
    if (!group) return [];
    const needle = query.trim().toLowerCase();
    return group.posts.filter((post) => {
      const countryMatch =
        countryCode === "ALL" ? true : (post.location.country ?? "").toUpperCase() === countryCode;
      const topicMatch = selectedTopic ? post.topic?.slug === selectedTopic : true;
      const textMatch = !needle
        ? true
        : [
            post.post.title,
            post.post.body,
            post.locationSummary,
            post.author.displayName,
            post.tags.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle);
      return countryMatch && topicMatch && textMatch;
    });
  }, [countryCode, group, query, selectedTopic]);

  const postsForDisplay = hasAccess ? filteredPosts : group?.featuredPosts ?? [];
  const latestPosts = useMemo(() => postsForDisplay.slice(0, 12), [postsForDisplay]);
  const mapPosts = useMemo(() => postsForDisplay.slice(0, 40), [postsForDisplay]);
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredPosts.forEach((post) => {
      if (post.topic?.slug) {
        counts.set(post.topic.slug, (counts.get(post.topic.slug) ?? 0) + 1);
      }
    });
    return counts;
  }, [filteredPosts]);

  if (!group || !access) {
    return (
      <div className="mx-auto max-w-3xl rounded-[28px] border border-dashed border-[color:var(--glass-border)] px-6 py-14 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-stone-400" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--foreground)]">
          Group not found
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          This community is missing from the current demo dataset.
        </p>
        <Link
          href="/groups"
          className="mt-5 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
        >
          Back to groups
        </Link>
      </div>
    );
  }

  const AccessIcon = access.icon;
  const stats = [
    { label: "Visible posts", value: postsForDisplay.length },
    { label: "Members", value: group.memberCount },
    { label: "Countries", value: group.countryCodes.length },
    { label: "Topics", value: group.topics.length },
  ];

  const redeemInvite = () => {
    if (!group || group.accessType !== "private") return;
    if (!viewerId) {
      setInviteStatus("Sign in first to redeem a private invite.");
      return;
    }
    if (!group.inviteCode) {
      setInviteStatus("This group currently has no active invite code.");
      return;
    }
    const normalizedInput = normalizeTravelGroupInviteCode(inviteCodeInput);
    const normalizedCode = normalizeTravelGroupInviteCode(group.inviteCode);
    if (!normalizedInput || normalizedInput !== normalizedCode) {
      setInviteStatus("Invite code does not match this group.");
      return;
    }
    if (!joinedViaLocal) {
      toggleGroupMembership(group.slug);
    }
    setInviteStatus("Invite accepted. You can now browse the full private group.");
  };

  const copyInviteCode = async () => {
    if (!group?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(null), 1800);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(null), 1800);
    }
  };

  const submitPassword = () => {
    if (!group || group.joinMode !== "password") return;
    if (!viewerId) {
      setInviteStatus("Sign in first to unlock this group with a password.");
      return;
    }
    if (!group.password || group.password.trim().toLowerCase() !== passwordInput.trim().toLowerCase()) {
      setInviteStatus("Password does not match this group.");
      return;
    }
    if (!joinedViaLocal) {
      toggleGroupMembership(group.slug);
    }
    setInviteStatus("Password accepted. Full group access is now active.");
  };

  const submitQuestionnaire = () => {
    if (!group || group.joinMode !== "questionnaire") return;
    if (!viewerId) {
      setInviteStatus("Sign in first to send your questionnaire.");
      return;
    }
    if (questionnaireAnswers.some((answer) => !answer.trim())) {
      setInviteStatus("Please answer all questions before requesting access.");
      return;
    }
    if (!joinedViaLocal) {
      toggleGroupMembership(group.slug);
    }
    setInviteStatus("Questionnaire sent. In demo mode, the request is approved immediately.");
  };

  const membershipCta =
    group.accessType === "paid" ? (
      hasPaidAccess ? (
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
          Access active
        </span>
      ) : featureModes.appMode === "database" && featureModes.walletPaymentsEnabled ? (
        <WalletPurchaseControls targetType="subscription" creatorId={group.owner.id} compact />
      ) : (
        <button
          type="button"
          onClick={() => toggleSubscription(group.owner.id)}
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
        >
          Subscribe to join
        </button>
      )
    ) : viewerId ? (
      joinedViaLocal || isOwner ? (
        <button
          type="button"
          onClick={() => toggleGroupMembership(group.slug)}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition dark:border-stone-600 dark:text-stone-200"
        >
          Leave group
        </button>
      ) : group.accessType === "private" ? (
        <a
          href="#group-invite"
          onClick={() =>
            setInviteStatus(
              group.joinMode === "password"
                ? "Enter the group password below."
                : group.joinMode === "questionnaire"
                  ? "Answer the short questionnaire below."
                  : "Enter your invite code below to unlock this private group.",
            )
          }
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
        >
          {group.joinMode === "password"
            ? "Enter password"
            : group.joinMode === "questionnaire"
              ? "Apply to join"
              : "Use invite code"}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => toggleGroupMembership(group.slug)}
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
        >
          Join group
        </button>
      )
    ) : (
      <Link
        href="/sign-in"
        className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
      >
        Sign in to join
      </Link>
    );

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-8 pb-8">
      <section className={cn(panelClass(), "overflow-hidden p-6 sm:p-7 lg:p-8")}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", access.className)}>
                <AccessIcon className="h-3.5 w-3.5" />
                {access.label}
              </span>
              {group.priceCzk ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                  {group.priceCzk} CZK / access
                </span>
              ) : null}
              <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-500 dark:text-stone-300">
                {countryCode === "ALL" ? "All countries" : `Filtered to ${countryName}`}
              </span>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl lg:text-5xl">
                {group.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400 sm:text-base">
                {group.description}
              </p>
              <p className="mt-3 text-sm font-medium text-stone-700 dark:text-stone-300">{group.heroNote}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic((current) => (current === topic.slug ? null : topic.slug))}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    selectedTopic === topic.slug
                      ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                      : "border border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                  )}
                >
                  {topic.name}
                  {topicCounts.get(topic.slug) ? ` · ${topicCounts.get(topic.slug)}` : ""}
                </button>
              ))}
            </div>
          </div>

          <div className={cn(panelClass(), "space-y-4 p-5")}>
            <div className="flex items-center gap-3">
              <Avatar src={group.owner.avatarUrl} alt="" displayName={group.owner.displayName} size="sm" className="h-12 w-12" />
              <div>
                <div className="font-medium text-[color:var(--foreground)]">{group.owner.displayName}</div>
                <div className="text-sm text-stone-500 dark:text-stone-400">@{group.owner.username}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {membershipCta}
              <Link
                href="/groups"
                className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
              >
                All groups
              </Link>
            </div>
            {!hasAccess ? (
              <p className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                This is a preview mode. Join the community to search the full feed, unlock the full post list, and use the group like a shared travel workspace.
              </p>
            ) : null}
            {group.accessType === "private" && (isOwner || joinedViaLocal) && group.inviteCode ? (
              <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  Invite code
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <code className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                    {group.inviteCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyInviteCode()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copyStatus ?? "Copy"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className={cn(panelClass(), "px-5 py-4")}>
            <div className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--foreground)]">
              {item.value}
            </div>
            <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className={cn(panelClass(), "overflow-hidden")}>
          <MapView
            posts={mapPosts}
            className="h-[min(52vh,640px)] w-full rounded-[inherit] border-0 shadow-none"
            showPostOverlay={false}
          />
        </div>

        <div className={cn(panelClass(), "flex min-h-[320px] flex-col p-5")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Latest in this group</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {hasAccess ? "Fresh posts from the community feed." : "Preview posts until access is active."}
              </p>
            </div>
          </div>
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={!hasAccess}
              placeholder={hasAccess ? "Search within this group" : "Join to search the full group"}
              className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[color:var(--foreground)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {latestPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] px-4 py-10 text-center text-sm text-stone-500 dark:text-stone-400">
                Nothing matches the current group filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {latestPosts.map((post) => (
                  <PostCard key={post.id} post={post} compact strip stripDivider={false} href={`/post/${post.id}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={cn(panelClass(), "p-5")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Community posts</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {hasAccess ? "Use this as your group Explore feed." : "Preview cards while the full community stays gated."}
              </p>
            </div>
            {selectedTopic ? (
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="rounded-full border border-[color:var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
              >
                Clear topic
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {postsForDisplay.map((post) => (
              <PostCard key={post.id} post={post} compact strip stripDivider={false} href={`/post/${post.id}`} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          {!hasAccess && group.accessType === "private" ? (
            <div id="group-invite" className={cn(panelClass(), "p-5")}>
              <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
                {group.joinMode === "password"
                  ? "Join with password"
                  : group.joinMode === "questionnaire"
                    ? "Apply to join"
                    : "Join with invite"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                {group.joinMode === "password"
                  ? "This group opens with a shared password. Useful when a smaller circle wants one clear door into the space."
                  : group.joinMode === "questionnaire"
                    ? "This group uses a short fit check before entry. Good for sensitive places where expectations matter as much as the map."
                    : "Private groups stay small on purpose. Redeem your invite code to unlock full search, map context, and the complete post feed."}
              </p>
              {group.joinMode === "questionnaire" ? (
                <div className="mt-4 space-y-3">
                  {group.questionnaire?.prompt ? (
                    <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3 text-sm text-stone-600 dark:text-stone-300">
                      {group.questionnaire.prompt}
                    </div>
                  ) : null}
                  {group.questionnaire?.questions.map((question, index) => (
                    <label key={question} className="block space-y-1">
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                        {question}
                      </span>
                      <textarea
                        value={questionnaireAnswers[index] ?? ""}
                        onChange={(event) =>
                          setQuestionnaireAnswers((current) =>
                            current.map((answer, answerIndex) => (answerIndex === index ? event.target.value : answer)),
                          )
                        }
                        className="min-h-[90px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
                        placeholder="Write your answer..."
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={submitQuestionnaire}
                    className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
                  >
                    Send request
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <input
                    type={group.joinMode === "password" ? "password" : "text"}
                    value={group.joinMode === "password" ? passwordInput : inviteCodeInput}
                    onChange={(event) =>
                      group.joinMode === "password"
                        ? setPasswordInput(event.target.value)
                        : setInviteCodeInput(event.target.value)
                    }
                    placeholder={group.joinMode === "password" ? "Group password" : "FOREST-CIRCLE-27"}
                    className="h-11 flex-1 rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={group.joinMode === "password" ? submitPassword : redeemInvite}
                    disabled={group.joinMode === "password" ? !passwordInput.trim() : !inviteCodeInput.trim()}
                    className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
                  >
                    {group.joinMode === "password" ? "Unlock" : "Redeem"}
                  </button>
                </div>
              )}
              {group.joinMode === "password" && group.passwordHint ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--glass-border)] px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
                  Hint: {group.passwordHint}
                </div>
              ) : null}
              {inviteStatus ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--glass-border)] px-4 py-3 text-sm text-stone-600 dark:text-stone-300">
                  {inviteStatus}
                </div>
              ) : null}
            </div>
          ) : null}

          {!hasAccess && group.accessType === "paid" ? (
            <div className={cn(panelClass(), "p-5")}>
              <h2 className="text-xl font-semibold text-[color:var(--foreground)]">What unlocks</h2>
              <div className="mt-4 space-y-3">
                {group.perks.map((perk) => (
                  <div key={perk} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                One paid access model unlocks the community feed and keeps this group tied to a real creator relationship.
              </div>
            </div>
          ) : null}

          <div className={cn(panelClass(), "p-5")}>
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Entry model</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-300">
              <div className="flex items-center gap-2">
                {group.joinMode === "questionnaire" ? (
                  <MessageSquare className="h-4 w-4 text-stone-400" />
                ) : group.joinMode === "password" || group.joinMode === "invite_code" ? (
                  <Lock className="h-4 w-4 text-stone-400" />
                ) : (
                  <WalletCards className="h-4 w-4 text-stone-400" />
                )}
                <span>
                  {group.joinMode === "invite_code"
                    ? "Members enter with an explicit invite code."
                    : group.joinMode === "password"
                      ? "Members enter with a shared group password."
                      : group.joinMode === "questionnaire"
                        ? "Members answer a short questionnaire before joining."
                        : group.joinMode === "paid_subscription"
                          ? "Members enter by paying for creator access."
                          : "Members can join immediately."}
                </span>
              </div>
              <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-3">
                {group.isUserCreated
                  ? "This group was created inside the app and uses the same Explore-style structure as every other community."
                  : "This group uses the same surface model as Explore: map, latest posts, topics, and member context, just inside a shared community."}
              </div>
            </div>
          </div>

          <div className={cn(panelClass(), "p-5")}>
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Members</h2>
            <div className="mt-4 space-y-3">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar src={member.avatarUrl} alt="" displayName={member.displayName} size="sm" className="h-10 w-10" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[color:var(--foreground)]">{member.displayName}</div>
                    <div className="truncate text-xs text-stone-500 dark:text-stone-400">@{member.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(panelClass(), "p-5")}>
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Where this group travels</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.countryCodes.map((code) => (
                <span key={code} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {code}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
