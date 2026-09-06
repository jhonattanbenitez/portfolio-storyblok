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
  responsiveCompact?: boolean;
}

export default function LanguageSwitcher({ localizedUrls, responsiveCompact = false }: LanguageSwitcherProps) {
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
      className={`flex items-center gap-1 rounded-md border border-border bg-secondary p-1 text-secondary-foreground ${responsiveCompact ? "h-8 lg:h-10" : "h-10"}`}
    >
      <button
        onClick={() => go("en")}
        disabled={!isAvailable("en")}
        className={`${responsiveCompact ? "h-6 px-2 text-xs lg:h-8 lg:px-3 lg:text-sm" : "h-8 px-3 text-sm"} rounded-md font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
          current === "en"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-background hover:text-foreground"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => go("es-co")}
        disabled={!isAvailable("es-co")}
        className={`${responsiveCompact ? "h-6 px-2 text-xs lg:h-8 lg:px-3 lg:text-sm" : "h-8 px-3 text-sm"} rounded-md font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
          current === "es-co"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-background hover:text-foreground"
        }`}
        aria-label="Switch to Spanish"
      >
        ES
      </button>
    </div>
  );
}
