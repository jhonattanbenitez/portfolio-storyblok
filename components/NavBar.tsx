"use client";
import Link from "next/link";
import React, { useState, FC } from "react";
import NavLink from "./NavLink";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import MenuOverlay from "./MenuOverlay";

export interface NavLink {
  title: string;
  href: string;
}

const navLinks: NavLink[] = [
  {
    title: "About",
    href: "/#About",
  },
  {
    title: "Projects",
    href: "/#projects",
  },
  {
    title: "Blog",
    href: "/posts",
  },
  {
    title: "Contact",
    href: "/#contact",
  },
];

const NavBar: FC = () => {
  const [navbarOpen, setNavbarOpen] = useState<boolean>(false);

  const toggleNavbar = () => {
    setNavbarOpen(!navbarOpen);
  };

  return (
    <nav className="fixed mx-auto border border-[#33353F] top-0 left-0 right-0 z-50 bg-[#121212] bg-opacity-100">
      <div className="flex flex-wrap items-center justify-between mx-auto px-8 py-4">
        <Link
          href={"/"}
          className="text-2xl md:text-5xl text-white font-semibold"
        >
          [JB]
        </Link>
        <div className="block md:hidden">
          {!navbarOpen ? (
            <button
              onClick={toggleNavbar}
              className="text-slate-200 flex items-center border rounded border-slate-200 hover:text-white hover:border-white"
              title="Open menu"
              aria-label="Open menu" // For accessibility
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={toggleNavbar}
              className="text-slate-200 flex items-center border rounded border-slate-200 hover:text-white hover:border-white"
              title="Close menu"
              aria-label="Close menu" // For accessibility
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="menu hidden md:block md:w-auto" id="navbar">
          <ul className="flex p-4 md:p-0 md:flex-row md:space-x-8 mt-0">
            {navLinks.map((link, index) => (
              <li key={index}>
                <NavLink href={link.href} title={link.title} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {navbarOpen && <MenuOverlay links={navLinks} />}
    </nav>
  );
};

export default NavBar;
