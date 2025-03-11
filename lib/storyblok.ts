import { storyblokInit } from "@storyblok/react/rsc";

import Page from "../components/Page";
import Teaser from "../components/Teaser";
import Post from "../components/Post";
import Hero from "../components/Hero";
import AboutSection from "../components/AboutSection";
import ProjectsSection from "../components/ProjectsSection";
import ContactForm from "../components/ContactForm";

export const getStoryblokApi = storyblokInit({
  accessToken: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  components: {
    page: Page,
    teaser: Teaser,
    post: Post,
    hero: Hero,
    about: AboutSection,
    projects: ProjectsSection,
    contact: ContactForm,
  },
});
