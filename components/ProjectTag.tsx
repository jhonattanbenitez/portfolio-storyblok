"use client";
import React from "react";
import { useTranslation } from "../hooks/useTranslation";

type ProjectTagProps = {
  name: string;
  onClick: (name: string) => void;
  isSelected: boolean;
};

const ProjectTag = ({ name, onClick, isSelected }: ProjectTagProps) => {
  const { t } = useTranslation();

  return (
    <label
      className={[
        "inline-flex items-center h-10 px-4 rounded-full cursor-pointer",
        "border transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "font-medium text-sm whitespace-nowrap select-none",
        // Base styles for unselected state
        "border-border bg-secondary/50 text-muted-foreground",
        "hover:bg-secondary hover:text-foreground hover:border-border/80 hover:shadow-sm",
        "hover:scale-105 active:scale-95",
        // Selected state styles
        "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
        "data-[selected=true]:border-primary data-[selected=true]:shadow-md",
        "data-[selected=true]:ring-2 data-[selected=true]:ring-primary/20",
        "data-[selected=true]:scale-105",
        // Focus styles
        "focus-within:ring-2 focus-within:ring-primary/20",
      ].join(" ")}
      data-selected={isSelected}
    >
      <input
        type="radio"
        checked={isSelected}
        onChange={() => onClick(name)}
        className="sr-only"
        name="project-tag"
        value={name}
      />
      {t(`tags.${name}`)}

      {/* Optional: Add a subtle indicator dot for selected state */}
      {isSelected && (
        <span className="ml-2 w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
      )}
    </label>
  );
};

export default ProjectTag;
