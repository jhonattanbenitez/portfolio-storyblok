"use client";
import React, { useState } from "react";
import ProjectCard from "./ProjectCard";
import ProjectTag from "./ProjectTag";
import { motion, useReducedMotion } from "framer-motion";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { useTranslation } from "../hooks/useTranslation";
import { readMotionTransition } from "../lib/motion";

interface ImageType {
  id: string;
  alt: string;
  name: string;
  focus: string;
  title: string;
  source: string;
  filename: string;
  copyright: string;
  fieldtype: string;
  meta_data: Record<string, unknown>;
}

interface Multilink {
  id: string;
  url: string;
  linktype: string;
  fieldtype: string;
  cached_url: string;
}

interface ProjectData {
  _uid: string;
  tag: string[];
  image: ImageType[];
  title: string;
  gitUrl: Multilink;
  previewUrl: Multilink;
  description: string;
  component: string;
}

interface SBProjectsData extends SbBlokData {
  project: ProjectData[];
}

interface ProjectsSectionProps {
  blok: SBProjectsData;
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ blok }) => {
  const { t } = useTranslation();
  const [selectedTag, setSelectedTag] = useState("all");
  const shouldReduceMotion = useReducedMotion();
  const [filterTransition, setFilterTransition] = useState({ duration: 0, ease: [0, 0, 1, 1] as [number, number, number, number] });
  const handleTagClick = (tag: string) => {
    setFilterTransition(readMotionTransition(getComputedStyle(document.documentElement)));
    setSelectedTag(tag);
  };

  const projectsData = blok.project.map((project) => ({
    id: project._uid,
    title: project.title,
    description: project.description,
    image: project.image?.[0]?.filename || "/default-project.png",
    tag: project.tag || [],
    gitUrl: project.gitUrl?.url || "",
    previewUrl: project.previewUrl?.url || "",
  }));

  const filteredProjects = projectsData.filter((p) =>
    selectedTag === "all" ? true : p.tag.includes(selectedTag)
  );

  return (
    <section
      {...storyblokEditable(blok)}
      id="projects"
      className="relative z-10 overflow-x-clip bg-background py-16 md:py-24"
      aria-label={t("projects.sectionLabel") ?? "Projects"}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-foreground md:mb-12 md:text-4xl">
          {t("projects.title")}
        </h2>
        <div className="flex min-w-0 max-w-full overflow-x-auto py-8 md:flex-wrap md:justify-center md:gap-2 md:pb-12">
          <div className="flex w-max gap-2">
            <ProjectTag
              onClick={handleTagClick}
              name="all"
              isSelected={selectedTag === "all"}
            />
            <ProjectTag
              onClick={handleTagClick}
              name="web"
              isSelected={selectedTag === "web"}
            />
            <ProjectTag
              onClick={handleTagClick}
              name="accessibility"
              isSelected={selectedTag === "accessibility"}
            />
            <ProjectTag
              onClick={handleTagClick}
              name="ecommerce"
              isSelected={selectedTag === "ecommerce"}
            />
          </div>
        </div>

        {/* Cards */}
        <ul className="motion-project-list grid md:grid-cols-2 gap-8 md:gap-12">
          {filteredProjects.map((project, index) => (
            <motion.li
              key={project.id}
              initial={false}
              layout={!shouldReduceMotion && index < 4 ? "position" : false}
              transition={shouldReduceMotion ? { duration: 0 } : filterTransition}
            >
              <ProjectCard
                title={project.title}
                description={project.description}
                imgUrl={project.image}
                gitUrl={project.gitUrl}
                previewUrl={project.previewUrl}
              />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ProjectsSection;
