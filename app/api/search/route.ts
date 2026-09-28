import { NextRequest, NextResponse } from "next/server";
import { searchPhotos } from "@/lib/queries/search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const result = searchPhotos(q);
  return NextResponse.json(result);
}
