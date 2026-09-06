"use client";

import React, { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { SupportedLanguage } from "../utils/types";

type SlugMap = Partial<Record<SupportedLanguage, string>>;

type AlternateLinksContextValue = {
  slugMap?: SlugMap;
  setSlugMap: (map: SlugMap | undefined) => void;
};

const AlternateLinksContext = createContext<AlternateLinksContextValue | undefined>(undefined);

export function AlternateLinksProvider({ children }: { children: ReactNode }) {
  const [slugMap, setSlugMap] = useState<SlugMap>();
  const value = useMemo(() => ({ slugMap, setSlugMap }), [slugMap]);

  return (
    <AlternateLinksContext.Provider value={value}>
      {children}
    </AlternateLinksContext.Provider>
  );
}

export function useAlternateLinks(): AlternateLinksContextValue {
  const context = useContext(AlternateLinksContext);
  if (!context) {
    throw new Error("useAlternateLinks must be used within AlternateLinksProvider");
  }
  return context;
}
