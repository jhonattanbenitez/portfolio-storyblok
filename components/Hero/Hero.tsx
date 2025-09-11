"use client";
import React from "react";
import Image from "next/image";
import { storyblokEditable } from "@storyblok/react";
import TextAnimation from "../TextAnimation";
import SocialLinks from "../SocialLinks";
import { useTranslation } from "../../hooks/useTranslation";
import { HeroProps } from "./Hero.d";
import { heroStyles } from "./Hero.style";

const Hero: React.FunctionComponent<HeroProps> = ({ blok }) => {
  const { t } = useTranslation();

  return (
    <section
      {...storyblokEditable(blok)}
      className={heroStyles.section}
      aria-label={t("hero.sectionLabel") ?? "Hero"}
    >
      <div className={heroStyles.grid}>
        <div className={heroStyles.content}>
          <h1 className={heroStyles.title}>
            <span className={heroStyles.titleGradient}>
              {t("hero.title")}{" "}
            </span>
            <br />
            <TextAnimation list={blok.list} />
          </h1>
          <SocialLinks />
        </div>

        <div className={heroStyles.imageContainer}>
          <div className={heroStyles.profileImageWrapper}>
            <Image
              src={blok.profile?.[0]?.filename ?? "/default-profile.jpg"}
              alt={t("hero.imageAlt")}
              width={240}
              height={240}
              className={heroStyles.profileImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
