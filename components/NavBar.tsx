"use client";
import Link from "next/link";
import React, { useState, FC, Suspense } from "react";
import NavLink from "./NavLink";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import MenuOverlay from "./MenuOverlay";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "../hooks/useTranslation";
import { usePathname } from "next/navigation";

export interface NavLinkType {
  title: string;
  href: string;
  subLinks?: { title: string; href: string }[];
}

const NavBar: FC = () => {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { t } = useTranslation();
  const pathname = usePathname();

  // 🔹 Detectar idioma según la URL actual
  const urlLang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first === "es-co" || first === "es") return "es-co";
    return "en";
  })();

  // 🔹 Prefijo para rutas
  const prefix = urlLang === "es-co" ? "/es-co" : "";

  // 🔹 Navegación traducida y con rutas correctas según idioma
  const navLinks: NavLinkType[] = [
    { title: t("nav.about"), href: `${prefix}/#about` },
    { title: t("nav.projects"), href: `${prefix}/#projects` },
    { title: t("nav.caseStudies"), href: `${prefix}/case-studies` },
    {
      title: t("nav.blog"),
      href: `${prefix}/posts`,
      subLinks: [
        { title: t("nav.posts"), href: `${prefix}/posts` },
        { title: t("nav.categories"), href: `${prefix}/categories` },
      ],
    },
    { title: t("nav.contact"), href: `${prefix}/#contact` },
  ];

  const toggleNavbar = () => setNavbarOpen((v) => !v);

  return (
    <nav
      className="
        fixed inset-x-0 top-0 z-50
        border border-border
        bg-[var(--surface-95)] backdrop-blur-sm
      "
      aria-label="Primary"
    >
      <div className="mx-auto flex flex-wrap items-center justify-between px-8 py-4">
        {/* === LOGO === */}
        <Link
          href={prefix || "/"}
          className="font-semibold text-2xl md:text-5xl text-foreground"
          aria-label="Home"
        >
          [JB]
        </Link>

        {/* === TOGGLE MOBILE === */}
        <div className="block md:hidden">
          <button
            type="button"
            onClick={toggleNavbar}
            className="
              flex items-center rounded border border-border
              text-foreground
              hover:bg-secondary/60
              focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
              transition-colors
              p-2
            "
            title={navbarOpen ? "Close menu" : "Open menu"}
            aria-label={navbarOpen ? "Close menu" : "Open menu"}
            aria-controls="navbar"
          >
            {navbarOpen ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <Bars3Icon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* === DESKTOP MENU === */}
        <div className="menu hidden md:block md:w-auto" id="navbar">
          <ul
            className="
              mt-0 flex p-4 md:p-0 md:flex-row md:space-x-8
              text-muted-foreground relative
            "
          >
            {navLinks.map((link, index) => (
              <li
                key={link.href}
                className="relative group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* === LINK PRINCIPAL === */}
                <NavLink href={link.href} title={link.title} />

                {/* === SUBMENÚ === */}
                {link.subLinks && hoveredIndex === index && (
                  <ul
                    className="
                      absolute left-0 w-48
                      bg-white border border-border rounded-lg shadow-lg
                      flex flex-col
                      animate-in fade-in slide-in-from-top-2
                    "
                  >
                    {link.subLinks.map((sub) => (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          className="
                            block px-4 py-2 text-sm
                            hover:bg-gray-300 hover:text-foreground
                            rounded-md
                            transition-colors
                          "
                        >
                          {sub.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}

            {/* === TOGGLES === */}
            <li className="flex items-center">
              <Suspense fallback={null}>
                <ThemeToggle />
              </Suspense>
            </li>
            <li className="flex items-center">
              <Suspense fallback={null}>
                <LanguageSwitcher />
              </Suspense>
            </li>
          </ul>
        </div>
      </div>

      {/* === MOBILE OVERLAY === */}
      {navbarOpen && <MenuOverlay links={navLinks} />}
    </nav>
  );
};

export default NavBar;
