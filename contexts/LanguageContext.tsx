"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { SupportedLanguage } from "../utils/types";

type SlugMap = { [lang in SupportedLanguage]?: string };

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  slugMap?: SlugMap;
  setSlugMap: (map: SlugMap | undefined) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [slugMap, setSlugMap] = useState<SlugMap | undefined>(undefined);

  // Load language from URL on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const pathParts = pathname.split("/").filter(Boolean);
      const urlLanguage = pathParts[0];
      
      if (urlLanguage === "es-co") {
        setLanguage("es-co");
      } else if (urlLanguage === "es") {
        setLanguage("es");
      } else {
        setLanguage("en");
      }
    }
  }, []);

  // Listen for URL changes to sync language
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handlePopState = () => {
        const pathname = window.location.pathname;
        const pathParts = pathname.split("/").filter(Boolean);
        const urlLanguage = pathParts[0];
        
        if (urlLanguage === "es-co") {
          setLanguage("es-co");
        } else if (urlLanguage === "es") {
          setLanguage("es");
        } else {
          setLanguage("en");
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  // Save language to localStorage and cookie whenever it changes
  useEffect(() => {
    localStorage.setItem("preferred-language", language);
    // Also set as cookie for server-side access
    document.cookie = `preferred-language=${language}; path=/; max-age=31536000; SameSite=Lax`;
  }, [language]);

  const value: LanguageContextType = useMemo(() => ({
    language,
    setLanguage,
    slugMap,
    setSlugMap,
  }), [language, slugMap]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
