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

export type StoryContent = {
  _uid: string;
  date: string;
  slug: string;
  image: ImageType[];
  intro: string;
  title: string;
  content: string;
  component: string;
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
  alternates: unknown[];
  default_full_slug: null | string;
  translated_slugs: null | unknown[];
};

export type StoriesResponse = {
  stories: Story[];
  cv: number;
  rels: unknown[];
  links: unknown[];
};
