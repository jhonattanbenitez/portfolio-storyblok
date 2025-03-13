import React from "react";

type ProjectTagProps = {
  name: string;
  onClick: (name: string) => void;
  isSelected: boolean;
};

const ProjectTag = ({ name, onClick, isSelected }: ProjectTagProps) => {
  const buttonStyles = isSelected
    ? "border-primary-500 text-white bg-[#2D3748]"
    : "border-slate-600 text-[#ADB7BE] hover:border-primary-500 hover:text-white hover:bg-primary-500/20";

  return (
    <button
      className={`${buttonStyles} transition-colors duration-300 rounded-full border-2 px-6 py-3 text-xl cursor-pointer`}
      onClick={() => onClick(name)}
    >
      {name}
    </button>
  );
};

export default ProjectTag;
