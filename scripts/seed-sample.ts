// Sample data seeder (Phase 2 testing only). Inserts 15 fake photos with
// solid-color images so the API and queries can be exercised without
// touching the real Apple Photos library. Run with `npm run seed`, and
// remove only this data with `npm run seed:clear`.
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { db, DEFAULT_USER_ID } from "../lib/db";
import { categoryForAppleLabel } from "../lib/categories";
import { formatEventDateLabel, weekStartOf } from "../lib/queries/date-utils";
import type { TagType } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DISPLAY_DIR = path.join(DATA_DIR, "images", "display");
const THUMB_DIR = path.join(DATA_DIR, "images", "thumb");

const PEOPLE = ["Alex", "Jordan", "Sam", "Priya"];
const PLACES = ["Kelowna", "Vancouver", "Banff", "Toronto"];
const APPLE_LABELS = ["beach", "hiking", "birthday", "food", "flower", "concert", "family", "friends"];
const KEYWORDS = ["sunset", "hike", "roadtrip", "garden party", "snow day"];

function eventName(dateStr: string, place: string): string {
  return `${place}, ${formatEventDateLabel(dateStr)}`;
}

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomDateBetween(startISO: string, endISO: string): string {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const t = start + Math.random() * (end - start);
  return new Date(t).toISOString().slice(0, 10);
}

function hslColor(index: number, total: number): { r: number; g: number; b: number } {
  const hue = (index / total) * 360;
  // simple HSL(hue, 55%, 45%) -> RGB conversion
  const s = 0.55;
  const l = 0.45;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

async function makeImage(filePath: string, width: number, height: number, color: { r: number; g: number; b: number }) {
  await sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg({ quality: 80 })
    .toFile(filePath);
}

function insertTag(name: string, type: TagType): number {
  const existing = db
    .prepare(`SELECT id FROM tags WHERE user_id = ? AND type = ? AND name = ?`)
    .get(DEFAULT_USER_ID, type, name) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db
    .prepare(`INSERT INTO tags (user_id, name, type) VALUES (?, ?, ?)`)
    .run(DEFAULT_USER_ID, name, type);
  return Number(result.lastInsertRowid);
}

function linkTag(photoId: string, tagId: number, source: "apple" | "ai" | "user") {
  db.prepare(
    `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, user_id, source) VALUES (?, ?, ?, ?)`
  ).run(photoId, tagId, DEFAULT_USER_ID, source);
}

async function seed() {
  fs.mkdirSync(DISPLAY_DIR, { recursive: true });
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  const COUNT = 15;
  console.log(`Seeding ${COUNT} sample photos...`);

  const insertPhoto = db.prepare(`
    INSERT INTO photos (
      id, user_id, taken_at, year, month, week_start, place_name, latitude, longitude,
      is_favorite, apple_score, is_profile, description, ai_status, ai_error, analyzed_at,
      display_path, thumb_path, width, height, imported_at
    ) VALUES (
      @id, @user_id, @taken_at, @year, @month, @week_start, @place_name, @latitude, @longitude,
      @is_favorite, @apple_score, @is_profile, @description, @ai_status, @ai_error, @analyzed_at,
      @display_path, @thumb_path, @width, @height, datetime('now')
    )
  `);

  const insertContextNote = db.prepare(`
    INSERT INTO context_notes (user_id, photo_id, text, input_method, prev_description, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  // better-sqlite3 transactions must be synchronous, so the DB writes (fast,
  // in-memory-ish) run in one transaction below, and the async image
  // generation (file I/O) happens afterward in a separate loop.
  const records: { id: string; color: { r: number; g: number; b: number } }[] = [];

  const insertAll = db.transaction(() => {
    for (let i = 0; i < COUNT; i++) {
      const id = `seed-${String(i + 1).padStart(4, "0")}`;
      const takenAt = randomDateBetween("2023-01-01", "2026-09-28");
      const [y, m] = takenAt.split("-").map(Number);
      const place = PLACES[i % PLACES.length];
      const people = pick(PEOPLE, 1 + (i % 3));
      const appleLabel = APPLE_LABELS[i % APPLE_LABELS.length];
      const category = categoryForAppleLabel(appleLabel);
      const keywords = pick(KEYWORDS, 1 + (i % 2));
      const isFavorite = i % 4 === 0;
      const appleScore = Math.round(Math.random() * 100) / 100;

      const isError = i === COUNT - 1; // last one simulates a failed analysis
      const isAnalyzed = !isError && i % 3 !== 0; // most are "analyzed", some left untouched

      const displayPath = `data/images/display/${id}.jpg`;
      const thumbPath = `data/images/thumb/${id}.jpg`;
      const color = hslColor(i, COUNT);

      insertPhoto.run({
        id,
        user_id: DEFAULT_USER_ID,
        taken_at: `${takenAt}T12:00:00`,
        year: y,
        month: m,
        week_start: weekStartOf(takenAt),
        place_name: place,
        latitude: null,
        longitude: null,
        is_favorite: isFavorite ? 1 : 0,
        apple_score: appleScore,
        is_profile: 0,
        description: isAnalyzed
          ? `${people.join(" and ")} spent time in ${place}, sharing an easy afternoon together.`
          : null,
        ai_status: isError ? "error" : isAnalyzed ? "done" : "none",
        ai_error: isError ? "Claude returned invalid JSON" : null,
        analyzed_at: isAnalyzed ? new Date().toISOString() : null,
        display_path: displayPath,
        thumb_path: thumbPath,
        width: 1600,
        height: 1200,
      });

      for (const person of people) {
        linkTag(id, insertTag(person, "person"), "apple");
      }
      linkTag(id, insertTag(place, "place"), "apple");
      linkTag(id, insertTag(category, "category"), "apple");
      linkTag(id, insertTag(eventName(takenAt, place), "event"), "apple");
      for (const keyword of keywords) {
        linkTag(id, insertTag(keyword, "keyword"), "apple");
      }

      if (i % 5 === 0) {
        const note = `This was the trip where we ${keywords[0]} — such a good day.`;
        insertContextNote.run(DEFAULT_USER_ID, id, note, "text", null);
      }

      records.push({ id, color });
    }
  });

  insertAll();

  for (const { id, color } of records) {
    await makeImage(path.join(DISPLAY_DIR, `${id}.jpg`), 1600, 1200, color);
    await makeImage(path.join(THUMB_DIR, `${id}.jpg`), 400, 300, color);
  }
  console.log(`Done. Inserted ${COUNT} seed photos (ids seed-0001..seed-${String(COUNT).padStart(4, "0")}).`);
}

function clear() {
  console.log("Clearing seed data...");
  const seedPhotoIds = (
    db.prepare(`SELECT id FROM photos WHERE id LIKE 'seed-%'`).all() as { id: string }[]
  ).map((r) => r.id);

  const run = db.transaction(() => {
    db.prepare(`DELETE FROM context_notes WHERE photo_id LIKE 'seed-%'`).run();
    db.prepare(`DELETE FROM photo_tags WHERE photo_id LIKE 'seed-%'`).run();
    db.prepare(`DELETE FROM photos WHERE id LIKE 'seed-%'`).run();
  });
  run();

  for (const id of seedPhotoIds) {
    for (const dir of [DISPLAY_DIR, THUMB_DIR]) {
      const file = path.join(dir, `${id}.jpg`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  console.log(`Removed ${seedPhotoIds.length} seed photos and their tags, notes, and images.`);
}

const isClear = process.argv.includes("--clear");
(isClear ? Promise.resolve(clear()) : seed()).catch((err) => {
  console.error(err);
  process.exit(1);
});
