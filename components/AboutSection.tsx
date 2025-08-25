"use client";
import Image from "next/image";
import React, { useState, useTransition } from "react";
import TabButton from "./TabButton";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { useTranslation } from "../hooks/useTranslation";

interface ListItem {
  _uid: string;
  item: string;
  component: string;
}
type ImageType = {
  filename: string;
};

interface TabContent {
  id: string;
  _uid: string;
  title: string;
  content: ListItem[];
  component: string;
}

interface SBAboutData extends SbBlokData {
  about_me: string;
  skills: TabContent[];
  education: TabContent[];
  certifications: TabContent[];
  image?: ImageType[];
}

interface AboutSectionProps {
  blok: SBAboutData;
}

const AboutSection: React.FC<AboutSectionProps> = ({ blok }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>("skills");
  const [, startTransition] = useTransition();

  const educationData = blok.education.find((item) => item.id === "education");
  const certificationData = blok.education.find(
    (item) => item.id === "certifications"
  );

  // Dynamically generate TAB_DATA from the blok prop
  const TAB_DATA = [
    {
      title: t("about.skills"),
      id: "skills",
      content: (
        <ul className="list-disc pl-6 space-y-2">
          {blok.skills.map((skill) =>
            skill.content.map((item) => (
              <li key={item._uid} className="text-foreground/90">
                {item.item}
              </li>
            ))
          )}
        </ul>
      ),
    },
    {
      title: t("about.education"),
      id: "education",
      content: (
        <ul className="list-disc pl-6 space-y-2">
          {educationData?.content.map((edu) => (
            <li key={edu._uid} className="text-foreground/90">
              {edu.item}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: t("about.certifications"),
      id: "certifications",
      content: (
        <ul className="list-disc pl-6 space-y-2">
          {certificationData?.content.map((cert) => (
            <li key={cert._uid} className="text-foreground/90">
              {cert.item}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  const handleTabChange = (id: string) => {
    startTransition(() => {
      setTab(id);
    });
  };

  return (
    <section
      {...storyblokEditable(blok)}
      className="bg-background text-foreground py-16"
      aria-label={t("about.sectionLabel") ?? "About"}
    >
      <div className="md:grid md:grid-cols-2 gap-8 items-center py-8 px-4 xl:gap-16 sm:py-16 xl:px-16">
        <div className="md:flex md:justify-center">
          <Image
            src={blok.image?.[0]?.filename ?? "/default-profile.jpg"}
            width={500}
            height={500}
            alt="about us image"
            className="mx-auto rounded-lg shadow-lg"
          />
        </div>

        <div className="mt-4 md:mt-0 text-left flex flex-col h-[500px]">
          <h2 className="text-4xl font-bold mb-4">{t("about.title")}</h2>
          <p className="text-base md:text-lg mb-8 text-foreground/80">
            {blok.about_me}
          </p>

          {/* Tab Container */}
          <div className="flex-1 flex flex-col">
            {/* Tab Navigation */}
            <div className="flex flex-row border-b border-border">
              <TabButton
                selectTab={() => handleTabChange("skills")}
                active={tab === "skills"}
                role="tab"
                aria-controls="tabpanel-skills"
                id="tab-skills"
              >
                {t("about.skills")}
              </TabButton>
              <TabButton
                selectTab={() => handleTabChange("education")}
                active={tab === "education"}
                role="tab"
                aria-controls="tabpanel-education"
                id="tab-education"
              >
                {t("about.education")}
              </TabButton>
              <TabButton
                selectTab={() => handleTabChange("certifications")}
                active={tab === "certifications"}
                role="tab"
                aria-controls="tabpanel-certifications"
                id="tab-certifications"
              >
                {t("about.certifications")}
              </TabButton>
            </div>

            {/* Tab Content */}
            <div
              className="flex-1 bg-background border-l border-r border-b border-border rounded-b-lg p-6 shadow-sm"
              role="tabpanel"
              id={`tabpanel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              <div className="h-full overflow-y-auto">
                {TAB_DATA.find((t) => t.id === tab)?.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
