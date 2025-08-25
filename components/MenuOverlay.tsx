"use client";
import React from "react";
import NavLink from "./NavLink";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

interface Link {
  href: string;
  title: string;
}
interface MenuOverlayProps {
  links: Link[];
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ links }) => {
  return (
    <nav className="w-full border-t border-border bg-background text-foreground">
      <ul
        className="
          flex flex-col items-stretch py-2
          text-muted-foreground
        "
        role="menu"
        aria-label="Mobile menu"
      >
        {links.map((link) => (
          <li key={link.href} className="px-6" role="none">
            <div
              className="
                h-12 flex items-center justify-center
                transition-colors
                hover:bg-secondary/60 hover:text-foreground
                rounded-md
              "
            >
              <NavLink href={link.href} title={link.title} />
            </div>
          </li>
        ))}

        <li className="px-6 py-2" role="none">
          <div className="h-12 flex items-center justify-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default MenuOverlay;
