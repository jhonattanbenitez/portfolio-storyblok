"use client";
import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAlternateLinks } from "../contexts/AlternateLinksContext";
import type { LocalizedUrl, SupportedLanguage } from "../utils/types";
import { appendQueryString, findLocalizedHref, switchPathLocale } from "../utils/storyUrls";

const locales = ["en", "es-co"] as const;
type Lang = (typeof locales)[number];

interface LanguageSwitcherProps {
  localizedUrls?: LocalizedUrl[];
}

export default function LanguageSwitcher({ localizedUrls }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { localizedUrls: contextUrls } = useAlternateLinks();
  const effectiveUrls = localizedUrls || contextUrls;

  // Detecta idioma actual desde la ruta
  const current: Lang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    return locales.includes(first as Lang) ? (first as Lang) : "en";
  })();
  const isAvailable = (locale: Lang) =>
    !effectiveUrls || Boolean(findLocalizedHref(effectiveUrls, locale));

  const go = (next: Lang) => {
    if (next === current) return;
    const href = effectiveUrls
      ? findLocalizedHref(effectiveUrls, next)
      : switchPathLocale(pathname, next as SupportedLanguage);
    if (!href) return;
    router.push(appendQueryString(href, search.toString()), { scroll: false });
  };

  return (
    <div
      className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800
      rounded-lg p-1 border border-gray-200 dark:border-gray-700"
    >
      <button
        onClick={() => go("en")}
        disabled={!isAvailable("en")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
          current === "en"
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => go("es-co")}
        disabled={!isAvailable("es-co")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
          current === "es-co"
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        aria-label="Switch to Spanish"
      >
        ES
      </button>
    </div>
  );
}
