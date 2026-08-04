"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../providers/AuthProvider";

function getInitials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AuthNav = () => {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  if (loading) {
    return <div className="auth-nav auth-nav__skeleton" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="auth-nav">
        <Link href="/auth" className="auth-nav__login">
          Log in
        </Link>
      </div>
    );
  }

  const displayName = user.displayName?.trim() || user.email?.split("@")[0];

  return (
    <div className="auth-nav" ref={containerRef}>
      <button
        type="button"
        className="auth-nav__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}>
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            className="auth-nav__avatar-image"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="auth-nav__avatar-initials">
            {getInitials(user.displayName, user.email)}
          </span>
        )}
      </button>

      {open && (
        <div className="auth-nav__menu" role="menu">
          <div className="auth-nav__identity">
            <p className="auth-nav__name">{displayName}</p>
            <p className="auth-nav__email">{user.email}</p>
          </div>

          <div className="auth-nav__divider" />

          <Link href="/events" className="auth-nav__item" role="menuitem">
            Browse events
          </Link>
          <Link href="/create-event" className="auth-nav__item" role="menuitem">
            Create event
          </Link>

          <div className="auth-nav__divider" />

          <button
            type="button"
            className="auth-nav__item auth-nav__item--muted"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout();
            }}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthNav;
