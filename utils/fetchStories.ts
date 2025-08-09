import { StoriesResponse } from "./types";

type Language = "en" | "es" | "es-co";

interface FetchStoriesOpts {
  version: "draft" | "published";
  language?: Language;
  startsWith?: string; // opcional, por si cambias la carpeta
  perPage?: number; // opcional, paginación
}

export const fetchStories = async ({
  version,
  language = "en",
  startsWith = "posts/",
  perPage = 25,
}: FetchStoriesOpts): Promise<StoriesResponse | null> => {
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;
  if (!token) {
    console.error("Storyblok API Token is missing");
    return null;
  }

  const params = new URLSearchParams({
    token,
    version,
    starts_with: startsWith,
    language, 
    per_page: String(perPage),
    fallback_lang: "false",
  });

  try {
    const response = await fetch(
      `https://api-us.storyblok.com/v2/cdn/stories?${params.toString()}`,
      {
        next: { tags: ["cms", `cms:${language}`] }, 
        cache: version === "published" ? "default" : "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch stories: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as StoriesResponse;
    return data;
  } catch (error) {
    console.error("Error fetching stories:", error);
    return null;
  }
};
