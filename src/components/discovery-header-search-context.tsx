"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Value = {
  searchInput: string;
  setSearchInput: (v: string) => void;
};

const DiscoveryHeaderSearchContext = createContext<Value | null>(null);

export function DiscoveryHeaderSearchProvider({ children }: { children: ReactNode }) {
  const [searchInput, setSearchInputState] = useState("");
  const setSearchInput = useCallback((v: string) => {
    setSearchInputState(v);
  }, []);
  const value = useMemo(() => ({ searchInput, setSearchInput }), [searchInput, setSearchInput]);
  return (
    <DiscoveryHeaderSearchContext.Provider value={value}>{children}</DiscoveryHeaderSearchContext.Provider>
  );
}

export function useDiscoveryHeaderSearch(): Value {
  const ctx = useContext(DiscoveryHeaderSearchContext);
  if (!ctx) {
    throw new Error("useDiscoveryHeaderSearch requires DiscoveryHeaderSearchProvider");
  }
  return ctx;
}
