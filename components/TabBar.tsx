"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/feed",
    label: "Feed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: "/network",
    label: "Network",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="2.5" />
        <circle cx="4.5" cy="6" r="1.75" />
        <circle cx="19.5" cy="6" r="1.75" />
        <circle cx="4.5" cy="18" r="1.75" />
        <circle cx="19.5" cy="18" r="1.75" />
        <path d="M10 10.5 6 7.3M14 10.5l4-3.2M10 13.5l-4 3.2M14 13.5l4 3.2" />
      </svg>
    ),
  },
  {
    href: "/timeline",
    label: "Timeline",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    href: "/reminisce",
    label: "Reminisce",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M4 5h16v11H8.5L4 19.5V5Z" />
        <path d="M8 9h8M8 12.5h5" />
      </svg>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
