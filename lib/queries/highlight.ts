// The same formula as highlightScore in photo.ts, written as SQL so one query can rank many photos.
export const HIGHLIGHT_SQL = `(p.is_favorite * 3 + COALESCE(p.apple_score, 0)
  + 0.5 * (SELECT COUNT(*) FROM photo_tags hpt JOIN tags ht ON ht.id = hpt.tag_id
           WHERE hpt.photo_id = p.id AND hpt.user_id = p.user_id AND ht.type = 'person')
  + 2 * (EXISTS (SELECT 1 FROM context_notes cn WHERE cn.photo_id = p.id AND cn.user_id = p.user_id)))`;
