import { NextRequest, NextResponse } from "next/server";
import { getPhotoById, undoLastContextNote } from "@/lib/queries/photo";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getPhotoById(id)) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const photo = undoLastContextNote(id);
  return NextResponse.json({ photo });
}
