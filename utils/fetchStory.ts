import { ISbResponse } from "@storyblok/react/rsc";
import { getStoryblokApi } from "../lib/storyblok";

export const fetchStory = async (
  version: "draft" | "published",
  slug?: string[]
) => {
  getStoryblokApi();
  
  // Handle language and slug separation
  let language = "en";
  let storySlug = "home";
  
  if (slug && slug.length > 0) {
    // Check if first segment is a language code
    if (slug[0] === "es-co" || slug[0] === "es") {
      language = slug[0] === "es" ? "es-co" : slug[0];
      storySlug = slug.slice(1).join("/") || "home";
    } else {
      storySlug = slug.join("/");
    }
  }
  
  const correctSlug = `/${storySlug}`;
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

  if (!token) {
    console.error("Storyblok API Token is missing");
    return null;
  }

  const params = new URLSearchParams({
    version,
    token,
    language,
  });

  return fetch(
    `https://api-us.storyblok.com/v2/cdn/stories${correctSlug}?${params.toString()}`,
    {
      next: { tags: ["cms", `cms:${language}`] },
      cache: version === "published" ? "default" : "no-store",
    }
  ).then((res) => res.json()) as Promise<{ story: ISbResponse }>;
};
