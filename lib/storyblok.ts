import { storyblokInit } from "@storyblok/react/rsc";

import Page from "../components/Page";
import Teaser from "../components/Teaser";
import Post from "../components/Post";
import Hero from "../components/Hero";
import AboutSection from "../components/AboutSection";
import ProjectsSection from "../components/ProjectsSection";
import ContactForm from "../components/ContactForm";
import NavBar from "../components/NavBar";

export const getStoryblokApi = (preview = false) => {
  return storyblokInit({
    accessToken: preview
      ? process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN
      : process.env.NEXT_PUBLIC_STORYBLOK_TOKEN,
    components: {
      page: Page,
      teaser: Teaser,
      post: Post,
      hero: Hero,
      about: AboutSection,
      projects: ProjectsSection,
      contact: ContactForm,
      navigation: NavBar,
    },
  });
};
