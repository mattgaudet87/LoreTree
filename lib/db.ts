import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "loretree.db");

declare global {
  var __loretreeDb: Database.Database | undefined;
}

export const db = global.__loretreeDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") {
  global.__loretreeDb = db;
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'matt',
    taken_at TEXT,
    year INTEGER,
    month INTEGER,
    week_start TEXT,
    place_name TEXT,
    latitude REAL,
    longitude REAL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    apple_score REAL,
    is_profile INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    ai_status TEXT NOT NULL DEFAULT 'none',
    ai_error TEXT,
    analyzed_at TEXT,
    display_path TEXT,
    thumb_path TEXT,
    width INTEGER,
    height INTEGER,
    imported_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
  CREATE INDEX IF NOT EXISTS idx_photos_year ON photos(user_id, year);
  CREATE INDEX IF NOT EXISTS idx_photos_week ON photos(user_id, week_start);
  CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(user_id, taken_at);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'matt',
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(user_id, type, name)
  );

  CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(user_id, type);

  CREATE TABLE IF NOT EXISTS photo_tags (
    photo_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'matt',
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (photo_id, tag_id),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_photo_tags_tag ON photo_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON photo_tags(photo_id);

  CREATE TABLE IF NOT EXISTS context_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'matt',
    photo_id TEXT NOT NULL,
    text TEXT NOT NULL,
    input_method TEXT NOT NULL,
    prev_description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_context_notes_photo ON context_notes(photo_id);

  CREATE TABLE IF NOT EXISTS reminisce_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'matt',
    photo_ids TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    summary TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS reminisce_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'matt',
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES reminisce_sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reminisce_messages_session ON reminisce_messages(session_id);
`);

export const DEFAULT_USER_ID = "matt";
