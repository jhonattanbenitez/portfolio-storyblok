"use client";
import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";

const locales = ["en", "es-co"] as const;
type Lang = (typeof locales)[number];

type SlugMap = { [lang in Lang]?: string };

function normalizeSlug(slug?: string) {
  return slug?.replace(/^(en\/|es-co\/)?(posts\/)?/, "") || "";
}

function replaceLocaleAndSlug(pathname: string, next: Lang, slugMap?: SlugMap) {
  const parts = pathname.split("/").filter(Boolean);
  const postsIdx = parts.findIndex((p) => p === "posts");

  const normalizedSlug = normalizeSlug(slugMap?.[next]);

  if (postsIdx !== -1) {
    if (normalizedSlug) {
      if (parts.length <= postsIdx + 1) {
        parts.push(normalizedSlug);
      } else {
        parts[postsIdx + 1] = normalizedSlug;
      }
    }
  }

  if (next === "en") {
    // Quita "es-co" si existe
    if (parts[0] === "es-co") parts.shift();
  } else {
    if (parts[0] !== "es-co") parts.unshift("es-co");
  }

  return "/" + parts.join("/");
}

interface LanguageSwitcherProps {
  slugMap?: SlugMap;
}

export default function LanguageSwitcher({ slugMap }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { setLanguage, slugMap: contextSlugMap } = useLanguage();

  // Usa el slugMap del contexto si no se pasa por props
  const effectiveSlugMap = slugMap || contextSlugMap;

  // Detecta idioma actual desde la ruta
  const current: Lang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    return locales.includes(first as Lang) ? (first as Lang) : "en";
  })();

  const go = (next: Lang) => {
    if (next === current) return;
    setLanguage(next);

    const target =
      replaceLocaleAndSlug(pathname, next, effectiveSlugMap) +
      (search.size ? `?${search.toString()}` : "");

    router.replace(target, { scroll: false });
  };

  return (
    <div
      className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800
      rounded-lg p-1 border border-gray-200 dark:border-gray-700"
    >
      <button
        onClick={() => go("en")}
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
