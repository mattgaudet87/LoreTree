import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { editPhotoTag, removePhotoTag } from "@/lib/queries/photo";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id, tagId } = await params;
  const tagIdNum = Number(tagId);
  if (!Number.isFinite(tagIdNum)) {
    return NextResponse.json({ error: "Invalid tag id" }, { status: 400 });
  }

  const tags = removePhotoTag(id, tagIdNum);
  return NextResponse.json({ tags });
}

const TAG_TYPES = ["person", "category", "place", "event", "keyword"] as const;

const patchSchema = z.object({
  name: z.string().min(1),
  scope: z.enum(["this", "all"]),
  type: z.enum(TAG_TYPES).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id, tagId } = await params;
  const tagIdNum = Number(tagId);
  if (!Number.isFinite(tagIdNum)) {
    return NextResponse.json({ error: "Invalid tag id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const tags = editPhotoTag(id, tagIdNum, parsed.data.name, parsed.data.scope, undefined, parsed.data.type);
    return NextResponse.json({ tags });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not edit tag" },
      { status: 400 }
    );
  }
}
