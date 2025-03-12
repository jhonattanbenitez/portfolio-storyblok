"use client";
import Image from "next/image";
import React, { useState, useTransition } from "react";
import TabButton from "./TabButton";
import { SbBlokData, storyblokEditable } from "@storyblok/react";

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
  const [tab, setTab] = useState<string>("skills");
  const [, startTransition] = useTransition();

  const educationData = blok.education.find((item) => item.id === "education");
  const certificationData = blok.education.find(
    (item) => item.id === "certifications"
  );

  // Dynamically generate TAB_DATA from the blok prop
  const TAB_DATA = [
    {
      title: "Skills",
      id: "skills",
      content: (
        <ul className="list-disc pl-2">
          {blok.skills.map((skill) =>
            skill.content.map((item) => <li key={item._uid}>{item.item}</li>)
          )}
        </ul>
      ),
    },
    {
      title: "Education",
      id: "education",
      content: (
        <ul className="list-disc pl-2">
          {educationData?.content.map((edu) => (
            <li key={edu._uid}>{edu.item}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Certifications",
      id: "certifications",
      content: (
        <ul className="list-disc pl-2">
          {certificationData?.content.map((cert) => (
            <li key={cert._uid}>{cert.item}</li>
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
      className="text-white bg-gray-900 py-16"
    >
      <div className="md:grid md:grid-cols-2 gap-8 items-center py-8 px-4 xl:gap-16 sm:py-16 xl:px-16">
        <Image
          src={blok.image?.[0]?.filename ?? "/default-profile.jpg"}
          width={500}
          height={500}
          alt="about us image"
        />
        <div className="mt-4 md:mt-0 text-left flex flex-col h-[500px]">
          <h2 className="text-4xl font-bold mb-4">About Me</h2>
          <p className="text-base md:text-lg">{blok.about_me}</p>
          <div className="flex flex-row mt-8">
            <TabButton
              selectTab={() => handleTabChange("skills")}
              active={tab === "skills"}
            >
              Skills
            </TabButton>
            <TabButton
              selectTab={() => handleTabChange("education")}
              active={tab === "education"}
            >
              Education
            </TabButton>
            <TabButton
              selectTab={() => handleTabChange("certifications")}
              active={tab === "certifications"}
            >
              Certifications
            </TabButton>
          </div>
          <div className="mt-8">
            {TAB_DATA.find((t) => t.id === tab)?.content}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
