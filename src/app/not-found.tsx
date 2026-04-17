import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-8 text-center shadow-[0_20px_60px_rgba(27,24,19,0.08)] backdrop-blur-md sm:p-10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
        Tady nic není
      </div>
      <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        Odkaz je neplatný nebo stránka byla přesunuta. Zkus Discover, profil tvůrce nebo kolekce.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
      >
        Na hlavní stránku
      </Link>
    </div>
  );
}
