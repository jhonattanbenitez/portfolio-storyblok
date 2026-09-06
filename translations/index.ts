import { en } from "./en";
import { es } from "./es";

type TranslationShape<T> = {
  [Key in keyof T]: T[Key] extends string
    ? string
    : TranslationShape<T[Key]>;
};

const spanishMessages: TranslationShape<typeof en> = es;

export const translations = {
  en,
  "es-co": spanishMessages,
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
