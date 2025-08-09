import { en } from "./en";
import { es } from "./es";

export const translations = {
  en,
  es,
} as const;

export type TranslationKey = keyof typeof en;
export type NestedTranslationKey<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${string & K}.${NestedTranslationKey<T[K]>}`
        : string & K;
    }[keyof T]
  : never;

export type AllTranslationKeys = NestedTranslationKey<typeof en>;
