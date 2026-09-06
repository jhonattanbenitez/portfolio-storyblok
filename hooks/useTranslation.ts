import { usePathname } from "next/navigation";
import { translations, AllTranslationKeys } from "../translations";
import { detectLanguageFromPath } from "../utils/i18n";

export const useTranslation = () => {
  const language = detectLanguageFromPath(usePathname());

  const t = (key: AllTranslationKeys): string => {
    const keys = key.split(".");
    let value: unknown = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = (value as Record<string, unknown>)[fallbackKey];
          } else {
            return key; // Return the key itself if not found
          }
        }
        break;
      }
    }

    return typeof value === "string" ? value : key;
  };

  return { t, language };
};
