"use client";

import Link from "next/link";

interface FeedTopBarProps {
  year: number | null;
  // Text for the active filter pill, or null when nothing is filtered.
  filterLabel: string | null;
  onClearFilter: () => void;
  // Shown as a back circle at the far left when the feed was opened from another page.
  onBack: (() => void) | null;
  children?: React.ReactNode;
}

const glassCircle =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-glass text-text backdrop-blur outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent";

/** Logo, year chip and settings gear across the top of the feed, with the filter pill and people row underneath. */
export default function FeedTopBar({ year, filterLabel, onClearFilter, onBack, children }: FeedTopBarProps) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 px-4"
      style={{ paddingTop: "max(52px, calc(env(safe-area-inset-top) + 12px))" }}
    >
      <div className="flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {onBack && (
            <button onClick={onBack} aria-label="Back" className={`${glassCircle} mr-1.5`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-[30px] w-[30px] rounded-lg" />
          <span className="font-serif text-2xl font-medium text-text">LoreTree</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {year && (
            <span className="flex h-8 items-center rounded-full bg-glass px-3.5 text-xs font-medium text-text backdrop-blur">
              {year}
            </span>
          )}
          <Link href="/settings" aria-label="Settings" className={glassCircle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        </div>
      </div>

      {filterLabel && (
        <div className="flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-glass px-3 py-1 text-xs text-text backdrop-blur">
            <span>{filterLabel}</span>
            <button onClick={onClearFilter} aria-label="Clear filter" className="text-text-soft hover:text-text">
              ×
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
