"use client";

import { getStoryblokClientApi } from "../lib/storyblok-client";

export default function StoryblokProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  getStoryblokClientApi();
  return children;
}
