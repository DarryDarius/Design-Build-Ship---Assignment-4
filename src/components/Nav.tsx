"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { focusRing } from "./styles";

const links = [
  { href: "/", label: "Today" },
  { href: "/shelf", label: "Shelf" },
  { href: "/log", label: "Log" },
  { href: "/week", label: "This week" },
];

const linkStyle = (current: boolean) =>
  `inline-flex min-h-9 items-center rounded-md px-3 text-sm transition ${focusRing} ${
    current ? "bg-calm-surface font-medium text-calm-text ring-1 ring-calm-border" : "text-calm-muted hover:bg-calm-surface hover:text-calm-text"
  }`;

/** Shared header: where you are, one click back to anywhere, and who's signed in. */
export function Nav() {
  return (
    <header className="border-b border-calm-border">
      <div className="mx-auto flex min-h-15 max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 sm:px-6">
        <Link href="/" className={`rounded-sm font-display text-xl text-calm-text ${focusRing}`}>
          Study Shelf
        </Link>
        {/* The current path is only known at request time, so this part streams in. */}
        <Suspense>
          <NavLinks />
        </Suspense>
      </div>
    </header>
  );
}

function NavLinks() {
  const path = usePathname();
  return (
    <>
      <Show when="signed-in">
        <div className="flex items-center gap-3">
          <nav aria-label="Main">
            <ul className="flex gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={path === l.href ? "page" : undefined} className={linkStyle(path === l.href)}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <UserButton />
        </div>
      </Show>
      <Show when="signed-out">
        <Link href="/sign-in" aria-current={path.startsWith("/sign-in") ? "page" : undefined} className={linkStyle(path.startsWith("/sign-in"))}>
          Sign in
        </Link>
      </Show>
    </>
  );
}
