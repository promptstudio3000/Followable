"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { signOutAction } from "@/app/auth-actions";
import { CountryPicker } from "@/components/country-picker";
import { DiscoveryHeaderSearchProvider } from "@/components/discovery-header-search-context";
import { HeaderGlobalSearch } from "@/components/header-global-search";
import { Bookmark, Compass, Heart, Info, Layers3, LogOut, Moon, Plus, Settings, Sun, User, Users } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/following", label: "Following", icon: Heart },
  { href: "/itinerary", label: "Trips", icon: Bookmark },
  { href: "/create", label: "Create", icon: Plus },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { viewer } = useDemoStore();
  const { theme, toggleTheme } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const showMobileNav = pathname !== "/create";
  const isFullBleedLayout = pathname === "/discover";
  const headerNavItems = primaryNavItems.filter((item) => item.href !== "/create");
  const signInHref = `/sign-in?next=${encodeURIComponent(pathname || "/")}`;
  const isActiveNavItem = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  return (
    <DiscoveryHeaderSearchProvider>
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)] text-[color:var(--foreground)]">
      <header className="sticky top-0 z-40 shrink-0 border-0 bg-[color:var(--header-bg)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 lg:gap-6">
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-amber-100 shadow-[0_14px_40px_rgba(32,24,13,0.12)]">
                  <Layers3 className="h-5 w-5" />
                </div>
                <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[color:var(--foreground)] sm:hidden">
                  Followable
                </span>
              </Link>
              <div className="min-w-0 sm:hidden">
                <CountryPicker />
              </div>
              <div className="hidden min-w-0 sm:block">
                <div className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[color:var(--foreground)]">
                  Followable
                </div>
                <div className="-mt-px leading-none">
                  <CountryPicker />
                </div>
              </div>
            </div>
            <Suspense
              fallback={<div className="h-9 min-w-0 flex-1 max-w-xl rounded-full bg-stone-200/40 dark:bg-stone-700/40" aria-hidden />}
            >
              <HeaderGlobalSearch />
            </Suspense>
            <nav className="hidden items-center gap-2 xl:flex">
              {headerNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActiveNavItem(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                      active
                        ? "border-transparent bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                        : "border-0 bg-white/70 text-stone-600 hover:bg-stone-100 dark:bg-white/10 dark:text-stone-300 dark:hover:bg-white/15",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/groups"
              className={cn(
                "hidden rounded-full border px-3 py-2 text-sm font-medium transition lg:inline-flex",
                isActiveNavItem("/groups")
                  ? "border-transparent bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "border-[color:var(--glass-border)] text-stone-600 hover:border-stone-400 dark:text-stone-300",
              )}
            >
              Groups
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white/80 text-stone-600 transition hover:bg-stone-100 dark:bg-white/10 dark:text-stone-300 dark:hover:bg-white/15"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/create"
              className="hidden rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 sm:inline-flex dark:!bg-stone-100 dark:!text-stone-900 dark:hover:!bg-white"
            >
              New post
            </Link>
            {viewer ? (
              <div className="relative shrink-0" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-stone-200/80 bg-white/90 shadow-sm transition hover:bg-white dark:border-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  <Avatar
                    src={viewer.avatarUrl}
                    alt=""
                    displayName={viewer.displayName}
                    size="sm"
                    className="!h-9 !w-9 rounded-full border-0"
                  />
                </button>
                {accountOpen ? (
                <div
                  className="fixed left-1/2 top-[4.25rem] z-50 w-[min(90vw,260px)] -translate-x-1/2 rounded-xl border border-stone-200 bg-white py-1 text-center shadow-lg dark:border-stone-600 dark:bg-stone-900 lg:absolute lg:left-auto lg:right-0 lg:top-[calc(100%+0.5rem)] lg:w-auto lg:min-w-[200px] lg:translate-x-0 lg:text-left"
                  role="menu"
                >
                  <>
                    <div className="border-b border-stone-100 px-3 py-2 dark:border-stone-700">
                      <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {viewer.displayName}
                      </div>
                      <div className="truncate text-xs text-stone-500">@{viewer.username}</div>
                    </div>
                    <Link
                      href={`/creator/${viewer.username}`}
                      className="block px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800 lg:text-left"
                      onClick={() => setAccountOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/groups"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800 lg:justify-start lg:text-left"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Users className="h-4 w-4 opacity-60" />
                      Groups
                    </Link>
                    <Link
                      href="/about"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800 lg:justify-start lg:text-left"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Info className="h-4 w-4 opacity-60" />
                      About
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800 lg:justify-start lg:text-left"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Settings className="h-4 w-4 opacity-60" />
                      Settings
                    </Link>
                    <form action={signOutAction} className="border-t border-stone-100 dark:border-stone-700">
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800 lg:justify-start lg:text-left"
                      >
                        <LogOut className="h-4 w-4 opacity-60" />
                        Log out
                      </button>
                    </form>
                  </>
                </div>
                ) : null}
              </div>
            ) : (
              <Link
                href={signInHref}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/90 px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-white dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                <User className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "mx-auto w-full max-w-none outline-none",
          isFullBleedLayout
            ? "flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0 pt-0 -mt-8"
            : "flex-1 pb-28 pt-6 lg:pb-12 px-4 sm:px-6 lg:px-8",
        )}
      >
        {children}
      </main>

      {showMobileNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--glass-border)] bg-[color:var(--header-bg-strong)] px-2 pb-[calc(0.5rem+var(--safe-bottom))] pt-2 backdrop-blur-2xl lg:hidden">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${primaryNavItems.length}, minmax(0, 1fr))` }}
          >
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveNavItem(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition",
                    item.href === "/create"
                      ? active
                        ? "bg-stone-950 text-white shadow-[0_18px_35px_rgba(23,23,23,0.18)]"
                        : "bg-white text-stone-900 shadow-[0_12px_30px_rgba(23,23,23,0.08)]"
                      : active
                        ? "bg-stone-950 text-white"
                        : "text-stone-600 hover:bg-white/80 dark:text-stone-300 dark:hover:bg-white/10",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
    </DiscoveryHeaderSearchProvider>
  );
}
