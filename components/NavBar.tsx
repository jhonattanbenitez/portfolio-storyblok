"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState, FC, Suspense } from "react";
import NavLink from "./NavLink";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import MenuOverlay from "./MenuOverlay";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "../hooks/useTranslation";
import { usePathname } from "next/navigation";
import { useTheme } from "../contexts/ThemeContext";

export interface NavLinkType {
  title: string;
  href: string;
  subLinks?: { title: string; href: string }[];
}

const NavBar: FC = () => {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const navBackground = resolvedTheme === "dark" ? "#172033" : "#ffffff";

  // 🔹 Detectar idioma según la URL actual
  const urlLang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first === "es-co") return "es-co";
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

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 768px)");
    const closeMobileMenuOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setNavbarOpen(false);
    };

    desktopMedia.addEventListener("change", closeMobileMenuOnDesktop);
    return () => desktopMedia.removeEventListener("change", closeMobileMenuOnDesktop);
  }, []);

  useEffect(() => {
    if (!navbarOpen) return;

    const closeMobileMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNavbarOpen(false);
      mobileTriggerRef.current?.focus();
    };

    document.addEventListener("keydown", closeMobileMenuOnEscape);
    return () => document.removeEventListener("keydown", closeMobileMenuOnEscape);
  }, [navbarOpen]);

  return (
    <nav
      className={`
        fixed inset-x-0 top-0 isolate
        border-b border-[var(--border)]
        text-[var(--foreground)]
      `}
      style={{
        zIndex: 100,
        backgroundColor: navBackground,
      }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* === LOGO === */}
        <Link
          href={prefix || "/"}
          className="font-semibold text-2xl lg:text-5xl text-foreground"
          aria-label="Home"
        >
          [JB]
        </Link>

        {/* === TOGGLE MOBILE === */}
        <div className="block md:hidden">
          <button
            ref={mobileTriggerRef}
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
            aria-controls="mobile-navigation-panel"
            aria-expanded={navbarOpen}
          >
            {navbarOpen ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <Bars3Icon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* === DESKTOP MENU === */}
        <div className="menu hidden md:block md:w-auto" id="desktop-navigation">
          <ul
            className="
              relative mt-0 flex flex-row items-center p-0
              space-x-1 lg:space-x-4
              text-muted-foreground
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
                <NavLink href={link.href} title={link.title} responsiveCompact />

                {/* === SUBMENÚ === */}
                {link.subLinks && hoveredIndex === index && (
                  <ul
                    className="
                      absolute left-0 top-full mt-2 w-48
                      border border-border rounded-md bg-popover text-popover-foreground shadow-lg
                      flex flex-col
                      animate-in fade-in slide-in-from-top-2
                      before:absolute before:-top-2 before:left-0 before:w-full before:h-2 before:content-['']
                    "
                  >
                    {link.subLinks.map((sub) => (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          className="
                            block px-4 py-2 text-sm
                            hover:bg-muted hover:text-foreground
                            rounded-md transition-colors duration-200
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
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
                <ThemeToggle responsiveCompact />
              </Suspense>
            </li>
            <li className="flex items-center">
              <Suspense fallback={null}>
                <LanguageSwitcher responsiveCompact />
              </Suspense>
            </li>
          </ul>
        </div>
      </div>

      {/* === MOBILE OVERLAY === */}
      {navbarOpen && (
        <MenuOverlay links={navLinks} navBackground={navBackground} />
      )}
    </nav>
  );
};

export default NavBar;
