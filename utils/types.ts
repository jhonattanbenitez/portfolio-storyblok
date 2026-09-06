// Base types for Storyblok content
export type ImageType = {
  id: number;
  alt: string;
  name: string;
  focus: string;
  title: string;
  source: string;
  filename: string;
  copyright: string;
  fieldtype: string;
  meta_data: {
    alt: string;
    title: string;
    source: string;
    copyright: string;
  };
};

export type CategoryRef = {
  id: string;
  url: string;
  linktype: string;
  fieldtype: string;
  cached_url: string;
  prep: boolean;
};

export type StoryblokBlock = {
  component: string;
  _uid?: string;
  [key: string]: unknown;
};

export type StoryContent = {
  _uid: string;
  date: string;
  slug: string;
  image: ImageType[];
  intro: string;
  title: string;
  content: string;
  component: string;
  language?: string;
  category_ref?: CategoryRef;
  body?: StoryblokBlock[];
};

export type Story = {
  name: string;
  created_at: string;
  published_at: string;
  updated_at: string;
  id: number;
  uuid: string;
  content: StoryContent;
  slug: string;
  full_slug: string;
  sort_by_date: null | string;
  position: number;
  tag_list: string[];
  is_startpage: boolean;
  parent_id: number;
  meta_data: null | Record<string, unknown>;
  group_id: string;
  first_published_at: string;
  release_id: null | string;
  lang: string;
  path: null | string;
  alternates: StoryAlternate[];
  default_full_slug: null | string;
  translated_slugs:
    | null
    | {
        lang: string;
        name?: string;
        path?: string;
        slug?: string;
      }[];
};

export type StoryAlternate = {
  id: number;
  name: string;
  slug: string;
  published: boolean;
  full_slug: string;
  is_folder: boolean;
  parent_id: number;
};

export type StoriesResponse = {
  stories: Story[];
  cv: number;
  rels: unknown[];
  links: unknown[];
};

export type AlternateURLs = {
  id: number;
  name: string;
  slug: string;
  full_slug: string;
  lang?: string;
};

// Enhanced API response types
export type StoryblokApiResponse<T = Story> = {
  story: T;
  cv: number;
  rels: unknown[];
  links: unknown[];
  alternates?: AlternateURLs[];
};

export type StoryblokStoriesResponse = {
  stories: Story[];
  cv: number;
  rels: unknown[];
  links: unknown[];
};

// Error handling types
export type ApiError = {
  message: string;
  status?: number;
  code?: string;
};

export type FetchStoryResult = {
  data: StoryblokApiResponse | null;
  error: ApiError | null;
  loading: boolean;
};

// Language and routing types
export type SupportedLanguage = "en" | "es-co";

export type LanguageConfig = {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
};

export type RouteParams = {
  slug?: string[];
};

// Component prop types
export type BaseComponentProps = {
  className?: string;
  children?: React.ReactNode;
};

export type LoadingStateProps = {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
};

// SEO and metadata types
export type SeoMetadata = {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
};

// Configuration types
export type AppConfig = {
  siteName: string;
  siteUrl: string;
  defaultLanguage: SupportedLanguage;
  supportedLanguages: LanguageConfig[];
  storyblok: {
    token: string;
    previewToken?: string;
    apiUrl: string;
  };
  analytics: {
    googleAnalyticsId: string;
  };
};

// Cache and performance types
export type CacheConfig = {
  revalidate: number;
  tags: string[];
};

export type FetchOptions = {
  version: "draft" | "published";
  language: SupportedLanguage;
  cache?: RequestCache;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};
