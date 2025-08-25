"use client";
import Link from "next/link";
import React, { useState, FC, Suspense } from "react";
import NavLink from "./NavLink";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import MenuOverlay from "./MenuOverlay";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "../hooks/useTranslation";

export interface NavLink {
  title: string;
  href: string;
}

const NavBar: FC = () => {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const { t } = useTranslation();

  const navLinks: NavLink[] = [
    { title: t("nav.about"), href: "/#about" },
    { title: t("nav.projects"), href: "/#projects" },
    { title: t("nav.blog"), href: "/posts" },
    { title: t("nav.contact"), href: "/#contact" },
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
        <Link
          href="/"
          className="font-semibold text-2xl md:text-5xl text-foreground"
          aria-label="Home"
        >
          [JB]
        </Link>

        {/* Mobile toggle */}
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

        {/* Desktop menu */}
        <div className="menu hidden md:block md:w-auto" id="navbar">
          <ul
            className="
                        mt-0 flex p-4 md:p-0 md:flex-row md:space-x-8
                        text-muted       
                      ">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} title={link.title} />
              </li>
            ))}
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

      {/* Mobile menu overlay */}
      {navbarOpen && <MenuOverlay links={navLinks} />}
    </nav>
  );
};

export default NavBar;
