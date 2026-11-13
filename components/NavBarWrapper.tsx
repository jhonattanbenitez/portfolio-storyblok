"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import NavBar from "../components/NavBar";
import { detectLanguageFromPath, HTML_LANGUAGES } from "../utils/i18n";

export default function NavBarWrapper() {
  const pathname = usePathname();
  // The shared root layout persists across client-side locale navigation.
  useEffect(() => {
    document.documentElement.lang = HTML_LANGUAGES[detectLanguageFromPath(pathname)];
  }, [pathname]);
  // Hide navbar on landing pages (English and Spanish)
  const isLandingPage = pathname === "/landing" || pathname === "/landing-es";

  if (isLandingPage) return null;

  return <NavBar />;
}
