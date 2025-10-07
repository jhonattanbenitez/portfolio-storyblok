import { AppConfig, SupportedLanguage } from './types';
import { validateEnvironmentVariables } from './security';

// Application configuration
export const appConfig: AppConfig = {
  siteName: 'Jhonattan Benitez Portfolio',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://jhonattanbenitez.dev',
  defaultLanguage: 'en' as SupportedLanguage,
  supportedLanguages: [
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
  ],
  storyblok: {
    token: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN || '',
    previewToken: process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN,
    apiUrl: 'https://api-us.storyblok.com/v2/cdn',
  },
  analytics: {
    googleAnalyticsId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || 'G-ZT1LVQ4YHC',
  },
};

// Validate configuration on startup
export function validateConfig(): void {
  try {
    validateEnvironmentVariables();
    
    // Additional configuration validation
    if (!appConfig.storyblok.token) {
      throw new Error('Storyblok token is required');
    }
    
    if (!appConfig.siteUrl) {
      throw new Error('Site URL is required');
    }
    
    // Validate URL format
    try {
      new URL(appConfig.siteUrl);
    } catch {
      throw new Error('Invalid site URL format');
    }
    
    console.log('Configuration validated successfully');
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw error;
  }
}

// Feature flags
export const featureFlags = {
  enableAnalytics: process.env.NODE_ENV === 'production',
  enablePreviewMode: process.env.NODE_ENV === 'development',
  enableDebugMode: process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring: process.env.NODE_ENV === 'production',
  enableErrorReporting: process.env.NODE_ENV === 'production',
} as const;

// Cache configuration
export const cacheConfig = {
  defaultRevalidate: 3600, // 1 hour
  maxAge: 86400, // 24 hours
  staleWhileRevalidate: 604800, // 7 days
} as const;

// API configuration
export const apiConfig = {
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
} as const;

// Image optimization configuration
export const imageConfig = {
  quality: 80,
  formats: ['image/webp', 'image/avif'] as const,
  sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder: 'blur' as const,
} as const;

// SEO configuration
export const seoConfig = {
  defaultTitle: 'Jhonattan Benitez Portfolio',
  titleTemplate: '%s | Jhonattan Benitez',
  defaultDescription: 'Frontend Developer specializing in React, Next.js, and modern web technologies with accessibility-first approach.',
  keywords: [
    'frontend developer',
    'react',
    'nextjs',
    'typescript',
    'portfolio',
    'web development',
    'accessibility',
  ],
  social: {
    twitter: '@jhonattanbenitez',
    github: 'jhonattanbenitez',
    linkedin: 'jhonattanbenitez',
  },
} as const;

// Development configuration
export const devConfig = {
  enableSourceMaps: process.env.NODE_ENV === 'development',
  enableHotReload: process.env.NODE_ENV === 'development',
  enableDebugLogs: process.env.NODE_ENV === 'development',
  enablePerformanceProfiling: process.env.NODE_ENV === 'development',
} as const;

// Production configuration
export const prodConfig = {
  enableCompression: true,
  enableMinification: true,
  enableTreeShaking: true,
  enableCodeSplitting: true,
} as const;

// Environment-specific configuration
export function getConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    ...appConfig,
    featureFlags,
    cache: cacheConfig,
    api: apiConfig,
    image: imageConfig,
    seo: seoConfig,
    ...(isDevelopment && devConfig),
    ...(isProduction && prodConfig),
  };
}

// Configuration validation on module load
if (typeof window === 'undefined') {
  // Only validate on server side
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration validation failed:', error);
  }
}
