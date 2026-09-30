import type { NetworkNodeType } from "@/lib/types";

// The Map view only ever drills through these four dimensions, never
// "category", which doesn't have a place in the People/Place/Event/Date
// taxonomy the map is built around. Order is the default cascade order.
export const MAP_TYPES: NetworkNodeType[] = ["person", "place", "event", "year"];

export const MAP_TYPE_LABEL: Record<NetworkNodeType, string> = {
  person: "People",
  place: "Place",
  event: "Event",
  year: "Date",
  category: "Categories",
};

// Tailwind classes for the small colored dot next to each type.
export const MAP_TYPE_DOT: Record<NetworkNodeType, string> = {
  person: "bg-node-people",
  place: "bg-node-places",
  event: "bg-node-events",
  year: "bg-node-years",
  category: "bg-node-categories",
};

export const MAP_TYPE_COLOR: Record<NetworkNodeType, string> = {
  person: "var(--node-people)",
  place: "var(--node-places)",
  event: "var(--node-events)",
  year: "var(--node-years)",
  category: "var(--node-categories)",
};
