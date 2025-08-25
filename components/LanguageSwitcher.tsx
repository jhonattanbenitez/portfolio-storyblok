"use client";
import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";

const locales = ["en", "es-co"] as const;
type Lang = (typeof locales)[number];

function replaceLocaleInPath(pathname: string, next: Lang) {
  const parts = pathname.split("/").filter(Boolean);
  
  // Check if first part is a language
  const mightBeLang = parts[0];
  const isLang = locales.includes(mightBeLang as Lang);
  
  if (next === "en") {
    // For English, remove language prefix entirely
    if (isLang) {
      parts.shift(); // Remove language part
    }
    return parts.length === 0 ? "/" : "/" + parts.join("/");
  } else {
    // For non-English, add/replace language prefix
    if (isLang) {
      parts[0] = next;
    } else {
      parts.unshift(next);
    }
    return "/" + parts.join("/");
  }
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { setLanguage } = useLanguage();

  // detecta lang actual desde la ruta
  const current = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    return (locales.includes(first as Lang) ? (first as Lang) : "en");
  })();

  const go = (next: Lang) => {
    if (next === current) return;
    
    // Update the context to match URL language
    const contextLang = next === "es-co" ? "es" : "en";
    setLanguage(contextLang);
    
    const target = replaceLocaleInPath(pathname, next)
      + (search.size ? `?${search.toString()}` : "");
    router.push(target, { scroll: false });
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => go("en")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
          current === "en" ? "bg-blue-600 text-white shadow-md"
                           : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => go("es-co")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
          current === "es-co" ? "bg-blue-600 text-white shadow-md"
                              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        aria-label="Switch to Spanish"
      >
        ES
      </button>
    </div>
  );
}
