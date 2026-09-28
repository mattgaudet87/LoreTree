// Stores what the Terminal import command (`npm run import`) should sync:
// either one Apple Photos album, or the whole library. Saved to disk so the
// web app (which can't read Photos itself — see scripts/import-photos.ts)
// and the Terminal script agree on the same target.
import fs from "fs";
import path from "path";

export interface ImportSettings {
  mode: "album" | "all";
  album: string;
}

const DEFAULT_SETTINGS: ImportSettings = { mode: "album", album: "LoreTree Beta" };

const SETTINGS_PATH = path.join(process.cwd(), "data", "import-settings.json");

export function readImportSettings(): ImportSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ImportSettings>;
    if (parsed.mode === "all") return { mode: "all", album: parsed.album?.trim() || DEFAULT_SETTINGS.album };
    const album = parsed.album?.trim();
    return { mode: "album", album: album || DEFAULT_SETTINGS.album };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeImportSettings(settings: ImportSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const album = settings.album.trim() || DEFAULT_SETTINGS.album;
  const toSave: ImportSettings = settings.mode === "all" ? { mode: "all", album } : { mode: "album", album };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toSave, null, 2));
}
