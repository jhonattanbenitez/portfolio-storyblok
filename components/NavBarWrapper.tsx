"use client";

import { usePathname } from "next/navigation";
import NavBar from "../components/NavBar";

export default function NavBarWrapper() {
  const pathname = usePathname();
  // Hide navbar on landing pages (English and Spanish)
  const isLandingPage = pathname === "/landing" || pathname === "/landing-es";

  if (isLandingPage) return null;

  return <NavBar />;
}
