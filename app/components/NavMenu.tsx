"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthNav from "./AuthNav";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/create-event", label: "Create event" },
  { href: "/marketplace", label: "Market Place" },
  { href: "/rating", label: "Rating" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NavMenu = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="nav-end" ref={containerRef}>
      <button
        type="button"
        className="nav-menu-toggle"
        aria-expanded={open}
        aria-controls="primary-navigation"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}>
        <span className="nav-menu-toggle__icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div
        id="primary-navigation"
        className={`nav-panel${open ? " is-open" : ""}`}>
        <ul>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={
                  isActivePath(pathname, link.href) ? "page" : undefined
                }>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <AuthNav />
    </div>
  );
};

export default NavMenu;
