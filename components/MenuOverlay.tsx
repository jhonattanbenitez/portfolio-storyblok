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
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ links }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleSubmenu = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
        {links.map((link, index) => (
          <li key={link.title} className="relative px-6" role="none">
            {/* === LINK PRINCIPAL === */}
            {link.subLinks ? (
              <div className="flex flex-col">
                <button
                  onClick={() => toggleSubmenu(index)}
                  className={`
                    w-full h-12 flex items-center justify-center gap-2
                    rounded-md
                    px-3 transition-colors
                    hover:bg-secondary/60 hover:text-foreground
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${openIndex === index ? "bg-secondary/40" : ""}
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
                  rounded-md
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
    </nav>
  );
};

export default MenuOverlay;
