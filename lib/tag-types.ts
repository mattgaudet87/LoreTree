import type { TagType } from "@/lib/types";

// Types offered when creating a brand-new tag. "category" is excluded
// because categories only come from the fixed list in lib/categories.ts,
// and "event" is excluded because events start as an auto-generated
// placeholder from the importer, not something you hand-add.
export const ADDABLE_TAG_TYPES: { value: TagType; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "place", label: "Place" },
  { value: "keyword", label: "Keyword" },
];
