import { storyblokInit } from "@storyblok/react/rsc";

export const getStoryblokClientApi = () => storyblokInit({
  accessToken: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN,
});

