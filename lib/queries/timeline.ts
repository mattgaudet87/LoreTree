import { db, DEFAULT_USER_ID } from "@/lib/db";
import { formatWeekLabel } from "@/lib/queries/date-utils";
import { MONTH_NAMES } from "@/lib/queries/date-utils";

// Reusable "how good a photo is" expression: favorite x3 + apple_score +
// people count x0.5 + (has a context note) x2. Correlated subqueries keep
// this a single query instead of N+1 round trips.
const HIGHLIGHT_SCORE_SQL = `(
  p.is_favorite * 3
  + COALESCE(p.apple_score, 0)
  + (SELECT COUNT(*) FROM photo_tags pt_hs JOIN tags t_hs ON t_hs.id = pt_hs.tag_id
     WHERE pt_hs.photo_id = p.id AND pt_hs.user_id = p.user_id AND t_hs.type = 'person') * 0.5
  + (CASE WHEN (SELECT COUNT(*) FROM context_notes cn_hs WHERE cn_hs.photo_id = p.id AND cn_hs.user_id = p.user_id) > 0 THEN 2 ELSE 0 END)
)`;

export interface HighlightPhoto {
  id: string;
  thumb_path: string | null;
  is_favorite: boolean;
  image_version: string | null;
}

export interface YearSummary {
  year: number;
  count: number;
  highlights: HighlightPhoto[];
}

export function getLifetimeTimeline(userId = DEFAULT_USER_ID): YearSummary[] {
  const years = db
    .prepare(
      `SELECT year, COUNT(*) as count FROM photos WHERE user_id = ? AND year IS NOT NULL GROUP BY year ORDER BY year DESC`
    )
    .all(userId) as { year: number; count: number }[];

  const highlightStmt = db.prepare(
    `SELECT p.id, p.thumb_path, p.is_favorite, p.images_updated_at FROM photos p
     WHERE p.user_id = ? AND p.year = ?
     ORDER BY ${HIGHLIGHT_SCORE_SQL} DESC, p.taken_at DESC
     LIMIT 3`
  );

  return years.map(({ year, count }) => ({
    year,
    count,
    highlights: (
      highlightStmt.all(userId, year) as {
        id: string;
        thumb_path: string | null;
        is_favorite: number;
        images_updated_at: string | null;
      }[]
    ).map((h) => ({
      id: h.id,
      thumb_path: h.thumb_path,
      is_favorite: !!h.is_favorite,
      image_version: h.images_updated_at,
    })),
  }));
}

export interface WeekSummary {
  week_start: string;
  label: string;
  count: number;
  id: string | null;
  thumb_path: string | null;
  image_version: string | null;
}

export interface MonthSummary {
  month: number;
  name: string;
  count: number;
  weeks: WeekSummary[];
}

export interface YearTimeline {
  year: number;
  months: MonthSummary[];
  hiddenEmptyMonths: number;
}

export function getYearTimeline(year: number, userId = DEFAULT_USER_ID): YearTimeline {
  const monthsPresent = db
    .prepare(
      `SELECT DISTINCT month FROM photos WHERE user_id = ? AND year = ? AND month IS NOT NULL ORDER BY month ASC`
    )
    .all(userId, year) as { month: number }[];

  const weekStmt = db.prepare(
    `SELECT week_start, COUNT(*) as count FROM photos
     WHERE user_id = ? AND year = ? AND month = ? AND week_start IS NOT NULL
     GROUP BY week_start ORDER BY week_start ASC`
  );

  const weekThumbStmt = db.prepare(
    `SELECT p.id, p.thumb_path, p.images_updated_at FROM photos p
     WHERE p.user_id = ? AND p.year = ? AND p.month = ? AND p.week_start = ?
     ORDER BY ${HIGHLIGHT_SCORE_SQL} DESC, p.taken_at DESC
     LIMIT 1`
  );

  const months: MonthSummary[] = monthsPresent.map(({ month }) => {
    const weekRows = weekStmt.all(userId, year, month) as { week_start: string; count: number }[];
    const weeks: WeekSummary[] = weekRows.map((w) => {
      const thumb = weekThumbStmt.get(userId, year, month, w.week_start) as
        | { id: string; thumb_path: string | null; images_updated_at: string | null }
        | undefined;
      return {
        week_start: w.week_start,
        label: formatWeekLabel(w.week_start),
        count: w.count,
        id: thumb?.id ?? null,
        thumb_path: thumb?.thumb_path ?? null,
        image_version: thumb?.images_updated_at ?? null,
      };
    });
    const count = weeks.reduce((sum, w) => sum + w.count, 0);
    return { month, name: MONTH_NAMES[month - 1], count, weeks };
  });

  return { year, months, hiddenEmptyMonths: 12 - months.length };
}
