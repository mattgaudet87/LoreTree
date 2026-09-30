import { db, DEFAULT_USER_ID } from "@/lib/db";
import { MONTH_NAMES } from "@/lib/queries/date-utils";

export type TimelineStartType = "person" | "place" | "event";

// Enough tags for the Timeline's "+ more" chip to expand into; the page
// shows only the first few until then.
const TAG_CAP = 40;

export interface TimelineTag {
  value: string;
  count: number;
}

export interface YearTagSummary {
  year: number;
  count: number;
  tags: TimelineTag[];
}

export interface MonthTagSummary {
  month: number;
  name: string;
  count: number;
  tags: TimelineTag[];
}

function tagsFor(
  where: string,
  params: unknown[],
  nodeType: TimelineStartType
): TimelineTag[] {
  return db
    .prepare(
      `SELECT t.name as value, COUNT(DISTINCT p.id) as count
       FROM photos p
       JOIN photo_tags pt ON pt.photo_id = p.id AND pt.user_id = p.user_id
       JOIN tags t ON t.id = pt.tag_id AND t.user_id = p.user_id
       WHERE ${where} AND t.type = ?
       GROUP BY t.name
       ORDER BY count DESC, t.name ASC`
    )
    .all(...params, nodeType) as TimelineTag[];
}

export function getLifetimeTimelineTags(nodeType: TimelineStartType, userId = DEFAULT_USER_ID): YearTagSummary[] {
  const years = db
    .prepare(
      `SELECT year, COUNT(*) as count FROM photos WHERE user_id = ? AND year IS NOT NULL GROUP BY year ORDER BY year DESC`
    )
    .all(userId) as { year: number; count: number }[];

  return years.map(({ year, count }) => {
    const allTags = tagsFor("p.user_id = ? AND p.year = ?", [userId, year], nodeType);
    return {
      year,
      count,
      tags: allTags.slice(0, TAG_CAP),
    };
  });
}

export function getYearMonthsTags(
  year: number,
  nodeType: TimelineStartType,
  userId = DEFAULT_USER_ID
): MonthTagSummary[] {
  const months = db
    .prepare(
      `SELECT month, COUNT(*) as count FROM photos WHERE user_id = ? AND year = ? AND month IS NOT NULL GROUP BY month ORDER BY month ASC`
    )
    .all(userId, year) as { month: number; count: number }[];

  return months.map(({ month, count }) => {
    const allTags = tagsFor("p.user_id = ? AND p.year = ? AND p.month = ?", [userId, year, month], nodeType);
    return {
      month,
      name: MONTH_NAMES[month - 1],
      count,
      tags: allTags.slice(0, TAG_CAP),
    };
  });
}
