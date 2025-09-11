import { getStoryblokApi } from "../lib/storyblok";
import { 
  StoryblokApiResponse, 
  SupportedLanguage, 
  ApiError
} from "./types";

export const fetchStory = async (
  version: "draft" | "published",
  slug?: string[]
): Promise<StoryblokApiResponse | null> => {
  try {
    getStoryblokApi();
    
    const { language, storySlug } = parseSlugAndLanguage(slug);
    const correctSlug = `/${storySlug}`;
    const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

    if (!token) {
      const error: ApiError = {
        message: "Storyblok API Token is missing",
        code: "MISSING_TOKEN"
      };
      console.error(error.message);
      throw error;
    }

    const params = new URLSearchParams({
      version,
      token,
      language,
    });

    const response = await fetch(
      `https://api-us.storyblok.com/v2/cdn/stories${correctSlug}?${params.toString()}`,
      {
        next: { 
          tags: ["cms", `cms:${language}`, `story:${storySlug}`],
          revalidate: version === "published" ? 3600 : 0
        },
        cache: version === "published" ? "default" : "no-store",
      }
    );

    if (!response.ok) {
      const error: ApiError = {
        message: `Failed to fetch story: ${response.statusText}`,
        status: response.status,
        code: "FETCH_ERROR"
      };
      throw error;
    }

    const data = await response.json() as StoryblokApiResponse;
    
    if (!data.story) {
      const error: ApiError = {
        message: "Story not found",
        status: 404,
        code: "STORY_NOT_FOUND"
      };
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching story:", error);
    
    if (error && typeof error === 'object' && 'message' in error) {
      throw error as ApiError;
    }
    
    const unexpectedError: ApiError = {
      message: "An unexpected error occurred while fetching the story",
      code: "UNEXPECTED_ERROR"
    };
    throw unexpectedError;
  }
};

function parseSlugAndLanguage(slug?: string[]): { language: SupportedLanguage; storySlug: string } {
  let language: SupportedLanguage = "en";
  let storySlug = "home";
  
  if (slug && slug.length > 0) {
    if (slug[0] === "es-co" || slug[0] === "es") {
      language = slug[0] === "es" ? "es-co" : slug[0];
      storySlug = slug.slice(1).join("/") || "home";
    } else {
      storySlug = slug.join("/");
    }
  }
  
  return { language, storySlug };
}
