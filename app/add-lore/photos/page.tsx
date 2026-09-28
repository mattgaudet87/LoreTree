"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ImportSettings {
  mode: "album" | "all";
  album: string;
}

const IMPORT_COMMAND = "npm run import";

function CommandBox({ label }: { label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(IMPORT_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (e.g. no permission) — the code is still visible to copy by hand.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <code className="text-sm text-text">{IMPORT_COMMAND}</code>
      </div>
      <button
        onClick={copy}
        className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function AddPhotosPage() {
  const [settings, setSettings] = useState<ImportSettings | null>(null);
  const [mode, setMode] = useState<"album" | "all">("album");
  const [album, setAlbum] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/import-settings")
      .then((res) => res.json())
      .then((data: ImportSettings) => {
        setSettings(data);
        setMode(data.mode);
        setAlbum(data.album);
      })
      .catch(() => setError("Could not load your current settings."));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/import-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, album }),
      });
      if (!res.ok) throw new Error("Could not save");
      const data: ImportSettings = await res.json();
      setSettings(data);
      setMode(data.mode);
      setAlbum(data.album);
      setEditingTarget(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const currentSourceLabel = settings
    ? settings.mode === "all"
      ? "your whole Photos library"
      : `the "${settings.album}" album`
    : "…";

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-12">
      <Link href="/lore" className="text-sm text-text-muted hover:text-text">
        &larr; Back
      </Link>
      <h1 className="mb-1 mt-4 text-lg font-semibold text-text">Add Photos</h1>
      <p className="mb-6 text-sm text-text-muted">
        Bring in photos from Apple Photos. macOS only lets Terminal read your Photos library, so importing still
        means pasting one command there — but you can set everything up here first.
      </p>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <p className="mb-1 text-sm font-semibold text-text">Sync LoreTree Folder</p>
        <p className="mb-3 text-sm text-text-muted">
          Re-syncs {currentSourceLabel} — the same source you set up last time. New and changed photos come in;
          nothing is duplicated.
        </p>
        <CommandBox label="Paste this into Terminal and press Return" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="mb-1 text-sm font-semibold text-text">Add Apple Photos</p>
        <p className="mb-3 text-sm text-text-muted">Choose what Terminal should sync the next time you run it.</p>

        {!editingTarget && settings && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
            <p className="text-sm text-text">
              Currently set to <span className="font-medium">{currentSourceLabel}</span>
            </p>
            <button
              onClick={() => setEditingTarget(true)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
            >
              Change
            </button>
          </div>
        )}

        {editingTarget && (
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3">
              <input
                type="radio"
                name="import-mode"
                checked={mode === "album"}
                onChange={() => setMode("album")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm text-text">Sync one album or folder</span>
                <span className="block text-xs text-text-muted">
                  Type the exact name of an album in Apple Photos (create one there first if you need to).
                </span>
                {mode === "album" && (
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    placeholder="LoreTree Beta"
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted"
                  />
                )}
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3">
              <input
                type="radio"
                name="import-mode"
                checked={mode === "all"}
                onChange={() => setMode("all")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm text-text">Sync my whole Photos library</span>
                <span className="block text-xs text-text-muted">
                  Every photo Apple Photos can see, not just one album.
                </span>
              </span>
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || (mode === "album" && !album.trim())}
                className="banner-gradient flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingTarget(false);
                  if (settings) {
                    setMode(settings.mode);
                    setAlbum(settings.album);
                  }
                }}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {saved && !editingTarget && (
          <p className="mt-3 text-xs text-text-muted">
            Saved. Run the command above in Terminal to sync {currentSourceLabel}.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {["Google Drive", "Dropbox", "OneDrive", "iCloud Backup"].map((source) => (
          <button
            key={source}
            disabled
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm text-text-muted opacity-60"
          >
            {source} — coming soon
          </button>
        ))}
      </div>
    </div>
  );
}
