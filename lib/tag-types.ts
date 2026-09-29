import type { TagType } from "@/lib/types";

// The tag types Matt can add or reclassify a tag into, shared by the Add
// Tag and Edit Tag controls so both offer the same options. "category" is
// excluded because categories only come from the fixed list in
// lib/categories.ts, not something hand-added or reclassified here.
export const ADDABLE_TAG_TYPES: { value: TagType; label: string }[] = [
  { value: "person", label: "People" },
  { value: "place", label: "Place" },
  { value: "event", label: "Event" },
  { value: "keyword", label: "Details" },
];
