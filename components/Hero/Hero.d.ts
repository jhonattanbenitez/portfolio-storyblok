import { SbBlokData } from "@storyblok/react";

export type ImageType = {
  filename: string;
};

export interface SBHeroData extends SbBlokData {
  list: { item: string; _uid: string; component: string }[];
  profile?: ImageType[];
}

export interface HeroProps {
  blok: SBHeroData;
}
