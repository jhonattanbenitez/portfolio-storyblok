"use client";
import React, { useState, useRef } from "react";
import ProjectCard from "./ProjectCard";
import ProjectTag from "./ProjectTag";
import { motion, useInView } from "framer-motion";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { useTranslation } from "../hooks/useTranslation";

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
  const handleTagClick = (tag: string) => setSelectedTag(tag);

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

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

  const cardVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  };

  return (
    <section
      {...storyblokEditable(blok)}
      id="projects"
      className="relative z-10 bg-background pb-16"
      aria-label={t("projects.sectionLabel") ?? "Projects"}
    >
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="pt-16 mb-8 md:mb-12 text-center text-4xl font-bold text-foreground">
          {t("projects.title")}
        </h2>
        <div className="flex overflow-x-auto py-8 md:pb-12 md:justify-center md:flex-wrap md:gap-2">
          <div className="flex gap-2">
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
        <ul ref={ref} className="grid md:grid-cols-2 gap-8 md:gap-12">
          {filteredProjects.map((project, index) => (
            <motion.li
              key={project.id}
              variants={cardVariants}
              initial="initial"
              animate={isInView ? "animate" : "initial"}
              transition={{ duration: 0.3, delay: index * 0.1 }}
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
