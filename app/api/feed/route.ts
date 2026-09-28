import { NextRequest, NextResponse } from "next/server";
import { getFeed } from "@/lib/queries/feed";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const yearParam = searchParams.get("year");
  const week = searchParams.get("week");
  const limitParam = searchParams.get("limit");

  try {
    const photos = getFeed({
      path,
      year: yearParam ? Number(yearParam) : null,
      week,
      limit: limitParam ? Number(limitParam) : undefined,
    });
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
