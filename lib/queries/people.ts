import { db, DEFAULT_USER_ID } from "@/lib/db";

export interface PersonSummary {
  name: string;
  count: number;
  coverId: string;
  coverVersion: string | null;
}

/**
 * The people who appear in the most photos, each with a cover photo: their
 * best-scored photo (favorite x3 + Apple's score), so the circle shows a nice one.
 */
export function getTopPeople(limit = 8, userId = DEFAULT_USER_ID): PersonSummary[] {
  const rows = db
    .prepare(
      `SELECT t.name as name, COUNT(DISTINCT p.id) as count, p.id as coverId, p.images_updated_at as coverVersion,
              MAX(p.is_favorite * 3 + COALESCE(p.apple_score, 0)) as score
       FROM photo_tags pt
       JOIN tags t ON t.id = pt.tag_id AND t.type = 'person'
       JOIN photos p ON p.id = pt.photo_id AND p.user_id = pt.user_id
       WHERE pt.user_id = ? AND p.thumb_path IS NOT NULL AND t.name != '' AND t.name != '_UNKNOWN_'
       GROUP BY t.name
       ORDER BY count DESC, t.name
       LIMIT ?`
    )
    .all(userId, limit) as (PersonSummary & { score: number })[];
  return rows.map(({ name, count, coverId, coverVersion }) => ({ name, count, coverId, coverVersion }));
}
