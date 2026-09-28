import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const size = searchParams.get("size") === "display" ? "display" : "thumb";

  // The id becomes part of a filesystem path, so keep it to a safe charset.
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "images", size, `${id}.jpg`);

  try {
    const stat = await fs.stat(filePath);
    // Built from the file's own mtime and size, so re-running the importer
    // (which can change a photo's pixels, e.g. an orientation fix) gives a
    // new ETag and forces browsers to fetch the new bytes instead of
    // trusting a stale cached copy indefinitely.
    const etag = `"${stat.mtimeMs.toString(36)}-${stat.size.toString(36)}"`;

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const buffer = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: etag,
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
