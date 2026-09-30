import { db, DEFAULT_USER_ID } from "@/lib/db";
import { MONTH_ABBR } from "@/lib/queries/date-utils";
import { HIGHLIGHT_SQL } from "@/lib/queries/highlight";

export type TimelineStartType = "person" | "place" | "event";

// How many names the summary line under the year buttons shows.
const TOP_TAGS = 3;

export interface TimelineYear {
  year: number;
  count: number;
  // The year's most common people / places / events, most common first.
  topTags: string[];
}

export interface TimelineMonth {
  month: number;
  name: string;
  count: number;
  coverId: string | null;
  coverVersion: string | null;
}

export interface TimelineData {
  years: TimelineYear[];
  // The year the months belong to: the one asked for, or the latest.
  selectedYear: number | null;
  // Always 12 entries, January to December; months with no photos have count 0.
  months: TimelineMonth[];
}

function topTagsFor(year: number, nodeType: TimelineStartType, userId: string): string[] {
  const rows = db
    .prepare(
      `SELECT t.name as name, COUNT(DISTINCT p.id) as count
       FROM photos p
       JOIN photo_tags pt ON pt.photo_id = p.id AND pt.user_id = p.user_id
       JOIN tags t ON t.id = pt.tag_id AND t.user_id = p.user_id
       WHERE p.user_id = ? AND p.year = ? AND t.type = ?
       GROUP BY t.name
       ORDER BY count DESC, t.name ASC
       LIMIT ?`
    )
    .all(userId, year, nodeType, TOP_TAGS) as { name: string }[];
  return rows.map((r) => r.name);
}

/** Every year with photos (newest first) plus the chosen year's 12 months, each with a cover photo. */
export function getTimeline(
  yearParam: number | null,
  nodeType: TimelineStartType,
  userId = DEFAULT_USER_ID
): TimelineData {
  const yearRows = db
    .prepare(
      `SELECT year, COUNT(*) as count FROM photos WHERE user_id = ? AND year IS NOT NULL GROUP BY year ORDER BY year DESC`
    )
    .all(userId) as { year: number; count: number }[];

  const years: TimelineYear[] = yearRows.map((r) => ({ ...r, topTags: topTagsFor(r.year, nodeType, userId) }));
  const selectedYear = yearParam ?? years[0]?.year ?? null;

  const months: TimelineMonth[] = MONTH_ABBR.map((name, i) => ({
    month: i + 1,
    name,
    count: 0,
    coverId: null,
    coverVersion: null,
  }));

  if (selectedYear !== null) {
    const counts = db
      .prepare(`SELECT month, COUNT(*) as count FROM photos WHERE user_id = ? AND year = ? AND month IS NOT NULL GROUP BY month`)
      .all(userId, selectedYear) as { month: number; count: number }[];
    const coverStmt = db.prepare(
      `SELECT p.id as id, p.images_updated_at as version FROM photos p
       WHERE p.user_id = ? AND p.year = ? AND p.month = ? AND p.thumb_path IS NOT NULL
       ORDER BY ${HIGHLIGHT_SQL} DESC, p.taken_at DESC LIMIT 1`
    );
    for (const { month, count } of counts) {
      const target = months[month - 1];
      if (!target) continue;
      target.count = count;
      const cover = coverStmt.get(userId, selectedYear, month) as { id: string; version: string | null } | undefined;
      target.coverId = cover?.id ?? null;
      target.coverVersion = cover?.version ?? null;
    }
  }

  return { years, selectedYear, months };
}
