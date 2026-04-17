"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Globe2, Search } from "@/components/icons";
import { getCountriesSortedCs, getCountrySearchIndex, normalizeSearchText } from "@/lib/countries";
import { useCountry } from "@/components/providers/country-context";
import { cn } from "@/lib/utils";

export function CountryPicker() {
  const { countryCode, setCountryCode, countryName } = useCountry();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const list = useMemo(
    () => [
      { code: "ALL", name: "Všechny země" },
      ...getCountriesSortedCs(),
    ],
    [],
  );
  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return list;
    return list.filter(
      (x) => getCountrySearchIndex(x.code, x.name).includes(q),
    );
  }, [list, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const displayLabel = countryCode === "CZ" ? "Czechia" : countryName;
  const flagUrl = (code: string) => `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  const isAllCountries = countryCode === "ALL";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 border-0 bg-transparent p-0 text-left shadow-none outline-none ring-0 transition hover:opacity-80 focus-visible:underline"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-white/10">
          {isAllCountries ? (
            <Globe2 className="h-3.5 w-3.5 text-white/70" />
          ) : (
            <Image
              src={flagUrl(countryCode)}
              alt=""
              fill
              sizes="20px"
              className="object-cover"
            />
          )}
        </span>
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[color:var(--foreground)] sm:text-base">
          {displayLabel}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.45rem)] z-50 w-[min(calc(100vw-2rem),420px)] rounded-2xl border border-white/12 bg-black/72 p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:w-[min(calc(100vw-3rem),800px)] lg:w-[min(calc(100vw-6rem),960px)]"
          role="listbox"
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat stát…"
              className="w-full rounded-xl border border-white/12 bg-white/8 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/45 focus:ring-2 focus:ring-white/15"
              autoFocus
            />
          </div>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(({ code, name }) => {
                const selected = code === countryCode;
                const all = code === "ALL";
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setCountryCode(code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                      selected
                        ? "bg-white text-stone-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                        : "bg-white/8 text-white/88 hover:bg-white/14",
                    )}
                  >
                    <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/10">
                      {all ? (
                        <Globe2 className={cn("h-5 w-5", selected ? "text-stone-900" : "text-white/70")} />
                      ) : (
                        <Image
                          src={flagUrl(code)}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{name}</span>
                      <span className={cn("mt-0.5 block font-mono text-[11px]", selected ? "text-stone-600" : "text-white/55")}>
                        {code}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/55">Žádný stát nenalezen.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
