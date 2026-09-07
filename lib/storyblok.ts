import { storyblokInit } from "@storyblok/react/rsc";

import Page from "../components/Page";
import Teaser from "../components/Teaser";
import Post from "../components/Post";
import Hero from "../components/Hero/Hero";
import AboutSection from "../components/AboutSection";
import ProjectsSection from "../components/ProjectsSection";
import ContactForm from "../components/ContactForm";

import CaseStudy from "../components/CaseStudyServer";
import CaseStudiesSection from "../components/CaseStudiesSection";
import LandingPage from "../components/Landing/LandingPage";
import LandingHero from "../components/Landing/LandingHero";
import LandingFeatures from "../components/Landing/LandingFeatures";
import LandingFeature from "../components/Landing/LandingFeature";
import LandingCaseStudy from "../components/Landing/LandingCaseStudy";
import LandingContactForm from "../components/Landing/LandingContactForm";

// Navigation is application-owned in the root layout. Legacy CMS navigation
// blocks remain valid content but intentionally render no second landmark.
const ApplicationOwnedNavigation = () => null;

export const getStoryblokApi = (preview = false) => {
  const isServer = typeof window === "undefined";
  const accessToken = preview
    ? (isServer ? process.env.STORYBLOK_PREVIEW_TOKEN : undefined) ||
      process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN
    : (isServer ? process.env.STORYBLOK_TOKEN : undefined) ||
      process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

  return storyblokInit({
    accessToken,
    components: {
      page: Page,
      teaser: Teaser,
      post: Post,
      hero: Hero,
      about: AboutSection,
      projects: ProjectsSection,
      contact: ContactForm,
      navigation: ApplicationOwnedNavigation,
      case_study: CaseStudy,
      case_studies_section: CaseStudiesSection,
      landing_page: LandingPage,
      landing_hero: LandingHero,
      landing_features: LandingFeatures,
      landing_feature: LandingFeature,
      landing_case_study: LandingCaseStudy,
      landing_contact: LandingContactForm,
    },
  });
};
