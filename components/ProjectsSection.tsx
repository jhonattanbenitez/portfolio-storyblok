"use client";
import React, { useState, useRef } from "react";
import ProjectCard from "./ProjectCard";
import ProjectTag from "./ProjectTag";
import { motion, useInView } from "framer-motion";
import { SbBlokData, storyblokEditable } from "@storyblok/react";

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
  const [selectedTag, setSelectedTag] = useState("all");
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
  };
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  // Dynamically generate projectsData from the blok prop
  const projectsData = blok.project.map((project) => ({
    id: project._uid,
    title: project.title,
    description: project.description,
    image: project.image[0]?.filename || "/default-project.png",
    tag: project.tag,
    gitUrl: project.gitUrl.url,
    previewUrl: project.previewUrl.url,
  }));

  const filteredProjects = projectsData.filter((project) => {
    if (selectedTag === "all") {
      return true;
    }
    return project.tag.includes(selectedTag);
  });

  const cardVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  };

  return (
    <section
      {...storyblokEditable(blok)}
      id="projects"
      className="relative z-10 pb-16 bg-gray-900"
    >
      <h2 className="text-center text-4xl font-bold text-white mb-8 md:mb-12 pt-16">
        My Projects
      </h2>
      <div className="text-white flex flex-row justify-center items-center gap-2 pb-16">
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
      <ul ref={ref} className="grid md:grid-cols-2 gap-8 md:gap-12 px-4">
        {filteredProjects.map((project, index) => (
          <motion.li
            key={project.id}
            variants={cardVariants}
            initial="initial"
            animate={isInView ? "animate" : "initial"}
            transition={{ duration: 0.3, delay: index * 0.4 }}
          >
            <ProjectCard
              key={project.id}
              title={project.title}
              description={project.description}
              imgUrl={project.image}
              gitUrl={project.gitUrl}
              previewUrl={project.previewUrl}
            />
          </motion.li>
        ))}
      </ul>
    </section>
  );
};

export default ProjectsSection;
