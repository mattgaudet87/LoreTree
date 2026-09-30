import type { TagType } from "@/lib/types";

/** Asks the server for existing tags of this type matching what the user has typed so far. */
export async function fetchTagSuggestions(type: TagType, query: string): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/tags/suggest?type=${type}&q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const { suggestions } = (await res.json()) as { suggestions: string[] };
    return suggestions;
  } catch {
    return [];
  }
}
