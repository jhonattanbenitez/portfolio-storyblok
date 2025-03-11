import React from "react";
import NavLink from "./NavLink";

interface Link {
  href: string;
  title: string;
}

interface MenuOverlayProps {
  links: Link[];
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ links }) => {
  return (
    <ul className="flex flex-col items-center py-4">
      {links.map((link, index) => (
        <li key={index} className="p-4">
          {" "}
          <NavLink href={link.href} title={link.title} />
        </li>
      ))}
    </ul>
  );
};

export default MenuOverlay;
