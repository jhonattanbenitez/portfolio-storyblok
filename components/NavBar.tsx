"use client";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState, FC, Suspense } from "react";
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
  const [mobileSubmenuIndex, setMobileSubmenuIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressDesktopSubmenuFocusRef = useRef(false);
  const { t } = useTranslation();
  const pathname = usePathname();
  const isHomeV2 = pathname === "/" || pathname === "/es-co";
  const homeNavRef = useRef<HTMLElement>(null);

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

  const closeMobileMenu = useCallback(() => {
    setNavbarOpen(false);
    setMobileSubmenuIndex(null);
  }, []);

  const toggleNavbar = () => {
    setNavbarOpen((current) => !current);
    setMobileSubmenuIndex(null);
  };

  // Overlay bounds follow the actual header height on every route. Home also
  // uses this measurement for its existing fixed-header/anchor offset.
  useEffect(() => {
    const nav = homeNavRef.current;
    if (!nav) return;
    const headerRow = nav.firstElementChild;
    if (!headerRow) return;
    const measure = () => {
      const height = headerRow.getBoundingClientRect().height + "px";
      nav.style.setProperty("--site-nav-height", height);
      if (isHomeV2) document.documentElement.style.setProperty("--home-v2-nav-height", height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(headerRow);
    return () => {
      observer.disconnect();
      nav.style.removeProperty("--site-nav-height");
      if (isHomeV2) document.documentElement.style.removeProperty("--home-v2-nav-height");
    };
  }, [isHomeV2]);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 768px)");
    const closeMenusOnBreakpoint = (event: MediaQueryListEvent) => {
      setHoveredIndex(null);
      if (!event.matches) {
        if (homeNavRef.current?.querySelector("#desktop-navigation")?.contains(document.activeElement)) {
          mobileTriggerRef.current?.focus();
        }
        return;
      }
      const focusWasInPanel = homeNavRef.current?.querySelector("#mobile-navigation-panel")?.contains(document.activeElement);
      closeMobileMenu();
      if (focusWasInPanel) homeNavRef.current?.querySelector<HTMLAnchorElement>("#desktop-navigation a")?.focus();
    };

    desktopMedia.addEventListener("change", closeMenusOnBreakpoint);
    return () => desktopMedia.removeEventListener("change", closeMenusOnBreakpoint);
  }, [closeMobileMenu]);

  useEffect(() => {
    if (!navbarOpen && hoveredIndex === null) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !homeNavRef.current?.contains(event.target)) {
        closeMobileMenu();
        setHoveredIndex(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [navbarOpen, hoveredIndex, closeMobileMenu]);

  useEffect(() => {
    if (!navbarOpen) return;

    const closeMobileMenuOnEscape = (event: KeyboardEvent) => {
      // Inner disclosures consume Escape before this document-level listener.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      closeMobileMenu();
      mobileTriggerRef.current?.focus();
    };

    document.addEventListener("keydown", closeMobileMenuOnEscape);
    return () => document.removeEventListener("keydown", closeMobileMenuOnEscape);
  }, [navbarOpen, closeMobileMenu]);

  return (
    <>
      {isHomeV2 && <a href="#home-v2-main" className="home-v2-skip">{urlLang === "es-co" ? "Saltar al contenido" : "Skip to content"}</a>}
    <nav
      ref={homeNavRef}
      onClick={isHomeV2 ? event => {
        if (navbarOpen && event.target instanceof Element && event.target.closest("a[href]")) closeMobileMenu();
      } : undefined}
      className={`
        site-nav fixed inset-x-0 top-0 isolate
        border-b border-[var(--border)]
        text-[var(--foreground)]
        ${isHomeV2 ? "home-v2-nav" : ""}
      `}
      style={{
        zIndex: 100,
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
              nav-control flex items-center rounded border border-border
              text-foreground
              hover:bg-secondary/60
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
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
                onMouseEnter={() => setHoveredIndex(link.subLinks ? index : null)}
                onMouseLeave={(event) => {
                  if (!event.currentTarget.contains(document.activeElement)) {
                    setHoveredIndex(null);
                  }
                }}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setHoveredIndex(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || hoveredIndex !== index) return;
                  event.preventDefault();
                  const trigger = event.currentTarget.querySelector("a");
                  suppressDesktopSubmenuFocusRef.current = !!trigger && document.activeElement !== trigger;
                  setHoveredIndex(null);
                  trigger?.focus();
                }}
              >
                {/* === LINK PRINCIPAL === */}
                <NavLink
                  href={link.href}
                  title={link.title}
                  responsiveCompact
                  ariaExpanded={link.subLinks ? hoveredIndex === index : undefined}
                  ariaControls={link.subLinks ? `desktop-submenu-${index}` : undefined}
                  onFocus={() => {
                    if (!link.subLinks) return;
                    if (suppressDesktopSubmenuFocusRef.current) {
                      suppressDesktopSubmenuFocusRef.current = false;
                      return;
                    }
                    setHoveredIndex(index);
                  }}
                />

                {/* === SUBMENÚ === */}
                {link.subLinks && (
                  <ul
                    id={`desktop-submenu-${index}`}
                    data-state={hoveredIndex === index ? "open" : "closed"}
                    data-motion-kind="dropdown"
                    inert={hoveredIndex !== index}
                    aria-hidden={hoveredIndex !== index}
                    className="
                      motion-panel nav-panel absolute left-0 top-full mt-2 w-48
                      border border-border rounded-md text-popover-foreground shadow-lg
                      flex flex-col
                      before:absolute before:-top-2 before:left-0 before:w-full before:h-2 before:content-['']
                    "
                  >
                    {link.subLinks.map((sub) => (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          className="
                            nav-option block px-4 py-2 text-sm
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
      <MenuOverlay
        links={navLinks}
        isOpen={navbarOpen}
        openIndex={mobileSubmenuIndex}
        onToggleSubmenu={(index) => setMobileSubmenuIndex((current) => current === index ? null : index)}
      />
    </nav>
    </>
  );
};

export default NavBar;
