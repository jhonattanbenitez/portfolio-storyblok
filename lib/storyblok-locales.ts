import type { SupportedLanguage } from "../utils/types.ts";

type StoryblokLocaleContract = {
  cdaLanguage: "es-co" | undefined;
  mapiSuffix: "es_co" | null;
};

/** CDA language codes and MAPI raw-field suffixes are different contracts. */
export const STORYBLOK_LOCALES = {
  en: { cdaLanguage: undefined, mapiSuffix: null },
  "es-co": { cdaLanguage: "es-co", mapiSuffix: "es_co" },
} as const satisfies Record<SupportedLanguage, StoryblokLocaleContract>;
