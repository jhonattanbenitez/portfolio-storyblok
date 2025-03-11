import { ISbResponse } from "@storyblok/react/rsc";
import { getStoryblokApi } from "../lib/storyblok";

export const fetchStory = async (
  version: "draft" | "published",
  slug?: string[]
) => {
  getStoryblokApi();
  const correctSlug = `/${slug ? slug.join("/") : "home"}`;
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

  if (!token) {
    console.error("❌ Storyblok API Token is missing");
    return null;
  }

  return fetch(
    `
    https://api-us.storyblok.com/v2/cdn/stories${correctSlug}?version=${version}&token=${token}`,
    {
      next: { tags: ["cms"] },
      cache: version === "published" ? "default" : "no-store",
    }
  ).then((res) => res.json()) as Promise<{ story: ISbResponse }>;
};
