"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Globe2, Lock, MessageSquare, Sparkles, Users, WalletCards } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useCountry } from "@/components/providers/country-context";
import type { TravelGroupAccessType, TravelGroupJoinMode } from "@/lib/types";
import { cn } from "@/lib/utils";

function panelClass() {
  return "rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur-md";
}

const joinModeOptions: Record<
  TravelGroupAccessType,
  { value: TravelGroupJoinMode; label: string; copy: string }[]
> = {
  public: [{ value: "open", label: "Open join", copy: "Anyone can enter and start sharing." }],
  private: [
    { value: "invite_code", label: "Invite code", copy: "Good for curated circles and trusted invites." },
    { value: "password", label: "Password", copy: "Simple shared gate for a smaller closed community." },
    { value: "questionnaire", label: "Questionnaire", copy: "Best when fit and etiquette matter." },
  ],
  paid: [{ value: "paid_subscription", label: "Paid entry", copy: "Join through creator access or community pricing." }],
};

export function GroupCreateView() {
  const router = useRouter();
  const { viewer, snapshot, createTravelGroup } = useDemoStore();
  const { countryCode, countryName } = useCountry();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [heroNote, setHeroNote] = useState("");
  const [accessType, setAccessType] = useState<TravelGroupAccessType>("private");
  const [joinMode, setJoinMode] = useState<TravelGroupJoinMode>("invite_code");
  const [countryCodesInput, setCountryCodesInput] = useState(countryCode === "ALL" ? "CZ, DE, AT" : countryCode);
  const [tagsInput, setTagsInput] = useState("");
  const [perksInput, setPerksInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [questionnairePrompt, setQuestionnairePrompt] = useState("");
  const [questionnaireQuestions, setQuestionnaireQuestions] = useState("");
  const [priceCzk, setPriceCzk] = useState("249");
  const [selectedTopicSlugs, setSelectedTopicSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const topics = snapshot.topics;

  useEffect(() => {
    const allowed = joinModeOptions[accessType].map((option) => option.value);
    if (!allowed.includes(joinMode)) {
      setJoinMode(allowed[0]!);
    }
  }, [accessType, joinMode]);

  const toggleTopic = (slug: string) => {
    setSelectedTopicSlugs((current) =>
      current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug],
    );
  };

  const activeJoinCopy = useMemo(
    () => joinModeOptions[accessType].find((option) => option.value === joinMode),
    [accessType, joinMode],
  );

  const submit = () => {
    if (!viewer) {
      setError("Sign in first to create a community.");
      return;
    }
    if (!name.trim() || !description.trim()) {
      setError("Name and description are required.");
      return;
    }
    if (selectedTopicSlugs.length === 0) {
      setError("Pick at least one topic for the group.");
      return;
    }
    if (joinMode === "password" && !password.trim()) {
      setError("Password groups need a password.");
      return;
    }
    if (joinMode === "questionnaire" && !questionnaireQuestions.trim()) {
      setError("Questionnaire groups need at least one question.");
      return;
    }
    if (accessType === "paid" && (!priceCzk.trim() || Number.isNaN(Number(priceCzk)))) {
      setError("Paid groups need a valid price.");
      return;
    }

    const slug = createTravelGroup({
      name,
      description,
      shortDescription: description.slice(0, 120),
      heroNote,
      accessType,
      joinMode,
      inviteCode:
        joinMode === "invite_code"
          ? inviteCode.trim() ||
            `${name
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")}-01`
          : null,
      password: joinMode === "password" ? password : null,
      passwordHint: joinMode === "password" ? passwordHint : null,
      questionnaire:
        joinMode === "questionnaire"
          ? {
              prompt:
                questionnairePrompt.trim() || "Tell the group how you travel and why you are a good fit.",
              questions: questionnaireQuestions
                .split("\n")
                .map((value) => value.trim())
                .filter(Boolean),
            }
          : null,
      priceCzk: accessType === "paid" ? Number(priceCzk) : null,
      perks: perksInput.split("\n").map((value) => value.trim()).filter(Boolean),
      countryCodes: countryCodesInput.split(",").map((value) => value.trim()).filter(Boolean),
      topicSlugs: selectedTopicSlugs,
      searchTags: tagsInput.split(",").map((value) => value.trim()).filter(Boolean),
    });

    if (!slug) {
      setError("Unable to create group right now.");
      return;
    }

    router.push(`/groups/${slug}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className={cn(panelClass(), "p-6 sm:p-7")}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
            <Users className="h-4 w-4" />
            Create community
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
            Create a group the same way travelers actually organize trust.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400 sm:text-base">
            Start with the use case, choose the entry model, then define countries, topics, and what members actually
            unlock. This first version keeps the creation flow lightweight so we can iterate fast in demo mode.
          </p>
        </div>

        <aside className={cn(panelClass(), "p-5")}>
          <div className="text-lg font-semibold text-[color:var(--foreground)]">Recommended creation model</div>
          <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-300">
            <div>1. Start from one strong use case: vanlife, family route, sunrise, work-friendly city, forest reset.</div>
            <div>2. Pick the right gate: open, invite, password, questionnaire, or paid.</div>
            <div>3. Keep the first scope narrow: a few countries and a small topic set beats a vague everything-group.</div>
            <div>4. Explain the value clearly: what members unlock, not just what they can browse.</div>
          </div>
        </aside>
      </section>

      {!viewer ? (
        <div className={cn(panelClass(), "px-6 py-12 text-center")}>
          <div className="text-lg font-semibold text-[color:var(--foreground)]">Sign in to create a group.</div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Community ownership should stay tied to a real profile.
          </p>
          <Link
            href="/sign-in"
            className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={cn(panelClass(), "space-y-6 p-5 sm:p-6")}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Group name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Forest Reset Circle"
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Who is this for and what do they unlock?"
                  className="min-h-[110px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Hero note</span>
                <input
                  type="text"
                  value={heroNote}
                  onChange={(event) => setHeroNote(event.target.value)}
                  placeholder="What mindset or traveler problem is this group built around?"
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">Access type</div>
                <div className="flex flex-wrap gap-2">
                  {(["public", "private", "paid"] as TravelGroupAccessType[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccessType(value)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                        accessType === value
                          ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                          : "border border-[color:var(--glass-border)] text-stone-600 dark:text-stone-300",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">Entry model</div>
                <div className="flex flex-wrap gap-2">
                  {joinModeOptions[accessType].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setJoinMode(option.value)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                        joinMode === option.value
                          ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                          : "border border-[color:var(--glass-border)] text-stone-600 dark:text-stone-300",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--glass-border)] px-4 py-4 text-sm text-stone-600 dark:text-stone-300">
              {activeJoinCopy?.copy}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Countries
                </span>
                <input
                  type="text"
                  value={countryCodesInput}
                  onChange={(event) => setCountryCodesInput(event.target.value)}
                  placeholder={`Current country: ${countryName}`}
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Search tags</span>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="vanlife, sunrise, quiet-city"
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">Topics</div>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.slug)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                      selectedTopicSlugs.includes(topic.slug)
                        ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                        : "border border-[color:var(--glass-border)] text-stone-600 dark:text-stone-300",
                    )}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Member perks</span>
              <textarea
                value={perksInput}
                onChange={(event) => setPerksInput(event.target.value)}
                placeholder={"One perk per line\nQuiet overnight pins\nRoad-tested planning notes"}
                className="min-h-[110px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
              />
            </label>

            {joinMode === "invite_code" ? (
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Invite code</span>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="Optional custom code"
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
            ) : null}

            {joinMode === "password" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Password</span>
                  <input
                    type="text"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Shared password"
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Password hint</span>
                  <input
                    type="text"
                    value={passwordHint}
                    onChange={(event) => setPasswordHint(event.target.value)}
                    placeholder="Optional hint"
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
              </div>
            ) : null}

            {joinMode === "questionnaire" ? (
              <div className="space-y-4">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Questionnaire intro</span>
                  <input
                    type="text"
                    value={questionnairePrompt}
                    onChange={(event) => setQuestionnairePrompt(event.target.value)}
                    placeholder="Tell the group how you travel and why you're a fit."
                    className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Questions</span>
                  <textarea
                    value={questionnaireQuestions}
                    onChange={(event) => setQuestionnaireQuestions(event.target.value)}
                    placeholder={"One question per line\nWhat kind of spots do you want to share?\nHow do you treat sensitive locations?"}
                    className="min-h-[110px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] outline-none"
                  />
                </label>
              </div>
            ) : null}

            {accessType === "paid" ? (
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Price (CZK)</span>
                <input
                  type="number"
                  min="0"
                  value={priceCzk}
                  onChange={(event) => setPriceCzk(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm text-[color:var(--foreground)] outline-none"
                />
              </label>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submit}
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
              >
                Create group
              </button>
              <Link
                href="/groups"
                className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
              >
                Back to groups
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className={cn(panelClass(), "p-5")}>
              <div className="text-lg font-semibold text-[color:var(--foreground)]">Creation preview</div>
              <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-300">
                <div className="flex items-center gap-2">
                  {accessType === "public" ? (
                    <Globe2 className="h-4 w-4 text-stone-400" />
                  ) : accessType === "paid" ? (
                    <WalletCards className="h-4 w-4 text-stone-400" />
                  ) : joinMode === "questionnaire" ? (
                    <MessageSquare className="h-4 w-4 text-stone-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-stone-400" />
                  )}
                  <span>
                    {accessType} · {activeJoinCopy?.label.toLowerCase()}
                  </span>
                </div>
                <div>{countryCodesInput || countryName}</div>
                <div>{selectedTopicSlugs.length} topics selected</div>
              </div>
            </div>
            <div className={cn(panelClass(), "p-5")}>
              <div className="text-lg font-semibold text-[color:var(--foreground)]">Why this matters</div>
              <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
                Groups should feel like Explore narrowed around one trusted use case. The creation flow therefore starts
                with scope and gatekeeping, not with endless settings.
              </p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
