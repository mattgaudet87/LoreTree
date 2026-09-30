import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePhoto, estimateCost, type AnalysisUsage } from "@/lib/ai";
import { db, DEFAULT_USER_ID } from "@/lib/db";
import { addPhotoTag, applyAiEvent, getTagsForPhoto } from "@/lib/queries/photo";
import type { PhotoRow } from "@/lib/types";

const requestSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  retryErrors: z.boolean().optional(),
  // Analyze just this one photo (the "Analyze this photo" button).
  photoId: z.string().min(1).optional(),
});

// Only one batch may run at a time, so a double-click or a second tab can't
// analyze (and bill for) the same photos twice. Kept on globalThis so dev
// hot-reloads don't reset it mid-batch.
const globalLock = globalThis as typeof globalThis & { __loretreeAnalyzing?: boolean };

export async function POST(request: Request) {
  const userId = DEFAULT_USER_ID;

  const rawBody = await request.text();
  let parsedBody: unknown = {};
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Request body was not valid JSON" }, { status: 400 });
    }
  }
  const parsedRequest = requestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { limit = 20, retryErrors = false, photoId } = parsedRequest.data;

  if (globalLock.__loretreeAnalyzing) {
    return NextResponse.json({ error: "An analysis batch is already running. Wait for it to finish." }, { status: 409 });
  }

  let photos: PhotoRow[];
  if (photoId) {
    // Only photos that haven't been analyzed: re-running would overwrite a
    // description that context notes have since been merged into.
    photos = db
      .prepare(`SELECT * FROM photos WHERE id = ? AND user_id = ? AND ai_status IN ('none', 'error')`)
      .all(photoId, userId) as PhotoRow[];
    if (photos.length === 0) {
      return NextResponse.json({ error: "That photo is already analyzed or doesn't exist." }, { status: 404 });
    }
  } else {
    photos = db
      .prepare(
        `SELECT * FROM photos
         WHERE user_id = ? AND ai_status = ?
         ORDER BY is_favorite DESC, imported_at ASC
         LIMIT ?`
      )
      .all(userId, retryErrors ? "error" : "none", limit) as PhotoRow[];
  }

  globalLock.__loretreeAnalyzing = true;
  try {
    return await runBatch(userId, photos);
  } finally {
    globalLock.__loretreeAnalyzing = false;
  }
}

async function runBatch(userId: string, photos: PhotoRow[]) {
  let succeeded = 0;
  let failed = 0;
  let firstError: string | null = null;
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
        // Photos not yet analyzed still carry their Apple caption in `description`.
        appleCaption: photo.apple_caption ?? photo.description,
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
        applyAiEvent(photo.id, result.event_name, userId);
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
      firstError ??= message;
    }
  }

  return NextResponse.json({
    succeeded,
    failed,
    firstError,
    estimatedCost: Number(estimateCost(usage).toFixed(4)),
  });
}
