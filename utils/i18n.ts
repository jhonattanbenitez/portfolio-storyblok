import { SupportedLanguage, LanguageConfig } from './types';

// Language configuration
const LANGUAGES: LanguageConfig[] = [
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
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const HTML_LANGUAGES: Record<SupportedLanguage, string> = {
  en: 'en',
  'es-co': 'es-CO',
};

// Language detection utilities
export function detectLanguageFromPath(pathname: string): SupportedLanguage {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return DEFAULT_LANGUAGE;
  }
  
  const firstSegment = segments[0];
  
  // Check if first segment is a language code
  if (isValidLanguageCode(firstSegment)) {
    return firstSegment;
  }
  
  return DEFAULT_LANGUAGE;
}

function isValidLanguageCode(code: string): code is SupportedLanguage {
  return LANGUAGES.some(lang => lang.code === code);
}
