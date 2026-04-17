"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCountryNameCs } from "@/lib/countries";

const STORAGE_KEY = "followable_selected_country";

type CountryContextValue = {
  countryCode: string;
  setCountryCode: (code: string) => void;
  countryName: string;
  isCzechia: boolean;
};

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [countryCode, setCountryState] = useState("CZ");

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "ALL") {
        setCountryState("ALL");
        return;
      }
      if (v && /^[A-Za-z]{2}$/.test(v)) {
        const c = v.toUpperCase();
        setCountryState(c);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setCountryCode = useCallback((code: string) => {
    const c = code.toUpperCase();
    if (c === "ALL") {
      setCountryState("ALL");
      try {
        localStorage.setItem(STORAGE_KEY, "ALL");
      } catch {
        /* ignore */
      }
      return;
    }
    if (!/^[A-Z]{2}$/.test(c)) return;
    setCountryState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CountryContextValue>(
    () => ({
      countryCode,
      setCountryCode,
      countryName: countryCode === "ALL" ? "Všechny země" : getCountryNameCs(countryCode),
      isCzechia: countryCode === "CZ",
    }),
    [countryCode, setCountryCode],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
