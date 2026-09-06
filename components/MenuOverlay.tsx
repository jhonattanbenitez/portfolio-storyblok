"use client";
import React, { useState } from "react";
import NavLink from "./NavLink";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

interface SubLink {
  title: string;
  href: string;
}

interface LinkItem {
  title: string;
  href?: string;
  subLinks?: SubLink[];
}

interface MenuOverlayProps {
  links: LinkItem[];
  navBackground: string;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ links, navBackground }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleSubmenu = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div
      id="mobile-navigation-panel"
      className="w-full border-y border-[var(--border)] text-[var(--foreground)] shadow-sm md:hidden"
      style={{ backgroundColor: navBackground }}
    >
      <ul
        className="
          flex flex-col items-stretch py-2
          text-muted-foreground
        "
        role="menu"
        aria-label="Mobile menu"
      >
        {links.map((link, index) => (
          <li key={link.title} className="relative px-6" role="none">
            {/* === LINK PRINCIPAL === */}
            {link.subLinks ? (
              <div className="flex flex-col">
                <button
                  onClick={() => toggleSubmenu(index)}
                  className={`
                    w-full h-12 flex items-center justify-center gap-2
                    rounded-md border border-transparent
                    px-3 transition-colors duration-200
                    hover:bg-secondary/60 hover:text-foreground
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${openIndex === index ? "border-border bg-secondary text-secondary-foreground" : ""}
                  `}
                >
                  <span>{link.title}</span>
                  <span
                    className={`transition-transform duration-200 ${
                      openIndex === index ? "rotate-90" : ""
                    }`}
                  >
                    ▶
                  </span>
                </button>

                {/* === SUBMENÚ === */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openIndex === index
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <ul
                    className="
                      flex flex-col items-center py-1
                      rounded-md
                    "
                    role="menu"
                    aria-label={`${link.title} submenu`}
                  >
                    {link.subLinks.map((sub) => (
                      <li key={sub.href} className="py-1.5">
                        <NavLink href={sub.href} title={sub.title} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div
                className="
                  h-12 flex items-center justify-center
                  transition-colors
                  hover:bg-secondary/60 hover:text-foreground
                  rounded-md focus-within:ring-2 focus-within:ring-ring
                "
              >
                {link.href && <NavLink href={link.href} title={link.title} />}
              </div>
            )}
          </li>
        ))}

        {/* === TOGGLES === */}
        <li className="px-6 py-3 border-t border-border mt-2" role="none">
          <div className="flex items-center justify-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </li>
      </ul>
    </div>
  );
};

export default MenuOverlay;
