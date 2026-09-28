import { db, DEFAULT_USER_ID } from "@/lib/db";
import { buildFilterSQL, parsePath, valueFilters } from "@/lib/queries/filters";
import { getTagsForPhotos, toPhotoWithTags } from "@/lib/queries/photo";
import type { PhotoRow, PhotoWithTags } from "@/lib/types";

export interface FeedOptions {
  path?: string | null;
  year?: number | null;
  month?: number | null;
  week?: string | null;
  ids?: string[] | null;
  limit?: number;
  userId?: string;
}

export function getFeed(options: FeedOptions = {}): PhotoWithTags[] {
  const userId = options.userId ?? DEFAULT_USER_ID;
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 50;

  const segments = parsePath(options.path);
  const filters = valueFilters(segments);
  if (options.year !== null && options.year !== undefined) {
    filters.push({ nodeType: "year", value: String(options.year) });
  }

  let sql = "SELECT p.* FROM photos p WHERE p.user_id = ?";
  const params: unknown[] = [userId];

  if (options.week) {
    sql += " AND p.week_start = ?";
    params.push(options.week);
  }

  if (options.month !== null && options.month !== undefined) {
    sql += " AND p.month = ?";
    params.push(options.month);
  }

  if (options.ids && options.ids.length > 0) {
    sql += ` AND p.id IN (${options.ids.map(() => "?").join(", ")})`;
    params.push(...options.ids);
  }

  const { sql: filterSql, params: filterParams } = buildFilterSQL(filters, userId, "p");
  sql += filterSql;
  params.push(...filterParams);

  const isFiltered =
    filters.length > 0 || !!options.week || !!options.ids?.length || (options.month !== null && options.month !== undefined);
  sql += isFiltered ? " ORDER BY p.taken_at DESC" : " ORDER BY RANDOM()";
  sql += " LIMIT ?";
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as PhotoRow[];
  const tagsByPhoto = getTagsForPhotos(
    rows.map((r) => r.id),
    userId
  );

  return rows.map((row) => toPhotoWithTags(row, tagsByPhoto.get(row.id) ?? []));
}
