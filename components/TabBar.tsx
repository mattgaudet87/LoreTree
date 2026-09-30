"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useEscape } from "@/lib/use-escape";

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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[26px] w-[26px] shrink-0">
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

const ADD_LORE_OPTIONS: { href: string; label: string; hint: string; soon?: boolean }[] = [
  { href: "/add-lore/photos", label: "Add Photos", hint: "Import from your library or cloud storage" },
  { href: "/add-lore/context", label: "Add Context", hint: "Write or yapp about photos that need it", soon: true },
  { href: "/add-lore/cleanup", label: "Clean Library", hint: "Review and remove duplicate photos", soon: true },
];

export default function TabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Search lives inside the Lore page, so it counts as the Search tab
  // whenever the search box is open there.
  const onLore = pathname?.startsWith("/lore") ?? false;
  const searchActive = onLore && searchParams.get("search") === "1";
  const [addLoreOpen, setAddLoreOpen] = useState(false);
  useEscape(() => setAddLoreOpen(false), addLoreOpen);

  // Every item is a 44px tap target. The active one gets a circle behind it.
  const itemClass = "flex h-11 w-11 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent";
  const tabClass = (active: boolean) =>
    `${itemClass} ${active ? "bg-text text-bg" : "text-text-muted hover:text-text"}`;

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed left-1/2 z-20 flex h-[60px] w-[300px] -translate-x-1/2 items-center justify-around rounded-full border border-border bg-nav-glass px-2 backdrop-blur-xl"
        style={{ bottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <Link
          href="/feed"
          aria-label="Home"
          className={`${itemClass} ${pathname?.startsWith("/feed") ? "bg-white/10 shadow-[inset_0_0_0_1.5px_var(--text)]" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg" />
        </Link>

        <Link href="/lore" aria-label="Lore" className={tabClass(onLore && !searchActive)}>
          {LORE_ICON}
        </Link>

        <button
          type="button"
          aria-label="Add Lore"
          onClick={() => setAddLoreOpen(true)}
          className={`${itemClass} text-accent ${pathname?.startsWith("/add-lore") ? "bg-white/10" : ""}`}
        >
          {ADD_LORE_ICON}
        </button>

        <Link href="/search" aria-label="Search" className={tabClass(searchActive)}>
          {SEARCH_ICON}
        </Link>

        <Link href="/profile" aria-label="Profile" className={tabClass(pathname?.startsWith("/profile") ?? false)}>
          {PROFILE_ICON}
        </Link>
      </nav>

      {addLoreOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 md:items-center"
          onClick={() => setAddLoreOpen(false)}
        >
          <div
            className="mb-28 w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-xl md:mb-0"
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
                  <p className="flex items-center gap-2 text-sm font-medium text-text">
                    {opt.label}
                    {opt.soon && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-text-muted">
                        Coming soon
                      </span>
                    )}
                  </p>
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
