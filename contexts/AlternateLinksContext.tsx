"use client";

import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { LocalizedUrl } from "../utils/types";

type AlternateLinksContextValue = {
  localizedUrls?: LocalizedUrl[];
  setLocalizedUrls: (urls: LocalizedUrl[] | undefined) => void;
};

const AlternateLinksContext = createContext<AlternateLinksContextValue | undefined>(undefined);

export function AlternateLinksProvider({ children }: { children: ReactNode }) {
  const [localizedUrls, setLocalizedUrls] = useState<LocalizedUrl[]>();
  const value = useMemo(
    () => ({ localizedUrls, setLocalizedUrls }),
    [localizedUrls],
  );

  return (
    <AlternateLinksContext.Provider value={value}>
      {children}
    </AlternateLinksContext.Provider>
  );
}

export function AlternateLinksPublisher({ urls }: { urls: LocalizedUrl[] }) {
  const { setLocalizedUrls } = useAlternateLinks();
  useEffect(() => {
    setLocalizedUrls(urls);
    return () => setLocalizedUrls(undefined);
  }, [setLocalizedUrls, urls]);
  return null;
}

export function useAlternateLinks(): AlternateLinksContextValue {
  const context = useContext(AlternateLinksContext);
  if (!context) {
    throw new Error("useAlternateLinks must be used within AlternateLinksProvider");
  }
  return context;
}
