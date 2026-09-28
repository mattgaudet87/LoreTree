"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const HOME_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />
  </svg>
);

const LORE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="4.5" cy="6" r="1.75" />
    <circle cx="19.5" cy="6" r="1.75" />
    <circle cx="4.5" cy="18" r="1.75" />
    <circle cx="19.5" cy="18" r="1.75" />
    <path d="M10 10.5 6 7.3M14 10.5l4-3.2M10 13.5l-4 3.2M14 13.5l4 3.2" />
  </svg>
);

const ADD_LORE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const PROFILE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4.5 20c1.5-3.8 4.5-5.5 7.5-5.5s6 1.7 7.5 5.5" />
  </svg>
);

const ADD_LORE_OPTIONS = [
  { href: "/add-lore/photos", label: "Add Photos", hint: "Import from your library or cloud storage" },
  { href: "/add-lore/context", label: "Add Context", hint: "Write or yapp about photos that need it" },
  { href: "/add-lore/cleanup", label: "Clean Library", hint: "Review and remove duplicate photos" },
];

export default function TabBar() {
  const pathname = usePathname();
  const [addLoreOpen, setAddLoreOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors md:text-sm ${
      active ? "text-accent" : "text-text-muted hover:text-text"
    }`;

  return (
    <>
      <nav className="group fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:inset-y-0 md:inset-x-auto md:left-0 md:top-0 md:flex md:w-20 md:flex-col md:border-r md:border-t-0 md:bg-surface/95 md:py-4 md:transition-[width] md:duration-200 md:hover:w-52">
        <div className="mx-auto flex max-w-md items-stretch justify-around md:mx-0 md:max-w-none md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-2">
          <Link href="/feed" className={`${linkClass(pathname?.startsWith("/feed") ?? false)} flex-1 flex-col md:flex-none md:flex-row`}>
            {HOME_ICON}
            <span className="tab-label whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:transition-all md:duration-200 md:group-hover:w-auto md:group-hover:opacity-100">Home</span>
          </Link>

          <Link href="/lore" className={`${linkClass(pathname?.startsWith("/lore") ?? false)} flex-1 flex-col md:flex-none md:flex-row`}>
            {LORE_ICON}
            <span className="tab-label whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:transition-all md:duration-200 md:group-hover:w-auto md:group-hover:opacity-100">Lore</span>
          </Link>

          <button
            type="button"
            onClick={() => setAddLoreOpen(true)}
            className={`${linkClass(pathname?.startsWith("/add-lore") ?? false)} flex-1 flex-col md:flex-none md:flex-row`}
          >
            {ADD_LORE_ICON}
            <span className="tab-label whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:transition-all md:duration-200 md:group-hover:w-auto md:group-hover:opacity-100">Add Lore</span>
          </button>

          <Link href="/search" className={`${linkClass(pathname?.startsWith("/search") ?? false)} flex-1 flex-col md:flex-none md:flex-row`}>
            {SEARCH_ICON}
            <span className="tab-label whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:transition-all md:duration-200 md:group-hover:w-auto md:group-hover:opacity-100">Search</span>
          </Link>

          <Link href="/profile" className={`${linkClass(pathname?.startsWith("/profile") ?? false)} flex-1 flex-col md:flex-none md:flex-row`}>
            {PROFILE_ICON}
            <span className="tab-label whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:transition-all md:duration-200 md:group-hover:w-auto md:group-hover:opacity-100">Profile</span>
          </Link>
        </div>
      </nav>

      {addLoreOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 md:items-center"
          onClick={() => setAddLoreOpen(false)}
        >
          <div
            className="mb-20 w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-xl md:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 px-1 text-sm font-semibold text-text">Add Lore</p>
            <div className="flex flex-col gap-2">
              {ADD_LORE_OPTIONS.map((opt) => (
                <Link
                  key={opt.href}
                  href={opt.href}
                  onClick={() => setAddLoreOpen(false)}
                  className="rounded-xl border border-border bg-surface-2 px-4 py-3 transition-colors hover:border-accent"
                >
                  <p className="text-sm font-medium text-text">{opt.label}</p>
                  <p className="text-xs text-text-muted">{opt.hint}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
