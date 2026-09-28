"use client";

import { useEffect, useState } from "react";
import type { PhotoWithTags, Tag, TagType } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";

interface DetailPanelProps {
  photo: PhotoWithTags;
  onClose: () => void;
  onPhotoChange: (photo: PhotoWithTags) => void;
}

const ADDABLE_TYPES: { value: TagType; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "place", label: "Place" },
  { value: "keyword", label: "Keyword" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function DetailPanel({ photo, onClose, onPhotoChange }: DetailPanelProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<TagType>("person");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "downloaded">("idle");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const eventTag = photo.tags.find((t) => t.type === "event");

  async function removeTag(tag: Tag) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove tag");
      const { tags } = await res.json();
      onPhotoChange({ ...photo, tags });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function addTag() {
    const name = newTagName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: newTagType }),
      });
      if (!res.ok) throw new Error("Could not add tag");
      const { tags } = await res.json();
      onPhotoChange({ ...photo, tags });
      setNewTagName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggleProfile() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_profile: !photo.is_profile }),
      });
      if (!res.ok) throw new Error("Could not update");
      const { photo: updated } = await res.json();
      onPhotoChange({ ...photo, is_profile: updated.is_profile });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}${photoImageUrl(photo, "display")}`;
    setShareState("sharing");
    try {
      if (navigator.share) {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], `${photo.id}.jpg`, { type: "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: photo.description ?? undefined });
          setShareState("idle");
          return;
        }
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `${photo.id}.jpg`;
      a.click();
      setShareState("downloaded");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-black" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoImageUrl(photo, "display")}
        alt={photo.description ?? "Photo"}
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-text"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-5 w-5"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[70vh] w-full flex-col gap-4 overflow-y-auto bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-6 pt-20 backdrop-blur-md md:inset-x-auto md:inset-y-auto md:bottom-auto md:left-auto md:right-6 md:top-1/2 md:h-auto md:w-96 md:max-h-[80vh] md:-translate-y-1/2 md:rounded-2xl md:border md:border-white/10 md:bg-none md:bg-black/70 md:px-6 md:py-6 md:pt-6 md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {eventTag && <p className="text-sm font-medium text-text">{eventTag.name}</p>}
          <p className="text-xs text-text-muted">
            {formatDate(photo.taken_at)}
            {photo.place_name ? ` · ${photo.place_name}` : ""}
          </p>
        </div>

          {photo.ai_status === "done" && photo.description ? (
            <p className="font-serif text-base leading-relaxed text-text">{photo.description}</p>
          ) : (
            <p className="text-sm text-text-muted">
              No description yet —{" "}
              <a href="/settings" className="underline">
                analyze it in Settings
              </a>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {photo.tags.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text"
              >
                {tag.name}
                <button
                  onClick={() => removeTag(tag)}
                  disabled={busy}
                  aria-label={`Remove ${tag.name}`}
                  className="text-text-muted hover:text-text"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={newTagType}
              onChange={(e) => setNewTagType(e.target.value as TagType)}
              className="rounded-lg border border-border bg-surface px-2 text-xs text-text"
            >
              {ADDABLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add a tag"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted"
            />
            <button
              onClick={addTag}
              disabled={busy || !newTagName.trim()}
              className="rounded-lg bg-accent px-3 text-sm font-medium text-bg disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {error && <p className="text-xs text-node-events">{error}</p>}

          <div className="mt-auto flex gap-2 pt-2">
            <button
              onClick={share}
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text"
            >
              {shareState === "downloaded" ? "Downloaded" : "Share"}
            </button>
            <button
              onClick={toggleProfile}
              disabled={busy}
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text"
            >
              {photo.is_profile ? "★ In profile" : "☆ Add to profile"}
            </button>
            <button
              disabled
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-muted opacity-50"
              title="Coming in Phase 6"
            >
              Add context
            </button>
          </div>
        </div>
      </div>
  );
}

