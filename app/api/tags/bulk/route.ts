import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addTagToPhotos } from "@/lib/queries/photo";
import { TAG_TYPES } from "@/lib/tag-types";

const postSchema = z.object({
  photoIds: z.array(z.string().min(1)).min(1),
  name: z.string().min(1),
  type: z.enum(TAG_TYPES),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const count = addTagToPhotos(parsed.data.photoIds, parsed.data.name, parsed.data.type);
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add tag" },
      { status: 400 }
    );
  }
}
