// Apple Photos importer. Reads either one album or the whole library (see
// lib/import-settings.ts, configured from the Add Photos page) via
// osxphotos, exports full-size JPEGs, resizes them with sharp, and upserts
// everything into the database. Safe to re-run: photos are upserted by
// their Apple Photos uuid, and tags are linked with INSERT OR IGNORE so
// nothing duplicates. Must be run from Terminal (`npm run import`) — macOS
// only grants Photos library access to the app actually running the process.
import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { db, DEFAULT_USER_ID } from "../lib/db";
import { categoryForAppleLabel } from "../lib/categories";
import { formatEventDateLabel, weekStartOf } from "../lib/queries/date-utils";
import { readImportSettings } from "../lib/import-settings";
import type { TagType } from "../lib/types";

const SETTINGS = readImportSettings();
// null means "whole library" — no --album filter passed to osxphotos.
const ALBUM = SETTINGS.mode === "album" ? SETTINGS.album : null;
const SOURCE_LABEL = ALBUM ? `"${ALBUM}" album` : "whole Photos library";
const DATA_DIR = path.join(process.cwd(), "data");
const TMP_DIR = path.join(DATA_DIR, "tmp");
const DISPLAY_DIR = path.join(DATA_DIR, "images", "display");
const THUMB_DIR = path.join(DATA_DIR, "images", "thumb");

interface OsxphotosPlace {
  name?: string;
  names?: { city?: string[] };
}

interface OsxphotosRecord {
  uuid: string;
  date: string; // "YYYY-MM-DDTHH:MM:SS±HH:MM"
  persons?: string[];
  labels?: string[];
  favorite?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  place?: OsxphotosPlace | null;
  score?: { overall?: number } | null;
  title?: string | null;
  description?: string | null;
}

// Apple's own caption text for a photo, typed by hand in the Photos app.
// This is NOT AI-generated — it's metadata Apple already had. We only use it
// as a starting description; it's never overwritten once analysis runs.
function extractAppleDescription(record: OsxphotosRecord): string | null {
  const description = record.description?.trim();
  if (description) return description;
  const title = record.title?.trim();
  if (title) return title;
  return null;
}

function resolveOsxphotos(): string {
  const candidates = ["osxphotos", path.join(os.homedir(), ".local", "bin", "osxphotos")];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["version"], { stdio: "pipe" });
      return candidate;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    "Could not find osxphotos. Install it with:\n" +
      "  brew install pipx\n" +
      "  pipx ensurepath\n" +
      "  pipx install osxphotos\n" +
      "Then close and reopen Terminal and run npm run import again."
  );
}

function extractPlaceName(place: OsxphotosPlace | null | undefined): string | null {
  if (!place) return null;
  if (place.names?.city?.length) return place.names.city[0];
  if (place.name) return place.name.split(",")[0].trim();
  return null;
}

function getOrCreateTag(name: string, type: TagType): { id: number; created: boolean } {
  const existing = db
    .prepare(`SELECT id FROM tags WHERE user_id = ? AND type = ? AND name = ?`)
    .get(DEFAULT_USER_ID, type, name) as { id: number } | undefined;
  if (existing) return { id: existing.id, created: false };
  const result = db
    .prepare(`INSERT INTO tags (user_id, name, type) VALUES (?, ?, ?)`)
    .run(DEFAULT_USER_ID, name, type);
  return { id: Number(result.lastInsertRowid), created: true };
}

function linkTag(photoId: string, tagId: number) {
  db.prepare(
    `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, 'apple')`
  ).run(photoId, tagId, DEFAULT_USER_ID);
}

const upsertPhoto = db.prepare(`
  INSERT INTO photos (
    id, user_id, taken_at, year, month, week_start, place_name, latitude, longitude,
    is_favorite, apple_score, display_path, thumb_path, width, height, description, imported_at, images_updated_at
  ) VALUES (
    @id, @user_id, @taken_at, @year, @month, @week_start, @place_name, @latitude, @longitude,
    @is_favorite, @apple_score, @display_path, @thumb_path, @width, @height, @description, datetime('now'), datetime('now')
  )
  ON CONFLICT(id) DO UPDATE SET
    taken_at = excluded.taken_at,
    year = excluded.year,
    month = excluded.month,
    week_start = excluded.week_start,
    place_name = excluded.place_name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_favorite = excluded.is_favorite,
    apple_score = excluded.apple_score,
    display_path = excluded.display_path,
    thumb_path = excluded.thumb_path,
    width = excluded.width,
    height = excluded.height,
    images_updated_at = datetime('now')
`);
// Note: description is only set on first insert (from Apple's own caption,
// if any) and is otherwise left untouched on conflict, same as ai_status,
// ai_error, analyzed_at, and is_profile — re-importing metadata should never
// wipe out AI analysis, a user's profile pick, or a description AI already wrote.

async function main() {
  const osxphotos = resolveOsxphotos();

  console.log(`Reading your ${SOURCE_LABEL} from Apple Photos...`);
  let records: OsxphotosRecord[];
  try {
    const queryArgs = ["query", ...(ALBUM ? ["--album", ALBUM] : []), "--json"];
    const output = execFileSync(osxphotos, queryArgs, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 64,
    });
    records = JSON.parse(output);
  } catch (err) {
    const stderr = err && typeof err === "object" && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    const message = (err instanceof Error ? err.message : String(err)) + "\n" + stderr;
    // osxphotos never prints "permission denied" directly — it shows up as a
    // failure to copy the locked Photos.sqlite, which is the FDA symptom.
    const crashLogPath = path.join(process.cwd(), "osxphotos_crash.log");
    if (fs.existsSync(crashLogPath)) fs.rmSync(crashLogPath);
    if (message.includes("Error copying") || message.toLowerCase().includes("permission")) {
      throw new Error(
        "Photos denied access. Give this app Full Disk Access:\n" +
          "  System Settings > Privacy & Security > Full Disk Access > turn on Claude (or Terminal, " +
          "whichever app you're running this from).\n" +
          "Then run npm run import again."
      );
    }
    throw new Error(`osxphotos couldn't read your Photos library: ${message}`);
  }

  if (records.length === 0) {
    console.log(
      ALBUM
        ? `No photos found in the "${ALBUM}" album. Open Photos, add some photos to an album named exactly "${ALBUM}", and run this again.`
        : "No photos found in your Photos library."
    );
    return;
  }
  console.log(`Found ${records.length} photo(s) in your ${SOURCE_LABEL}.`);

  const existingIds = new Set(
    (db.prepare(`SELECT id FROM photos WHERE user_id = ?`).all(DEFAULT_USER_ID) as { id: string }[]).map(
      (r) => r.id
    )
  );

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(DISPLAY_DIR, { recursive: true });
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  console.log("Exporting full-size images (this downloads any iCloud-only originals, which can be slow)...");
  const exportResult = spawnSync(
    osxphotos,
    [
      "export",
      TMP_DIR,
      ...(ALBUM ? ["--album", ALBUM] : []),
      "--filename",
      "{uuid}",
      "--convert-to-jpeg",
      "--jpeg-ext",
      "jpg",
      "--skip-original-if-edited",
      "--skip-live",
      "--skip-raw",
      "--skip-bursts",
      "--only-photos",
      "--download-missing",
      "--overwrite",
    ],
    { stdio: "inherit" }
  );

  if (exportResult.status !== 0) {
    throw new Error(
      "osxphotos export failed (see the output above). The partial files are left in data/tmp for you to inspect."
    );
  }

  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const peopleFound = new Set<string>();
  const placesFound = new Set<string>();
  let eventsCreated = 0;

  for (const record of records) {
    const exportedPath = path.join(TMP_DIR, `${record.uuid}.jpg`);
    if (!fs.existsSync(exportedPath)) {
      console.warn(`  Skipping ${record.uuid}: no exportable image (video-only, or export failed).`);
      skippedCount++;
      continue;
    }

    const displayPath = path.join(DISPLAY_DIR, `${record.uuid}.jpg`);
    const thumbPath = path.join(THUMB_DIR, `${record.uuid}.jpg`);

    // .rotate() with no arguments bakes in the EXIF orientation (e.g. a
    // portrait photo taken with the phone turned sideways) before resizing.
    // Without it, sharp keeps the sensor's raw pixel orientation and strips
    // the EXIF tag that would have told browsers how to display it upright.
    await sharp(exportedPath)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(displayPath);
    const displayMeta = await sharp(displayPath).metadata();

    await sharp(exportedPath)
      .rotate()
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    const datePart = record.date.slice(0, 10);
    const [year, month] = datePart.split("-").map(Number);
    const placeName = extractPlaceName(record.place);

    upsertPhoto.run({
      id: record.uuid,
      user_id: DEFAULT_USER_ID,
      taken_at: record.date,
      year,
      month,
      week_start: weekStartOf(datePart),
      place_name: placeName,
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      is_favorite: record.favorite ? 1 : 0,
      apple_score: record.score?.overall ?? null,
      display_path: `data/images/display/${record.uuid}.jpg`,
      thumb_path: `data/images/thumb/${record.uuid}.jpg`,
      width: displayMeta.width ?? null,
      height: displayMeta.height ?? null,
      description: extractAppleDescription(record),
    });

    if (existingIds.has(record.uuid)) updatedCount++;
    else newCount++;

    for (const person of record.persons ?? []) {
      const name = person.trim();
      if (!name || name === "_UNKNOWN_") continue;
      peopleFound.add(name);
      linkTag(record.uuid, getOrCreateTag(name, "person").id);
    }

    if (placeName) {
      placesFound.add(placeName);
      linkTag(record.uuid, getOrCreateTag(placeName, "place").id);
    }

    const labels = record.labels ?? [];
    if (labels.length > 0) {
      const matchedCategory = labels.map(categoryForAppleLabel).find((c) => c !== "Other");
      linkTag(record.uuid, getOrCreateTag(matchedCategory ?? "Other", "category").id);
      for (const label of labels) {
        linkTag(record.uuid, getOrCreateTag(label, "keyword").id);
      }
    }

    if (placeName) {
      const eventLabel = `${placeName}, ${formatEventDateLabel(datePart)}`;
      const event = getOrCreateTag(eventLabel, "event");
      if (event.created) eventsCreated++;
      linkTag(record.uuid, event.id);
    }
  }

  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log("");
  console.log("Import complete:");
  console.log(`  ${records.length} photos in your ${SOURCE_LABEL} (${newCount} new, ${updatedCount} updated, ${skippedCount} skipped)`);
  console.log(`  ${peopleFound.size} people found`);
  console.log(`  ${placesFound.size} places found`);
  console.log(`  ${eventsCreated} new events created`);
}

main().catch((err) => {
  console.error("");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
