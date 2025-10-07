import { StoryblokStory } from "@storyblok/react/rsc";
import { fetchStory } from "../../../utils/fetchStory";
import { generateMetadataFromStory } from "../../../utils/seo";
import { notFound } from "next/navigation";
import { RouteParams, SupportedLanguage } from "../../../utils/types";
import { Metadata } from "next";

export async function generateStaticParams() {
  // Generate static params for known routes
  return [
    { slug: [] },
    { slug: ['posts'] },
    { slug: ['contact'] },
    { slug: ['es-co'] },
    { slug: ['es-co', 'posts'] },
    { slug: ['es-co', 'contact'] },
  ];
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<RouteParams> 
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    
    // Determine language from slug
    let language: SupportedLanguage = 'en';
    if (slug && slug.length > 0) {
      if (slug[0] === 'es-co' || slug[0] === 'es') {
        language = slug[0] === 'es' ? 'es-co' : slug[0];
      }
    }
    
    // Fetch story data for metadata
    const pageData = await fetchStory("published", slug);
    const story = pageData?.story || null;
    
    // Generate pathname for canonical URL
    const pathname = slug ? `/${slug.join('/')}` : '/';
    
    return generateMetadataFromStory(story, language, pathname);
  } catch (error) {
    console.error("Error generating metadata:", error);
    
    // Return default metadata on error
    return generateMetadataFromStory(null, 'en', '/');
  }
}

export default async function Home({ params }: { params: Promise<RouteParams> }) {
  try {
    const { slug } = await params;
    const pageData = await fetchStory("published", slug);

    if (!pageData?.story) {
      notFound();
    }

    return <StoryblokStory story={pageData.story} alternates={pageData.story.alternates}/>;
  } catch (error) {
    console.error("Error in page component:", error);
    notFound();
  }
}
