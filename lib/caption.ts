import type { Tag } from "@/lib/types";

export interface CaptionTags {
  eventName: string | null;
  placeName: string | null;
  peopleNames: string[];
}

/**
 * Reads the caption pieces from a photo's tags. The place comes from the
 * Place tag, not Apple's original place field, so a place Matt added,
 * renamed, or removed shows up in the caption.
 */
export function captionTagsFor(tags: Tag[]): CaptionTags {
  return {
    eventName: tags.find((t) => t.type === "event")?.name ?? null,
    placeName: tags.find((t) => t.type === "place")?.name ?? null,
    peopleNames: tags.filter((t) => t.type === "person").map((t) => t.name),
  };
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Scroll-feed caption: picks the first tag combo available, in the fixed
 * priority order Matt asked for (event+place, event+people, place+people),
 * falling back to whatever single tag exists.
 */
export function shortCaption({ eventName, placeName, peopleNames }: CaptionTags): string | null {
  const people = peopleNames.length > 0 ? joinNames(peopleNames) : null;
  if (eventName && placeName) return `${eventName} at ${placeName}`;
  if (eventName && people) return `${eventName} with ${people}`;
  if (placeName && people) return `${placeName} with ${people}`;
  if (eventName) return eventName;
  if (placeName) return placeName;
  if (people) return `With ${people}`;
  return null;
}

/** Detail-view caption: the fuller "[event] with [people] at [location]" line. */
export function longCaption({ eventName, placeName, peopleNames }: CaptionTags): string | null {
  const people = peopleNames.length > 0 ? joinNames(peopleNames) : null;
  if (eventName && people && placeName) return `${eventName} with ${people} at ${placeName}`;
  if (eventName && people) return `${eventName} with ${people}`;
  if (eventName && placeName) return `${eventName} at ${placeName}`;
  if (people && placeName) return `With ${people} at ${placeName}`;
  if (eventName) return eventName;
  if (placeName) return placeName;
  if (people) return `With ${people}`;
  return null;
}
