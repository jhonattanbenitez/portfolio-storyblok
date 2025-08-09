"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";

export type Language = "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  // Load language from URL on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const pathParts = pathname.split("/").filter(Boolean);
      const urlLanguage = pathParts[0];
      
      if (urlLanguage === "es-co" || urlLanguage === "es") {
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
        
        if (urlLanguage === "es-co" || urlLanguage === "es") {
          setLanguage("es");
        } else {
          setLanguage("en");
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  // Save language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("preferred-language", language);
  }, [language]);

  const value: LanguageContextType = useMemo(() => ({
    language,
    setLanguage,
  }), [language]);

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
