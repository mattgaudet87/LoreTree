import { NextResponse } from "next/server";
import { readImportSettings, writeImportSettings } from "@/lib/import-settings";

export async function GET() {
  return NextResponse.json(readImportSettings());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { mode?: string; album?: string } | null;
  if (!body) {
    return NextResponse.json({ error: "Request body was not valid JSON" }, { status: 400 });
  }
  if (body.mode !== "album" && body.mode !== "all") {
    return NextResponse.json({ error: "mode must be 'album' or 'all'" }, { status: 400 });
  }
  if (body.mode === "album" && !body.album?.trim()) {
    return NextResponse.json({ error: "album name is required" }, { status: 400 });
  }
  writeImportSettings({ mode: body.mode, album: body.album ?? "" });
  return NextResponse.json(readImportSettings());
}
