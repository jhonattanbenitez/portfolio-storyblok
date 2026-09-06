import { MetadataRoute } from 'next';
import { getSiteUrl } from '../../utils/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/preview/', '/live-preview/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
