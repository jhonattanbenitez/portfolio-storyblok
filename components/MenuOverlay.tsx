"use client";
import React from "react";
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
  isOpen: boolean;
  openIndex: number | null;
  onToggleSubmenu: (index: number) => void;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ links, isOpen, openIndex, onToggleSubmenu }) => {
  return (
    <div
      id="mobile-navigation-panel"
      data-state={isOpen ? "open" : "closed"}
      data-motion-kind="mobile"
      inert={!isOpen}
      aria-hidden={!isOpen}
      className="motion-panel nav-panel w-full border-y border-[var(--border)] text-[var(--foreground)] shadow-sm md:hidden"
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
                  type="button"
                  onClick={() => onToggleSubmenu(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`mobile-submenu-${index}`}
                  className={`
                    nav-disclosure w-full h-12 flex items-center justify-center gap-2
                    rounded-md border border-transparent
                    px-3 transition-colors duration-200
                    hover:bg-secondary/60 hover:text-foreground
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${openIndex === index ? "border-border bg-secondary text-secondary-foreground" : ""}
                  `}
                >
                  <span>{link.title}</span>
                  <span
                    className="motion-indicator"
                    data-state={openIndex === index ? "open" : "closed"}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </button>

                {/* === SUBMENÚ === */}
                <div
                  id={`mobile-submenu-${index}`}
                  data-state={openIndex === index ? "open" : "closed"}
                  aria-hidden={openIndex !== index}
                  inert={openIndex !== index}
                  className="motion-submenu"
                >
                  <div className="motion-submenu-content">
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
            {/* Closing the parent resets this transient popup without delaying its exit. */}
            <ThemeToggle key={isOpen ? "open" : "closed"} />
            <LanguageSwitcher />
          </div>
        </li>
      </ul>
    </div>
  );
};

export default MenuOverlay;
