"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HeaderSearchSlotValue = {
  content: ReactNode;
  setContent: (node: ReactNode) => void;
};

const HeaderSearchSlotContext = createContext<HeaderSearchSlotValue | null>(null);

export function HeaderSearchSlotProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode>(null);
  const setContent = useCallback((node: ReactNode) => {
    setContentState((prev) => (Object.is(prev, node) ? prev : node));
  }, []);
  const value = useMemo<HeaderSearchSlotValue>(
    () => ({ content, setContent }),
    [content, setContent],
  );
  return (
    <HeaderSearchSlotContext.Provider value={value}>
      {children}
    </HeaderSearchSlotContext.Provider>
  );
}

export function useHeaderSearchSlot(): HeaderSearchSlotValue | null {
  return useContext(HeaderSearchSlotContext);
}
