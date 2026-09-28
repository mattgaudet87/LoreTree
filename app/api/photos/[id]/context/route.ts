import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mergeContext } from "@/lib/ai";
import { addContextNote, getPhotoById } from "@/lib/queries/photo";

const postSchema = z.object({
  text: z.string().min(1),
  input_method: z.enum(["text", "voice"]),
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

  const existing = getPhotoById(id);
  if (!existing) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  try {
    const merged = await mergeContext(existing.description ?? "", parsed.data.text);
    const photo = addContextNote(id, {
      text: parsed.data.text,
      inputMethod: parsed.data.input_method,
      newDescription: merged.description,
      newTags: merged.new_tags,
    });
    return NextResponse.json({ photo, new_tags: merged.new_tags });
  } catch {
    return NextResponse.json({ error: "Could not add context right now" }, { status: 502 });
  }
}
