import { NextRequest, NextResponse } from "next/server";
import { getMapLevel } from "@/lib/queries/network";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const result = getMapLevel(searchParams.get("path"), searchParams.get("show"));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid path" },
      { status: 400 }
    );
  }
}
