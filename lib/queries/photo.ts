import { db, DEFAULT_USER_ID } from "@/lib/db";
import type { PhotoRow, PhotoWithTags, Tag, TagSource, TagType } from "@/lib/types";

export function toPhotoWithTags(row: PhotoRow, tags: Tag[]): PhotoWithTags {
  return {
    id: row.id,
    taken_at: row.taken_at,
    year: row.year,
    is_favorite: !!row.is_favorite,
    description: row.description,
    thumb_path: row.thumb_path,
    display_path: row.display_path,
    place_name: row.place_name,
    ai_status: row.ai_status,
    is_profile: !!row.is_profile,
    tags,
  };
}

export function getTagsForPhoto(photoId: string, userId = DEFAULT_USER_ID): Tag[] {
  return db
    .prepare(
      `SELECT t.id, t.name, t.type, pt.source
       FROM photo_tags pt
       JOIN tags t ON t.id = pt.tag_id
       WHERE pt.photo_id = ? AND pt.user_id = ?
       ORDER BY CASE t.type WHEN 'person' THEN 0 WHEN 'event' THEN 1 WHEN 'place' THEN 2 WHEN 'category' THEN 3 ELSE 4 END, t.name`
    )
    .all(photoId, userId) as Tag[];
}

export function getTagsForPhotos(photoIds: string[], userId = DEFAULT_USER_ID): Map<string, Tag[]> {
  const map = new Map<string, Tag[]>();
  if (photoIds.length === 0) return map;

  const placeholders = photoIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT pt.photo_id, t.id, t.name, t.type, pt.source
       FROM photo_tags pt
       JOIN tags t ON t.id = pt.tag_id
       WHERE pt.photo_id IN (${placeholders}) AND pt.user_id = ?
       ORDER BY CASE t.type WHEN 'person' THEN 0 WHEN 'event' THEN 1 WHEN 'place' THEN 2 WHEN 'category' THEN 3 ELSE 4 END, t.name`
    )
    .all(...photoIds, userId) as (Tag & { photo_id: string })[];

  for (const row of rows) {
    const { photo_id, ...tag } = row;
    if (!map.has(photo_id)) map.set(photo_id, []);
    map.get(photo_id)!.push(tag);
  }
  return map;
}

export function getPhotoById(id: string, userId = DEFAULT_USER_ID): PhotoWithTags | null {
  const row = db
    .prepare(`SELECT * FROM photos WHERE id = ? AND user_id = ?`)
    .get(id, userId) as PhotoRow | undefined;
  if (!row) return null;
  return toPhotoWithTags(row, getTagsForPhoto(id, userId));
}

export interface PhotoPatch {
  description?: string;
  is_profile?: boolean;
}

export function updatePhoto(id: string, patch: PhotoPatch, userId = DEFAULT_USER_ID): PhotoWithTags | null {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (patch.description !== undefined) {
    fields.push("description = ?");
    params.push(patch.description);
  }
  if (patch.is_profile !== undefined) {
    fields.push("is_profile = ?");
    params.push(patch.is_profile ? 1 : 0);
  }

  if (fields.length > 0) {
    params.push(id, userId);
    db.prepare(`UPDATE photos SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...params);
  }

  return getPhotoById(id, userId);
}

function getOrCreateTag(name: string, type: TagType, userId: string): number {
  const existing = db
    .prepare(`SELECT id FROM tags WHERE user_id = ? AND type = ? AND name = ?`)
    .get(userId, type, name) as { id: number } | undefined;
  if (existing) return existing.id;

  const result = db
    .prepare(`INSERT INTO tags (user_id, name, type) VALUES (?, ?, ?)`)
    .run(userId, name, type);
  return Number(result.lastInsertRowid);
}

export function addPhotoTag(
  photoId: string,
  name: string,
  type: TagType,
  source: TagSource = "user",
  userId = DEFAULT_USER_ID
): Tag[] {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tag name cannot be empty");
  }
  const tagId = getOrCreateTag(trimmed, type, userId);
  db.prepare(
    `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, ?)`
  ).run(photoId, tagId, userId, source);
  return getTagsForPhoto(photoId, userId);
}

export function removePhotoTag(photoId: string, tagId: number, userId = DEFAULT_USER_ID): Tag[] {
  db.prepare(`DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ? AND user_id = ?`).run(
    photoId,
    tagId,
    userId
  );
  return getTagsForPhoto(photoId, userId);
}

/**
 * Renames a photo's event tag to a better AI-suggested name, but only if
 * the event still has its automatic name (source "apple"). Never touches
 * an event Matt has renamed himself. If another event already has that
 * name, merges into it instead of violating the unique tag constraint.
 */
export function maybeRenameAutoEvent(photoId: string, newName: string, userId = DEFAULT_USER_ID): void {
  const trimmed = newName.trim();
  if (!trimmed) return;

  const eventTag = getTagsForPhoto(photoId, userId).find((t) => t.type === "event");
  if (!eventTag || eventTag.source !== "apple" || eventTag.name === trimmed) return;

  const existing = db
    .prepare(`SELECT id FROM tags WHERE user_id = ? AND type = 'event' AND name = ? AND id != ?`)
    .get(userId, trimmed, eventTag.id) as { id: number } | undefined;

  if (existing) {
    db.prepare(`UPDATE OR IGNORE photo_tags SET tag_id = ? WHERE tag_id = ? AND user_id = ?`).run(
      existing.id,
      eventTag.id,
      userId
    );
    db.prepare(`DELETE FROM photo_tags WHERE tag_id = ? AND user_id = ?`).run(eventTag.id, userId);
    db.prepare(`DELETE FROM tags WHERE id = ? AND user_id = ?`).run(eventTag.id, userId);
  } else {
    db.prepare(`UPDATE tags SET name = ? WHERE id = ? AND user_id = ?`).run(trimmed, eventTag.id, userId);
  }
}

/** favorite x3 + apple_score + people count x0.5 + (has context note) x2 */
export function highlightScore(photoId: string, userId = DEFAULT_USER_ID): number {
  const row = db
    .prepare(`SELECT is_favorite, apple_score FROM photos WHERE id = ? AND user_id = ?`)
    .get(photoId, userId) as { is_favorite: number; apple_score: number | null } | undefined;
  if (!row) return 0;

  const peopleCount = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM photo_tags pt JOIN tags t ON t.id = pt.tag_id
         WHERE pt.photo_id = ? AND pt.user_id = ? AND t.type = 'person'`
      )
      .get(photoId, userId) as { count: number }
  ).count;

  const hasContext = (
    db
      .prepare(`SELECT COUNT(*) as count FROM context_notes WHERE photo_id = ? AND user_id = ?`)
      .get(photoId, userId) as { count: number }
  ).count > 0;

  return row.is_favorite * 3 + (row.apple_score ?? 0) + peopleCount * 0.5 + (hasContext ? 2 : 0);
}
