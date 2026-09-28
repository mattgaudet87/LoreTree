import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePhoto, estimateCost, type AnalysisUsage } from "@/lib/ai";
import { db, DEFAULT_USER_ID } from "@/lib/db";
import { addPhotoTag, getTagsForPhoto, maybeRenameAutoEvent } from "@/lib/queries/photo";
import type { PhotoRow } from "@/lib/types";

const requestSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  retryErrors: z.boolean().optional(),
});

export async function POST(request: Request) {
  const userId = DEFAULT_USER_ID;
  const rawBody = await request.text();
  const parsedBody = rawBody ? JSON.parse(rawBody) : {};
  const { limit = 20, retryErrors = false } = requestSchema.parse(parsedBody);

  const targetStatus = retryErrors ? "error" : "none";
  const photos = db
    .prepare(
      `SELECT * FROM photos
       WHERE user_id = ? AND ai_status = ?
       ORDER BY is_favorite DESC, imported_at ASC
       LIMIT ?`
    )
    .all(userId, targetStatus, limit) as PhotoRow[];

  let succeeded = 0;
  let failed = 0;
  const usage: AnalysisUsage = { inputTokens: 0, outputTokens: 0 };

  for (const photo of photos) {
    try {
      const tags = getTagsForPhoto(photo.id, userId);

      const { result, usage: photoUsage } = await analyzePhoto(photo, {
        people: tags.filter((t) => t.type === "person").map((t) => t.name),
        place: photo.place_name,
        eventName: tags.find((t) => t.type === "event")?.name ?? null,
        appleLabels: tags.filter((t) => t.type === "keyword").map((t) => t.name),
        takenAt: photo.taken_at,
      });
      usage.inputTokens += photoUsage.inputTokens;
      usage.outputTokens += photoUsage.outputTokens;

      db.prepare(
        `UPDATE photos
         SET description = ?, ai_status = 'done', ai_error = NULL, analyzed_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      ).run(result.description, photo.id, userId);

      addPhotoTag(photo.id, result.category, "category", "ai", userId);
      for (const keyword of result.keywords) {
        addPhotoTag(photo.id, keyword, "keyword", "ai", userId);
      }
      if (result.event_name) {
        maybeRenameAutoEvent(photo.id, result.event_name, userId);
      }

      succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      db.prepare(`UPDATE photos SET ai_status = 'error', ai_error = ? WHERE id = ? AND user_id = ?`).run(
        message,
        photo.id,
        userId
      );
      failed++;
    }
  }

  return NextResponse.json({
    succeeded,
    failed,
    estimatedCost: Number(estimateCost(usage).toFixed(4)),
  });
}
