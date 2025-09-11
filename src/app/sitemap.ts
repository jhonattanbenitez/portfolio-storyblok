import { MetadataRoute } from 'next';
import { generateSitemapData } from '../../utils/seo';
import { fetchStories } from '../../utils/fetchStories';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jhonattanbenitez.dev';
  
  try {
    // Fetch all published stories
    const storiesResponse = await fetchStories('published');
    const stories = storiesResponse?.stories || [];
    
    // Generate sitemap data
    const sitemapData = generateSitemapData(stories, baseUrl);
    
    return sitemapData;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Return basic sitemap if there's an error
    return [
      {
        url: baseUrl,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 1,
      },
    ];
  }
}
