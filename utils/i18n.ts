import { SupportedLanguage, LanguageConfig } from './types';

// Language configuration
export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'es-co',
    name: 'Spanish (Colombia)',
    nativeName: 'Español (Colombia)',
    flag: '🇨🇴',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
  },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Language detection utilities
export function detectLanguageFromPath(pathname: string): SupportedLanguage {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return DEFAULT_LANGUAGE;
  }
  
  const firstSegment = segments[0];
  
  // Check if first segment is a language code
  if (isValidLanguageCode(firstSegment)) {
    return firstSegment as SupportedLanguage;
  }
  
  return DEFAULT_LANGUAGE;
}

export function detectLanguageFromHeaders(headers: Headers): SupportedLanguage {
  const acceptLanguage = headers.get('accept-language');
  
  if (!acceptLanguage) {
    return DEFAULT_LANGUAGE;
  }
  
  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0], // Get language code without region
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);
  
  // Find the best supported language
  for (const lang of languages) {
    if (lang.code === 'es') {
      return 'es-co'; // Default to Colombian Spanish
    }
    if (lang.code === 'en') {
      return 'en';
    }
  }
  
  return DEFAULT_LANGUAGE;
}

export function isValidLanguageCode(code: string): boolean {
  return LANGUAGES.some(lang => lang.code === code);
}

// Path manipulation utilities
export function addLanguageToPath(pathname: string, language: SupportedLanguage): string {
  if (language === DEFAULT_LANGUAGE) {
    return pathname;
  }
  
  // Remove existing language prefix if present
  const cleanPath = removeLanguageFromPath(pathname);
  
  // Add new language prefix
  return `/${language}${cleanPath === '/' ? '' : cleanPath}`;
}

export function removeLanguageFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return '/';
  }
  
  // Check if first segment is a language code
  if (isValidLanguageCode(segments[0])) {
    const remainingPath = segments.slice(1).join('/');
    return remainingPath ? `/${remainingPath}` : '/';
  }
  
  return pathname;
}

export function getLanguageFromPath(pathname: string): SupportedLanguage {
  return detectLanguageFromPath(pathname);
}

// Translation utilities
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return LANGUAGES.find(lang => lang.code === language) || LANGUAGES[0];
}

export function getAvailableLanguages(): LanguageConfig[] {
  return LANGUAGES;
}

// URL generation utilities
export function generateLocalizedUrl(
  pathname: string,
  language: SupportedLanguage,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  const localizedPath = addLanguageToPath(pathname, language);
  return `${base}${localizedPath}`;
}

export function generateAlternateUrls(
  pathname: string,
  baseUrl?: string
): Record<SupportedLanguage, string> {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  const urls: Record<SupportedLanguage, string> = {} as Record<SupportedLanguage, string>;
  
  LANGUAGES.forEach(lang => {
    urls[lang.code] = generateLocalizedUrl(pathname, lang.code, base);
  });
  
  return urls;
}

// Language switching utilities
export function switchLanguage(
  currentPath: string,
  targetLanguage: SupportedLanguage
): string {
  return addLanguageToPath(currentPath, targetLanguage);
}

// Content filtering utilities
export function filterContentByLanguage<T extends { lang?: string }>(
  content: T[],
  language: SupportedLanguage
): T[] {
  return content.filter(item => {
    if (!item.lang) return true; // Include content without language specification
    return item.lang === language;
  });
}

// RTL support
export function isRTL(): boolean {
  // Currently no RTL languages supported, but this can be extended
  return false;
}

// Date and number formatting
export function getLocaleForLanguage(language: SupportedLanguage): string {
  const localeMap: Record<SupportedLanguage, string> = {
    'en': 'en-US',
    'es-co': 'es-CO',
    'es': 'es-ES',
  };
  
  return localeMap[language] || 'en-US';
}

// Browser language detection (client-side)
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  
  const browserLang = navigator.language || navigator.languages?.[0];
  
  if (!browserLang) {
    return DEFAULT_LANGUAGE;
  }
  
  // Check for exact matches first
  if (browserLang === 'es-CO' || browserLang.startsWith('es-CO')) {
    return 'es-co';
  }
  
  if (browserLang === 'es-ES' || browserLang.startsWith('es-ES')) {
    return 'es';
  }
  
  // Check for language code matches
  if (browserLang.startsWith('es')) {
    return 'es-co'; // Default to Colombian Spanish
  }
  
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  
  return DEFAULT_LANGUAGE;
}
