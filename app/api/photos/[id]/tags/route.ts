import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addPhotoTag, getPhotoById } from "@/lib/queries/photo";
import { TAG_TYPES } from "@/lib/tag-types";

const postSchema = z.object({
  name: z.string().min(1),
  type: z.enum(TAG_TYPES),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!getPhotoById(id)) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  try {
    const tags = addPhotoTag(id, parsed.data.name, parsed.data.type, "user");
    return NextResponse.json({ tags });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add tag" },
      { status: 400 }
    );
  }
}
