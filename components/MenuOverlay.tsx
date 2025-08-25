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
    <ul className="flex flex-col items-center py-4 bg-white dark:bg-[#121212] border-t border-gray-300 dark:border-[#33353F]">
      {links.map((link, index) => (
        <li key={index} className="p-4">
          {" "}
          <NavLink href={link.href} title={link.title} />
        </li>
      ))}
      <li className="p-4">
        <ThemeToggle />
        <LanguageSwitcher />
      </li>
    </ul>
  );
};

export default MenuOverlay;
