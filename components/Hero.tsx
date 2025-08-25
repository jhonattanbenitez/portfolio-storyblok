"use client";
import React from "react";
import Image from "next/image";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import TextAnimation from "./TextAnimation";
import SocialLinks from "./SocialLinks";
import { useTranslation } from "../hooks/useTranslation";

type ImageType = {
  filename: string;
};

interface SBHeroData extends SbBlokData {
  list: { item: string; _uid: string; component: string }[];
  profile?: ImageType[];
}

interface HeroProps {
  blok: SBHeroData;
}

const Hero: React.FunctionComponent<HeroProps> = ({ blok }) => {
  const { t } = useTranslation();

  return (
    <section
      {...storyblokEditable(blok)}
      className="
        pt-[128px] lg:pt-32 lg:pb-16
        flex justify-center
        bg-muted
        text-foreground
      "
      aria-label={t("hero.sectionLabel") ?? "Hero"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-12">
        <div className="col-span-8 place-self-center text-center sm:text-left justify-self-start">
          <div className="col-span-8 place-self-center text-center sm:text-left justify-self-start">
            <h1 className="text-gray-900 dark:text-white mb-4 text-4xl sm:text-5xl lg:text-6xl lg:leading-normal font-extrabold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                {t("hero.title")}{" "}
              </span>
              <br />
              <TextAnimation list={blok.list} />
            </h1>
           <SocialLinks />
          </div>
        </div>

        <div className="col-span-4 place-self-center mt-5 lg:mt-0">
          <div className="rounded-full bg-gray-200 dark:bg-[#181818] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] relative">
            <Image
              src={blok.profile?.[0]?.filename ?? "/default-profile.jpg"}
              alt={t("hero.imageAlt")}
              width={240}
              height={240}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
