// NavLink.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function NavLink({
  href,
  title,
  responsiveCompact = false,
}: {
  href: string;
  title: string;
  responsiveCompact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href.includes("#") && pathname === "/");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "inline-flex items-center h-10 px-2 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        responsiveCompact && "md:h-8 md:px-1 md:text-sm lg:h-10 lg:px-2 lg:text-base",
        "text-muted-foreground hover:text-foreground capitalize",
        active && "text-primary"
      )}
    >
      {title}
    </Link>
  );
}
