"use client";

import Link from "next/link";
import { photoImageUrl } from "@/lib/image-url";
import { valueSegment } from "@/lib/queries/filters";
import type { PersonSummary } from "@/lib/queries/people";

interface PeopleRowProps {
  people: PersonSummary[];
  // Names of the people in the photo on screen; they get the colored ring.
  activeNames: string[];
}

/** The most-photographed people. Tap one to see only their photos. */
export default function PeopleRow({ people, activeNames }: PeopleRowProps) {
  if (people.length === 0) return null;

  return (
    <div className="pointer-events-auto -mx-4 flex gap-3.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {people.map((person) => {
        const active = activeNames.includes(person.name);
        return (
          <Link
            key={person.name}
            href={`/feed?filter=${encodeURIComponent(valueSegment("person", person.name))}`}
            className="flex w-14 shrink-0 flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              className={`rounded-full p-0.5 ${active ? "banner-gradient" : "bg-border"}`}
            >
              <span className="block rounded-full bg-black p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoImageUrl({ id: person.coverId, image_version: person.coverVersion }, "thumb")}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                  draggable={false}
                />
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-text">{person.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
