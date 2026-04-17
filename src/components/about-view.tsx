"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useMemo } from "react";
import { Compass, MapPin, Shield, Sparkles, Users } from "@/components/icons";
import { useCountry } from "@/components/providers/country-context";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { getCountryNameCs } from "@/lib/countries";
import { getCountryLanding } from "@/lib/country-landing";
import { hydratePosts, topFollowedCreators, topPostsLastMonth } from "@/lib/discovery";
import { cn } from "@/lib/utils";

function glassCard() {
  return "rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md sm:p-5";
}

export function AboutView() {
  const { countryCode } = useCountry();
  const { snapshot, viewerId, featureModes } = useDemoStore();
  const countryLanding = getCountryLanding(countryCode, getCountryNameCs(countryCode));
  const topPosts = useMemo(() => {
    const lastMonth = topPostsLastMonth(snapshot, viewerId);
    if (lastMonth.length > 0) return lastMonth;
    return hydratePosts(snapshot, viewerId)
      .sort((a, b) => new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime())
      .slice(0, 10);
  }, [snapshot, viewerId]);
  const topCreatorsList = useMemo(() => topFollowedCreators(snapshot), [snapshot]);

  const useCases = [
    {
      step: 1,
      title: "Soukromé skupiny",
      body: "Jen vybraní lidé vidí přesné lokace — přátelé, kluby, placení členové.",
    },
    {
      step: 2,
      title: "Veřejně podle témat",
      body: "Vanlife, hidden spots, remote work — jedna mapa, mnoho komunitních kontextů.",
    },
    {
      step: 3,
      title: "Průvodci a cestovatelé",
      body: "Lokální průvodci sdílejí místa s časem a kontextem; objevování zůstává přehledné.",
    },
  ];

  return (
    <div className="space-y-10 pb-8 lg:space-y-12">
      <section
        className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-6 shadow-sm backdrop-blur-md sm:p-8"
        aria-labelledby="country-landing-heading"
      >
        <h2
          id="country-landing-heading"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl"
        >
          {countryLanding.title}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
          {countryLanding.body}
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Země v hlavičce: {getCountryNameCs(countryCode)} ({countryCode})
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200/20 bg-[linear-gradient(140deg,#121212_0%,#2d2114_38%,#4a6150_100%)] p-6 text-white shadow-[0_28px_90px_rgba(28,23,15,0.18)] sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/72">
            <Compass className="h-4 w-4" />
            O platformě
          </div>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Skrytá místa pro komunity, cestovatele a lokální experty.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200 sm:text-lg">
            Každý příspěvek má reálné souřadnice — prohlížíte mapu, region, téma i tvůrce. Rozhraní je
            dotykové a vyhledávání vede celým objevem, mapa není schovaná v druhé řadě.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <HeroBadge label={featureModes.appMode === "database" ? "Databázový režim" : "Demo režim"} />
          <HeroBadge label={`Geocode: ${featureModes.geocodingMode}`} />
          <HeroBadge label={`Mapa: ${featureModes.mapMode}`} />
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <StatPill label="Příspěvků" value={`${snapshot.posts.length}+`} />
          <StatPill label="Tvůrců" value={`${snapshot.users.length}`} />
          <StatPill label="Kolekcí" value={`${snapshot.collections.length}`} />
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
          Principy a funkce
        </h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Několik základních myšlenek, které drží objevování na mapě a zároveň flexibilní.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          <FeatureBlock
            icon={MapPin}
            title="Mapa jako hlavní plocha"
            description="Nejdřív místo. Regiony, témata a tvůrci se vždy vážou ke kartě — objev zůstává prostorový."
          />
          <FeatureBlock
            icon={Sparkles}
            title="Témata a komunity"
            description="Tagy a témata nechají na jedné mapě koexistovat různé komunity bez roztříštění."
          />
          <FeatureBlock
            icon={Shield}
            title="Viditelnost obsahu"
            description="Veřejné, jen pro předplatitele nebo časově omezené — tvůrce rozhoduje, kdo uvidí přesnou lokaci."
          />
          <FeatureBlock
            icon={Users}
            title="Prémiový přístup"
            description="Předplatné a jednorázové odemknutí podporují tvůrce a udržitelnost hodnotného obsahu."
          />
        </ul>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
          Typické použití
        </h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Tři scénáře, které platforma pokrývá — od soukromí po veřejné objevování.
        </p>
        <ol className="mt-6 space-y-0 border-l-2 border-[color:var(--glass-border)] pl-6">
          {useCases.map((uc) => (
            <li key={uc.step} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[calc(1.5rem+5px)] top-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-sm font-bold text-[color:var(--foreground)]">
                {uc.step}
              </span>
              <h3 className="font-semibold text-[color:var(--foreground)]">{uc.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{uc.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
          Top 10 příspěvků (poslední měsíc)
        </h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Výběr podle aktivity a data — stojí za rozkliknutí.
        </p>
        <ul className="mt-4 space-y-2">
          {topPosts.length === 0 ? (
            <li
              className={cn(
                "rounded-xl border border-dashed border-[color:var(--glass-border)] px-4 py-6 text-center text-sm text-stone-500 dark:text-stone-400",
                glassCard(),
              )}
            >
              Žádné příspěvky za posledních 30 dní.
            </li>
          ) : (
            topPosts.map((post, index) => {
              const thumb = post.media[0];
              return (
                <li key={post.id}>
                  <Link
                    href={`/post/${post.id}`}
                    className={cn(
                      "flex gap-4 overflow-hidden transition hover:border-stone-400 dark:hover:border-stone-500",
                      glassCard(),
                      "items-center py-3",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-200/80 text-xs font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                      {index + 1}
                    </span>
                    {thumb?.type === "image" && thumb.url ? (
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800">
                        <Image
                          src={thumb.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized={thumb.url.startsWith("data:")}
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-stone-200/60 text-[10px] text-stone-500 dark:bg-stone-800">
                        bez fotky
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[color:var(--foreground)] line-clamp-2">
                        {post.post.title}
                      </div>
                      <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        {post.locationSummary}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
          Top 10 sledovaných profilů
        </h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">Nejvíc sledovaní tvůrci v demu.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {topCreatorsList.map((creator) => (
            <Link
              key={creator.id}
              href={`/creator/${creator.username}`}
              className={cn(
                "flex items-center gap-3 transition hover:border-stone-400 dark:hover:border-stone-500",
                glassCard(),
              )}
            >
              <Avatar
                src={creator.avatarUrl}
                alt={creator.displayName}
                displayName={creator.displayName}
                className="h-12 w-12 shrink-0"
              />
              <div className="min-w-0">
                <div className="truncate font-medium text-[color:var(--foreground)]">
                  {creator.displayName}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">@{creator.username}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroBadge({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/82">
      {label}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/8 px-4 py-2 backdrop-blur">
      <span className="text-sm text-stone-200/80">{label}</span>
      <span className="ml-2 font-[family-name:var(--font-display)] font-semibold text-white">{value}</span>
    </div>
  );
}

function FeatureBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className={glassCard()}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-200/80 dark:bg-stone-700/80">
        <Icon className="h-5 w-5 text-stone-600 dark:text-stone-300" />
      </div>
      <h3 className="mt-3 font-semibold text-[color:var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{description}</p>
    </li>
  );
}
