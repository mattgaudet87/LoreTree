import { db, DEFAULT_USER_ID } from "@/lib/db";
import { isCategory } from "@/lib/categories";
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
    image_version: row.images_updated_at,
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

/** Categories come only from the fixed list in lib/categories.ts, never free-typed. */
function assertAllowedTag(name: string, type: TagType): void {
  if (type === "category" && !isCategory(name)) {
    throw new Error("Categories must come from the fixed list");
  }
}

/** Removes tags no photo uses any more, so they stop appearing in suggestions. */
function deleteOrphanTags(userId: string): void {
  db.prepare(`DELETE FROM tags WHERE user_id = ? AND id NOT IN (SELECT tag_id FROM photo_tags)`).run(userId);
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
  assertAllowedTag(trimmed, type);
  const tagId = getOrCreateTag(trimmed, type, userId);
  db.prepare(
    `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, ?)`
  ).run(photoId, tagId, userId, source);
  return getTagsForPhoto(photoId, userId);
}

/** Adds the same tag to many photos at once (e.g. tagging a whole grid selection). */
export function addTagToPhotos(
  photoIds: string[],
  name: string,
  type: TagType,
  userId = DEFAULT_USER_ID
): number {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tag name cannot be empty");
  }
  assertAllowedTag(trimmed, type);
  const tagId = getOrCreateTag(trimmed, type, userId);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, 'user')`
  );
  const insertMany = db.transaction((ids: string[]) => {
    for (const photoId of ids) insert.run(photoId, tagId, userId);
  });
  insertMany(photoIds);
  return photoIds.length;
}

export function removePhotoTag(photoId: string, tagId: number, userId = DEFAULT_USER_ID): Tag[] {
  db.prepare(`DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ? AND user_id = ?`).run(
    photoId,
    tagId,
    userId
  );
  deleteOrphanTags(userId);
  return getTagsForPhoto(photoId, userId);
}

/**
 * Renames a tag and/or moves it to a different type (e.g. a keyword that
 * should really be an event). "all" edits the shared tag row, so every
 * photo that carries it sees the change (merging into an existing tag with
 * the same name + type if one already exists, rather than violating the
 * unique constraint). "this" instead detaches just this photo from the old
 * tag and attaches it to a find-or-created tag with the new name/type,
 * leaving every other photo's tag untouched.
 */
export function editPhotoTag(
  photoId: string,
  tagId: number,
  newName: string,
  scope: "this" | "all",
  userId = DEFAULT_USER_ID,
  newType?: TagType
): Tag[] {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("Tag name cannot be empty");
  }

  const tag = db.prepare(`SELECT id, type, name FROM tags WHERE id = ? AND user_id = ?`).get(tagId, userId) as
    | { id: number; type: TagType; name: string }
    | undefined;
  if (!tag) {
    throw new Error("Tag not found");
  }

  const targetType = newType ?? tag.type;
  assertAllowedTag(trimmed, targetType);

  if (scope === "all") {
    if (tag.name !== trimmed || tag.type !== targetType) {
      const existing = db
        .prepare(`SELECT id FROM tags WHERE user_id = ? AND type = ? AND name = ? AND id != ?`)
        .get(userId, targetType, trimmed, tag.id) as { id: number } | undefined;

      if (existing) {
        db.prepare(`UPDATE OR IGNORE photo_tags SET tag_id = ? WHERE tag_id = ? AND user_id = ?`).run(
          existing.id,
          tag.id,
          userId
        );
        db.prepare(`DELETE FROM photo_tags WHERE tag_id = ? AND user_id = ?`).run(tag.id, userId);
        db.prepare(`DELETE FROM tags WHERE id = ? AND user_id = ?`).run(tag.id, userId);
      } else {
        db.prepare(`UPDATE tags SET name = ?, type = ? WHERE id = ? AND user_id = ?`).run(
          trimmed,
          targetType,
          tag.id,
          userId
        );
      }
      // The name is Matt's now, so it must count as his: an Apple-sourced
      // link would otherwise let AI analysis replace it.
      db.prepare(`UPDATE photo_tags SET source = 'user' WHERE tag_id = ? AND user_id = ? AND source = 'apple'`).run(
        existing?.id ?? tag.id,
        userId
      );
    }
  } else {
    const newTagId = getOrCreateTag(trimmed, targetType, userId);
    if (newTagId !== tag.id) {
      db.prepare(`DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ? AND user_id = ?`).run(
        photoId,
        tag.id,
        userId
      );
      db.prepare(
        `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, 'user')`
      ).run(photoId, newTagId, userId);
      deleteOrphanTags(userId);
    }
  }

  return getTagsForPhoto(photoId, userId);
}

export function suggestTags(query: string, type: TagType, userId = DEFAULT_USER_ID, limit = 8): string[] {
  const q = query.trim();
  if (!q) return [];
  const rows = db
    .prepare(
      `SELECT name FROM tags t WHERE t.user_id = ? AND t.type = ? AND t.name LIKE ? COLLATE NOCASE
       AND EXISTS (SELECT 1 FROM photo_tags pt WHERE pt.tag_id = t.id)
       ORDER BY t.name ASC LIMIT ?`
    )
    .all(userId, type, `%${q}%`, limit) as { name: string }[];
  return rows.map((r) => r.name);
}

/**
 * Gives one photo the AI's event name (the "what": Hike, Pickleball...).
 * Only this photo is touched: Apple's automatic "Place, Date" event is
 * shared by every photo from that day, so renaming it would rename them all.
 * A photo with no event gets the AI event added; a photo with only Apple's
 * automatic event has that link swapped for the AI one; an event Matt set
 * himself (or an earlier AI one) is never replaced.
 */
export function applyAiEvent(photoId: string, eventName: string, userId = DEFAULT_USER_ID): void {
  const trimmed = eventName.trim();
  if (!trimmed) return;

  const eventTags = getTagsForPhoto(photoId, userId).filter((t) => t.type === "event");
  if (eventTags.some((t) => t.source !== "apple")) return;

  for (const tag of eventTags) {
    db.prepare(`DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ? AND user_id = ?`).run(photoId, tag.id, userId);
  }
  addPhotoTag(photoId, trimmed, "event", "ai", userId);
  deleteOrphanTags(userId);
}

export interface ContextNote {
  id: number;
  text: string;
  created_at: string;
}

/** The raw text Matt wrote as context, oldest first — distinct from the AI-merged description. */
export function getContextNotesForPhoto(photoId: string, userId = DEFAULT_USER_ID): ContextNote[] {
  return db
    .prepare(
      `SELECT id, text, created_at FROM context_notes
       WHERE photo_id = ? AND user_id = ? ORDER BY id ASC`
    )
    .all(photoId, userId) as ContextNote[];
}

export interface ContextNoteInput {
  text: string;
  inputMethod: string;
  newDescription: string;
  newTags: { name: string; type: TagType }[];
}

/**
 * Saves a context note: records the prior description for Undo, applies the
 * AI-merged description, and adds the new tags with source "user" (the facts
 * came from Matt, even though Claude phrased the tags).
 */
export function addContextNote(
  photoId: string,
  input: ContextNoteInput,
  userId = DEFAULT_USER_ID
): PhotoWithTags | null {
  const photo = getPhotoById(photoId, userId);
  if (!photo) return null;

  const noteId = Number(
    db
      .prepare(
        `INSERT INTO context_notes (user_id, photo_id, text, input_method, prev_description)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, photoId, input.text, input.inputMethod, photo.description).lastInsertRowid
  );

  const addedTagIds: number[] = [];
  for (const tag of input.newTags) {
    const trimmed = tag.name.trim();
    if (!trimmed) continue;
    const tagId = getOrCreateTag(trimmed, tag.type, userId);
    const result = db
      .prepare(`INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, 'user')`)
      .run(photoId, tagId, userId);
    if (result.changes > 0) addedTagIds.push(tagId);
  }

  db.prepare(`UPDATE context_notes SET added_tag_ids = ? WHERE id = ? AND user_id = ?`).run(
    JSON.stringify(addedTagIds),
    noteId,
    userId
  );
  db.prepare(`UPDATE photos SET description = ? WHERE id = ? AND user_id = ?`).run(
    input.newDescription,
    photoId,
    userId
  );

  return getPhotoById(photoId, userId);
}

/**
 * Undoes the most recent context note for a photo: restores the description
 * it overwrote and removes the tags it added, then deletes the note so it
 * can't be undone twice.
 */
export function undoLastContextNote(photoId: string, userId = DEFAULT_USER_ID): PhotoWithTags | null {
  const note = db
    .prepare(
      `SELECT n.id, n.prev_description, n.added_tag_ids,
              (p.analyzed_at IS NOT NULL AND p.analyzed_at >= n.created_at) AS analyzed_since
       FROM context_notes n JOIN photos p ON p.id = n.photo_id
       WHERE n.photo_id = ? AND n.user_id = ? ORDER BY n.id DESC LIMIT 1`
    )
    .get(photoId, userId) as
    | { id: number; prev_description: string | null; added_tag_ids: string | null; analyzed_since: number }
    | undefined;

  if (!note) return getPhotoById(photoId, userId);

  const addedTagIds: number[] = note.added_tag_ids ? JSON.parse(note.added_tag_ids) : [];
  for (const tagId of addedTagIds) {
    db.prepare(`DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ? AND user_id = ?`).run(
      photoId,
      tagId,
      userId
    );
  }

  // If the photo was analyzed after this note, the saved description predates
  // the AI's, so restoring it would throw away the analysis. Keep the current one.
  if (!note.analyzed_since) {
    db.prepare(`UPDATE photos SET description = ? WHERE id = ? AND user_id = ?`).run(
      note.prev_description,
      photoId,
      userId
    );
  }
  db.prepare(`DELETE FROM context_notes WHERE id = ? AND user_id = ?`).run(note.id, userId);
  deleteOrphanTags(userId);

  return getPhotoById(photoId, userId);
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
