import React from "react";
import { motion } from "framer-motion";

const variants = {
  default: { width: 0 },
  active: { width: "100%" },
};

type TabButtonProps = {
  active: boolean;
  selectTab: () => void;
  children: React.ReactNode;
};

const TabButton = ({ active, selectTab, children }: TabButtonProps) => {
  return (
    <button
      onClick={selectTab}
      className={`relative px-4 py-2 rounded-t-lg transition-colors duration-300 ${
        active ? "text-white bg-[#2D3748]" : "text-[#ADB7BE] hover:text-white"
      }`}
    >
      <span className="font-semibold">{children}</span>
      <motion.div
        animate={active ? "active" : "default"}
        variants={variants}
        className="absolute bottom-0 left-0 h-1 bg-primary-500"
      />
    </button>
  );
};

export default TabButton;
