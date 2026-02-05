"use client";

import { usePathname } from "next/navigation";
import NavBar from "../components/NavBar";

export default function NavBarWrapper() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/landing";

  if (isLandingPage) return null;

  return <NavBar />;
}
