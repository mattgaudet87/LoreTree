"use client";

import { useEffect, useState } from "react";
import { photoImageUrl } from "@/lib/image-url";
import { fetchTagSuggestions } from "@/lib/tag-suggestions";
import { ADDABLE_TAG_TYPES } from "@/lib/tag-types";
import type { TagType } from "@/lib/types";
import type { GridState } from "./lore-shared";

interface LorePhotoGridProps {
  grid: GridState;
  // Called after a bulk tag succeeds so the pages behind the grid can reload.
  onTagged: () => void;
}

/** Full-screen thumbnail grid with photo selection and bulk tagging. */
export default function LorePhotoGrid({ grid, onTagged }: LorePhotoGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagType, setBulkTagType] = useState<TagType>("person");
  const [bulkTagName, setBulkTagName] = useState("");
  const [bulkSuggestions, setBulkSuggestions] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<string | null>(null);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === grid.photos.length ? new Set() : new Set(grid.photos.map((p) => p.id))
    );
  }

  useEffect(() => {
    let cancelled = false;
    fetchTagSuggestions(bulkTagType, bulkTagName).then((s) => {
      if (!cancelled) setBulkSuggestions(s.filter((name) => name.toLowerCase() !== bulkTagName.trim().toLowerCase()));
    });
    return () => {
      cancelled = true;
    };
  }, [bulkTagType, bulkTagName]);

  async function addBulkTag(overrideName?: string) {
    const name = (overrideName ?? bulkTagName).trim();
    if (!name || selectedIds.size === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    setBulkDone(null);
    try {
      const res = await fetch(`/api/tags/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: Array.from(selectedIds), name, type: bulkTagType }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not add tag");
      }
      setBulkDone(`Added "${name}" to ${selectedIds.size} photo${selectedIds.size === 1 ? "" : "s"}.`);
      setBulkTagName("");
      setBulkSuggestions([]);
      onTagged();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg md:left-20">
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => grid.onClose()}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted hover:text-text"
        >
          ×
        </button>
        <button
          onClick={toggleSelectAll}
          className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          {selectedIds.size === grid.photos.length ? "Deselect all" : "Select all"}
        </button>
        <p className="text-sm font-medium text-text">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : grid.total > grid.photos.length
              ? `Showing ${grid.photos.length.toLocaleString()} of ${grid.total.toLocaleString()} photos`
              : `${grid.photos.length} photo${grid.photos.length === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-4 md:grid-cols-6">
        {grid.photos.map((p) => {
          const selected = selectedIds.has(p.id);
          return (
            <a
              key={p.id}
              href={`/feed?ids=${encodeURIComponent(grid.photos.map((gp) => gp.id).join(","))}&start=${p.id}&back=${encodeURIComponent(grid.backHref)}`}
              className="relative block aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
            >
              {p.thumb_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoImageUrl(p, "thumb")} alt="" className="h-full w-full object-cover" />
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSelected(p.id);
                }}
                aria-label={selected ? "Deselect photo" : "Select photo"}
                aria-pressed={selected}
                className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md border-2 backdrop-blur ${
                  selected ? "border-accent bg-accent text-bg" : "border-white/70 bg-black/30 text-transparent"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
            </a>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div
          className="flex flex-col gap-2 border-t border-border bg-surface px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {bulkError && <p className="text-xs text-node-events">{bulkError}</p>}
          {bulkDone && <p className="text-xs text-accent">{bulkDone}</p>}
          <div className="relative flex gap-2">
            <select
              value={bulkTagType}
              onChange={(e) => setBulkTagType(e.target.value as TagType)}
              className="rounded-lg border border-border bg-surface-2 px-2 text-xs text-text"
            >
              {ADDABLE_TAG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              value={bulkTagName}
              onChange={(e) => setBulkTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBulkTag()}
              placeholder={`Add a tag to ${selectedIds.size} photo${selectedIds.size === 1 ? "" : "s"}`}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-text placeholder:text-text-muted"
            />
            <button
              onClick={() => addBulkTag()}
              disabled={bulkBusy || !bulkTagName.trim()}
              className="rounded-lg bg-accent px-3 text-sm font-medium text-bg disabled:opacity-40"
            >
              Add
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-border px-3 text-sm text-text-muted"
            >
              Clear
            </button>
          </div>
          {bulkSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-2">
              {bulkSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => addBulkTag(s)}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text hover:border-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
