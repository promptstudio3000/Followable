/** Shown from root `Suspense` while bootstrap + providers resolve (avoids a blank first paint). */
export function RootLoadingFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"
        aria-hidden
      />
      <p className="text-center text-sm font-medium">Načítám aplikaci…</p>
      <p className="max-w-sm text-center text-xs text-zinc-500 dark:text-zinc-400">
        První spuštění může chvíli trvat (data mapy a účty). Pokud to visí déle než minutu, zkontroluj Postgres a proměnnou{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-[0.7rem] dark:bg-zinc-800">DATABASE_URL</code>.
      </p>
    </div>
  );
}
