import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jhonattanbenitez.dev';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/preview/', '/live-preview/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
