import { NextRequest, NextResponse } from "next/server";
import { removePhotoTag } from "@/lib/queries/photo";

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
