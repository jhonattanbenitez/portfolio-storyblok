import { Metadata } from 'next';
import { Story, SeoMetadata, SupportedLanguage } from './types';

// Default SEO configuration
const DEFAULT_SEO: SeoMetadata = {
  title: 'Jhonattan Benitez Portfolio',
  description: 'Hello, I\'m Jhonattan Benitez, a Front-End Developer. I specialize in building websites and web applications using modern technologies with an accessibility-first approach.',
  keywords: ['frontend developer', 'react', 'nextjs', 'typescript', 'portfolio', 'web development'],
  ogTitle: 'Jhonattan Benitez - Frontend Developer Portfolio',
  ogDescription: 'Frontend Developer specializing in React, Next.js, and modern web technologies with accessibility-first approach.',
  ogImage: '/og-image.jpg',
  twitterTitle: 'Jhonattan Benitez - Frontend Developer',
  twitterDescription: 'Frontend Developer specializing in React, Next.js, and modern web technologies.',
  twitterImage: '/twitter-image.jpg',
  canonical: 'https://jhonattanbenitez.dev',
  noindex: false,
  nofollow: false,
};

// Language-specific SEO configurations
const LANGUAGE_SEO: Record<SupportedLanguage, Partial<SeoMetadata>> = {
  en: {
    title: 'Jhonattan Benitez Portfolio',
    description: 'Hello, I\'m Jhonattan Benitez, a Front-End Developer. I specialize in building websites and web applications using modern technologies with an accessibility-first approach.',
    keywords: ['frontend developer', 'react', 'nextjs', 'typescript', 'portfolio', 'web development'],
  },
  'es-co': {
    title: 'Portafolio de Jhonattan Benitez',
    description: 'Hola, soy Jhonattan Benitez, un Desarrollador Frontend. Me especializo en construir sitios web y aplicaciones web usando tecnologías modernas con un enfoque de accesibilidad primero.',
    keywords: ['desarrollador frontend', 'react', 'nextjs', 'typescript', 'portafolio', 'desarrollo web'],
  },
};

// Generate metadata from Storyblok story
export function generateMetadataFromStory(
  story: Story | null,
  language: SupportedLanguage = 'en',
  pathname: string = '/'
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jhonattanbenitez.dev';
  const languageSeo = LANGUAGE_SEO[language] || LANGUAGE_SEO.en;
  
  // Merge default SEO with language-specific SEO
  const seoConfig: SeoMetadata = {
    ...DEFAULT_SEO,
    ...languageSeo,
  };

  // Override with story content if available
  if (story?.content) {
    const content = story.content;
    
    if (content.title) {
      seoConfig.title = content.title;
      seoConfig.ogTitle = content.title;
      seoConfig.twitterTitle = content.title;
    }
    
    if (content.intro) {
      seoConfig.description = content.intro;
      seoConfig.ogDescription = content.intro;
      seoConfig.twitterDescription = content.intro;
    }
    
    // Use story image for social media if available
    if (content.image && content.image.length > 0) {
      const imageUrl = content.image[0].source;
      seoConfig.ogImage = imageUrl;
      seoConfig.twitterImage = imageUrl;
    }
  }

  // Generate canonical URL
  const canonicalPath = pathname === '/' ? '' : pathname;
  seoConfig.canonical = `${baseUrl}${canonicalPath}`;

  // Generate structured data
  const structuredData = generateStructuredData(story, language, baseUrl);

  return {
    title: {
      default: seoConfig.title,
      template: `%s | ${seoConfig.title}`,
    },
    description: seoConfig.description,
    keywords: seoConfig.keywords?.join(', '),
    authors: [{ name: 'Jhonattan Benitez' }],
    creator: 'Jhonattan Benitez',
    publisher: 'Jhonattan Benitez',
    robots: {
      index: !seoConfig.noindex,
      follow: !seoConfig.nofollow,
      googleBot: {
        index: !seoConfig.noindex,
        follow: !seoConfig.nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: language === 'es-co' ? 'es_CO' : language,
      url: seoConfig.canonical,
      title: seoConfig.ogTitle || seoConfig.title,
      description: seoConfig.ogDescription || seoConfig.description,
      siteName: 'Jhonattan Benitez Portfolio',
      images: [
        {
          url: seoConfig.ogImage || '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: seoConfig.ogTitle || seoConfig.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoConfig.twitterTitle || seoConfig.title,
      description: seoConfig.twitterDescription || seoConfig.description,
      images: [seoConfig.twitterImage || '/twitter-image.jpg'],
      creator: '@jhonattanbenitez',
      site: '@jhonattanbenitez',
    },
    alternates: {
      canonical: seoConfig.canonical,
      languages: {
        'en': '/',
        'es-co': '/es-co',
      },
    },
    other: {
      'application/ld+json': JSON.stringify(structuredData),
    },
  };
}

// Generate structured data (JSON-LD)
function generateStructuredData(
  story: Story | null,
  language: SupportedLanguage,
  baseUrl: string
) {
  const isSpanish = language === 'es-co';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Jhonattan Benitez',
    jobTitle: isSpanish ? 'Desarrollador Frontend' : 'Frontend Developer',
    description: isSpanish 
      ? 'Desarrollador Frontend especializado en React, Next.js y tecnologías web modernas'
      : 'Frontend Developer specializing in React, Next.js, and modern web technologies',
    url: baseUrl,
    sameAs: [
      'https://github.com/jhonattanbenitez',
      'https://linkedin.com/in/jhonattanbenitez',
      'https://twitter.com/jhonattanbenitez',
    ],
    knowsAbout: [
      'React',
      'Next.js',
      'TypeScript',
      'JavaScript',
      'Web Development',
      'Frontend Development',
      'Accessibility',
    ],
    ...(story && {
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/${story.full_slug}`,
        name: story.content?.title || story.name,
        description: story.content?.intro,
        datePublished: story.first_published_at,
        dateModified: story.updated_at,
        author: {
          '@type': 'Person',
          name: 'Jhonattan Benitez',
        },
      },
    }),
  };
}

// Generate sitemap data
export function generateSitemapData(stories: Story[], baseUrl: string) {
  const sitemap = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/posts`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    // Spanish versions
    {
      url: `${baseUrl}/es-co`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/es-co/posts`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/es-co/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  // Add dynamic story pages
  stories.forEach((story) => {
    if (story.full_slug && story.full_slug !== 'home') {
      sitemap.push({
        url: `${baseUrl}/${story.full_slug}`,
        lastModified: story.updated_at,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      });
    }
  });

  return sitemap;
}

// Generate robots.txt content
export function generateRobotsTxt(baseUrl: string) {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and preview routes
Disallow: /admin/
Disallow: /preview/
Disallow: /live-preview/
`;
}
