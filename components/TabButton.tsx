"use client";
import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

const underline = {
  inactive: { scaleX: 0 },
  active: { scaleX: 1 },
};

type TabButtonProps = {
  active: boolean;
  selectTab: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const TabButton = ({
  active,
  selectTab,
  children,
  className,
  ...rest
}: TabButtonProps) => {
  return (
    <button
      type="button"
      onClick={selectTab}
      data-active={active}
      // Accessible para tabs (estos props también puedes pasarlos desde el padre)
      {...(rest.role === "tab" ? { "aria-selected": active, role: "tab" } : {})}
      className={clsx(
        "relative inline-flex items-center h-12 px-6 rounded-t-lg",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "border-l border-r border-t border-b-0",
        "text-muted-foreground hover:text-foreground",
        // Inactive tab styling
        "bg-muted/50 border-border/60 hover:bg-muted/70",
        "translate-y-0 hover:-translate-y-0.5",
        // Active tab styling
        "data-[active=true]:bg-background data-[active=true]:text-foreground",
        "data-[active=true]:border-border data-[active=true]:border-b-background",
        "data-[active=true]:shadow-sm data-[active=true]:-translate-y-0.5",
        "data-[active=true]:z-10 data-[active=true]:relative",
        // Connect active tab to content area
        "data-[active=true]:mb-[-1px]",
        className
      )}
      {...rest}
    >
      <span className="font-semibold relative z-10">{children}</span>

      {/* Animated underline for active state */}
      <motion.span
        initial={false}
        animate={active ? "active" : "inactive"}
        variants={underline}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary origin-left rounded-t-sm"
      />

      {/* Optional: Subtle inner shadow for depth */}
      {active && (
        <div className="absolute inset-0 rounded-t-lg bg-gradient-to-b from-background/10 to-transparent pointer-events-none" />
      )}
    </button>
  );
};

export default TabButton;
