import { NextRequest, NextResponse } from "next/server";
import { suggestTags } from "@/lib/queries/photo";
import { TAG_TYPES } from "@/lib/tag-types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";

  if (!(TAG_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Invalid tag type" }, { status: 400 });
  }

  const suggestions = suggestTags(q, type as (typeof TAG_TYPES)[number]);
  return NextResponse.json({ suggestions });
}
