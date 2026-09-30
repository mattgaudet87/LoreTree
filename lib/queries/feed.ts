import { db, DEFAULT_USER_ID } from "@/lib/db";
import { buildFilterSQL, parsePath, valueFilters } from "@/lib/queries/filters";
import { getTagsForPhotos, toPhotoWithTags } from "@/lib/queries/photo";
import type { PhotoRow, PhotoWithTags } from "@/lib/types";

export interface FeedOptions {
  path?: string | null;
  year?: number | null;
  month?: number | null;
  ids?: string[] | null;
  limit?: number;
  userId?: string;
}

export function getFeed(options: FeedOptions = {}): { photos: PhotoWithTags[]; total: number } {
  const userId = options.userId ?? DEFAULT_USER_ID;
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 50;

  const segments = parsePath(options.path);
  const filters = valueFilters(segments);
  if (options.year !== null && options.year !== undefined) {
    filters.push({ nodeType: "year", value: String(options.year) });
  }

  let where = " WHERE p.user_id = ?";
  const params: unknown[] = [userId];

  if (options.month !== null && options.month !== undefined) {
    where += " AND p.month = ?";
    params.push(options.month);
  }

  if (options.ids && options.ids.length > 0) {
    where += ` AND p.id IN (${options.ids.map(() => "?").join(", ")})`;
    params.push(...options.ids);
  }

  const { sql: filterSql, params: filterParams } = buildFilterSQL(filters, userId, "p");
  where += filterSql;
  params.push(...filterParams);

  const isFiltered =
    filters.length > 0 || !!options.ids?.length || (options.month !== null && options.month !== undefined);
  // How many photos match in total, so callers can say "200 of 1,500" when
  // the limit cuts the list short.
  const total = (db.prepare(`SELECT COUNT(*) as c FROM photos p${where}`).get(...params) as { c: number }).c;

  const sql = `SELECT p.* FROM photos p${where}${isFiltered ? " ORDER BY p.taken_at DESC" : " ORDER BY RANDOM()"} LIMIT ?`;
  const rows = db.prepare(sql).all(...params, limit) as PhotoRow[];
  const tagsByPhoto = getTagsForPhotos(
    rows.map((r) => r.id),
    userId
  );

  return { photos: rows.map((row) => toPhotoWithTags(row, tagsByPhoto.get(row.id) ?? [])), total };
}
