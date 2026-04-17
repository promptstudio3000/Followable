"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ArrowUpRight, Globe2, Lock, MessageSquare, Search, Sparkles, Users, WalletCards } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useCountry } from "@/components/providers/country-context";
import { findTravelGroupByInviteCode, normalizeTravelGroupInviteCode, getTravelGroupSummaries } from "@/lib/travel-groups";
import { cn } from "@/lib/utils";

type AccessFilter = "all" | "public" | "private" | "paid";

function accessLabel(accessType: AccessFilter | "public" | "private" | "paid") {
  if (accessType === "public") return "Public";
  if (accessType === "private") return "Private";
  if (accessType === "paid") return "Paid";
  return "All";
}

function accessIcon(accessType: "public" | "private" | "paid") {
  if (accessType === "public") return Globe2;
  if (accessType === "private") return Lock;
  return WalletCards;
}

function accessClass(accessType: "public" | "private" | "paid") {
  if (accessType === "public") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (accessType === "private") return "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200";
  return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
}

function joinModeLabel(joinMode: "open" | "invite_code" | "password" | "questionnaire" | "paid_subscription") {
  if (joinMode === "invite_code") return "Invite code";
  if (joinMode === "password") return "Password";
  if (joinMode === "questionnaire") return "Questionnaire";
  if (joinMode === "paid_subscription") return "Paid access";
  return "Open join";
}

export function GroupsView() {
  const router = useRouter();
  const { snapshot, hydratedPosts, localState, viewerId } = useDemoStore();
  const { countryCode, countryName } = useCountry();
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const groups = useMemo(() => getTravelGroupSummaries(snapshot, hydratedPosts, localState), [hydratedPosts, localState, snapshot]);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups.filter((group) => {
      const countryMatch =
        countryCode === "ALL" ? true : group.countryCodes.some((code) => code.toUpperCase() === countryCode);
      const accessMatch = accessFilter === "all" ? true : group.accessType === accessFilter;
      const textMatch = !needle
        ? true
        : [
            group.name,
            group.description,
            group.owner.displayName,
            group.countryCodes.join(" "),
            group.topics.map((topic) => topic.name).join(" "),
            group.searchTags.join(" "),
            joinModeLabel(group.joinMode),
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle);
      return countryMatch && accessMatch && textMatch;
    });
  }, [accessFilter, countryCode, groups, query]);

  const joinedCount = useMemo(() => {
    return groups.filter((group) => {
      if (group.owner.id === viewerId) return true;
      if (group.accessType === "paid") return localState.subscriptionCreatorIds.includes(group.owner.id);
      return localState.joinedGroupSlugs.includes(group.slug);
    }).length;
  }, [groups, localState.joinedGroupSlugs, localState.subscriptionCreatorIds, viewerId]);

  const stats = [
    { label: "Visible groups", value: visibleGroups.length },
    { label: "Joined", value: joinedCount },
    {
      label: countryCode === "ALL" ? "Countries covered" : `${countryName} groups`,
      value:
        countryCode === "ALL"
          ? new Set(groups.flatMap((group) => group.countryCodes.map((code) => code.toUpperCase()))).size
          : visibleGroups.length,
    },
    {
      label: "Shared posts",
      value: visibleGroups.reduce((sum, group) => sum + group.postCount, 0),
    },
  ];

  const redeemInviteCode = () => {
    const group = findTravelGroupByInviteCode(snapshot, hydratedPosts, inviteCode, localState);
    if (!group) {
      setInviteError("Invite code not found. Double-check the code and try again.");
      return;
    }
    setInviteError(null);
    router.push(`/groups/${group.slug}?invite=${encodeURIComponent(normalizeTravelGroupInviteCode(inviteCode))}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-8">
      <section className="space-y-5">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
            <Users className="h-4 w-4" />
            Communities
          </div>
          <div className="space-y-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl lg:text-5xl">
              Shared groups for travelers who want context, not just pins.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400 sm:text-base">
              Browse public circles, invite-only groups, and paid communities built around practical travel knowledge.
              This list respects your active country selection, so it stays relevant when we switch between regions.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/groups/create"
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
              >
                Create group
              </Link>
              <span className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm text-stone-500 dark:text-stone-400">
                Build public, private, questionnaire, password, or paid communities
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_auto] md:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search group, topic, owner, or theme"
              className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] py-3 pl-11 pr-4 text-sm text-[color:var(--foreground)] outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-300/30 dark:focus:ring-stone-600/40"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "public", "private", "paid"] as AccessFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccessFilter(value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  accessFilter === value
                    ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                    : "border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
                )}
              >
                {accessLabel(value)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Public groups",
              copy: "Fastest way to browse shared local knowledge without any friction.",
            },
            {
              title: "Private invites",
              copy: "Smaller trust-based spaces for sensitive locations and invite-only sharing.",
            },
            {
              title: "Paid communities",
              copy: "Premium layers for route-tested knowledge, planning context, and richer access.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-5 py-4 backdrop-blur-md">
              <div className="text-sm font-semibold text-[color:var(--foreground)]">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">{item.copy}</div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
          <div className="text-lg font-semibold text-[color:var(--foreground)]">Redeem invite</div>
          <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
            Got an invite code for a private group? Paste it here and we’ll take you straight into the join flow.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="FOREST-CIRCLE-27"
              className="h-11 flex-1 rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
            />
            <button
              type="button"
              onClick={redeemInviteCode}
              disabled={!inviteCode.trim()}
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-950"
            >
              Continue
            </button>
          </div>
          {inviteError ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              {inviteError}
            </div>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-5 py-4 backdrop-blur-md"
          >
            <div className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--foreground)]">
              {item.value}
            </div>
            <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleGroups.map((group) => {
          const AccessIcon = accessIcon(group.accessType);
          const joined =
            group.owner.id === viewerId ||
            (group.accessType === "paid"
              ? localState.subscriptionCreatorIds.includes(group.owner.id)
              : localState.joinedGroupSlugs.includes(group.slug));

          return (
            <Link
              key={group.slug}
              href={`/groups/${group.slug}`}
              className="group rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md transition hover:border-stone-400 dark:hover:border-stone-500"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", accessClass(group.accessType))}>
                      <AccessIcon className="h-3.5 w-3.5" />
                      {accessLabel(group.accessType)}
                    </span>
                    <span className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {group.joinMode === "questionnaire" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {joinModeLabel(group.joinMode)}
                        </span>
                      ) : (
                        joinModeLabel(group.joinMode)
                      )}
                    </span>
                    {group.priceCzk ? (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                        {group.priceCzk} CZK
                      </span>
                    ) : null}
                    {joined ? (
                      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
                        Joined
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
                        {group.name}
                      </h2>
                      <ArrowUpRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
                      {group.shortDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={group.owner.avatarUrl}
                    alt=""
                    displayName={group.owner.displayName}
                    size="sm"
                    className="h-9 w-9"
                  />
                  <div>
                    <div className="text-sm font-medium text-[color:var(--foreground)]">{group.owner.displayName}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">@{group.owner.username}</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-[color:var(--glass-border)]" />
                <div className="text-sm text-stone-600 dark:text-stone-300">
                  {group.memberCount} members · {group.postCount} posts
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {group.topics.slice(0, 4).map((topic) => (
                  <span
                    key={topic.id}
                    className="rounded-full border border-[color:var(--glass-border)] px-3 py-1 text-xs font-medium text-stone-600 dark:text-stone-300"
                  >
                    {topic.name}
                  </span>
                ))}
                {group.countryCodes.slice(0, 4).map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      {visibleGroups.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[color:var(--glass-border)] px-6 py-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-stone-400" />
          <div className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">No groups match this filter yet.</div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Try another country, broader access type, or a topic like vanlife, sunrise, or local guides.
          </p>
        </div>
      ) : null}
    </div>
  );
}
