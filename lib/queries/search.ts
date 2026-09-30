import { db, DEFAULT_USER_ID } from "@/lib/db";
import { getTagsForPhotos } from "@/lib/queries/photo";
import type { PhotoRow, TagType } from "@/lib/types";

export interface SearchResultPhoto {
  id: string;
  thumb_path: string | null;
  image_version: string | null;
}

export interface SearchFacetValue {
  value: string;
  count: number;
}

const FACET_TYPES: TagType[] = ["person", "place", "event", "category"];

export interface SearchResult {
  total: number;
  photos: SearchResultPhoto[];
  facets: Partial<Record<TagType, SearchFacetValue[]>>;
}

// Lightweight stemming so "mountain" matches "mountains" and "hike" matches
// "hiking" without a real NLP dependency — good enough for a personal photo
// library's vocabulary of names, places, and everyday words.
function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// A photo word matches when it starts with the searched word ("mount" finds
// "mountain"). The reverse only counts when the photo word is a near-full
// stem of the searched one ("hik" from "hiking" finds "hike"); otherwise tiny
// words like "a" or the "s" in "Matt's" would match every search.
function wordsMatch(target: string, query: string): boolean {
  const st = stem(target);
  const sq = stem(query);
  if (st === sq || st.startsWith(sq)) return true;
  return st.length >= 3 && sq.length - st.length <= 2 && sq.startsWith(st);
}

export function searchPhotos(query: string, userId = DEFAULT_USER_ID): SearchResult {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    // Single letters ("a", "i") would match nearly every photo.
    .filter((w) => w.length > 1);

  if (words.length === 0) {
    return { total: 0, photos: [], facets: {} };
  }

  const rows = db
    .prepare(`SELECT * FROM photos WHERE user_id = ?`)
    .all(userId) as PhotoRow[];

  const noteRows = db
    .prepare(
      `SELECT photo_id, GROUP_CONCAT(text, ' ') as notes FROM context_notes WHERE user_id = ? GROUP BY photo_id`
    )
    .all(userId) as { photo_id: string; notes: string }[];
  const notesByPhoto = new Map(noteRows.map((r) => [r.photo_id, r.notes]));

  const tagsByPhoto = getTagsForPhotos(
    rows.map((r) => r.id),
    userId
  );

  const matched: PhotoRow[] = [];
  const facetCounts: Record<string, Map<string, number>> = {
    person: new Map(),
    place: new Map(),
    event: new Map(),
    category: new Map(),
  };

  for (const row of rows) {
    const tags = tagsByPhoto.get(row.id) ?? [];
    const textTokens = [row.description, row.place_name, notesByPhoto.get(row.id), ...tags.map((t) => t.name)]
      .filter((v): v is string => Boolean(v))
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    const allWordsMatch = words.every((qw) => textTokens.some((tw) => wordsMatch(tw, qw)));
    if (!allWordsMatch) continue;

    matched.push(row);

    const seen = new Set<string>();
    for (const t of tags) {
      if (!FACET_TYPES.includes(t.type)) continue;
      const key = `${t.type}:${t.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const map = facetCounts[t.type];
      map.set(t.name, (map.get(t.name) ?? 0) + 1);
    }
  }

  // Only surface a facet type when it actually differentiates the results —
  // if every match shares the same single place, showing "Places" wouldn't
  // help narrow anything down.
  const facets: SearchResult["facets"] = {};
  for (const type of FACET_TYPES) {
    const map = facetCounts[type];
    if (map.size > 1) {
      facets[type] = [...map.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
    }
  }

  return {
    total: matched.length,
    photos: matched
      .sort((a, b) => (b.taken_at ?? "").localeCompare(a.taken_at ?? ""))
      .slice(0, 60)
      .map((r) => ({ id: r.id, thumb_path: r.thumb_path, image_version: r.images_updated_at })),
    facets,
  };
}
