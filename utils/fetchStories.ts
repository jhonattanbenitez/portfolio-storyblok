import { StoriesResponse } from "./types";

export const fetchStories = async (
  version: "draft" | "published"
): Promise<StoriesResponse | null> => {
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

  if (!token) {
    console.error("❌ Storyblok API Token is missing");
    return null;
  }

  try {
    const response = await fetch(
      `https://api-us.storyblok.com/v2/cdn/stories?starts_with=posts/&version=${version}&token=${token}`,
      {
        next: { tags: ["cms"] },
        cache: version === "published" ? "default" : "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stories: ${response.statusText}`);
    }

    const data = await response.json();
    return data as StoriesResponse;
  } catch (error) {
    console.error("❌ Error fetching stories:", error);
    return null;
  }
};
