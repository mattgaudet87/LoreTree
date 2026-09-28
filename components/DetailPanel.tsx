"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoWithTags, Tag, TagType } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import MicButton from "@/components/MicButton";

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

async function fetchTagSuggestions(type: TagType, query: string): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/tags/suggest?type=${type}&q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const { suggestions } = (await res.json()) as { suggestions: string[] };
    return suggestions;
  } catch {
    return [];
  }
}

export default function DetailPanel({ photo, onClose, onPhotoChange }: DetailPanelProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<TagType>("person");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "downloaded">("idle");

  const [contextOpen, setContextOpen] = useState(false);
  const [contextText, setContextText] = useState("");
  const [contextBusy, setContextBusy] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [newTagKeys, setNewTagKeys] = useState<Set<string>>(new Set());
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addSuggestions, setAddSuggestions] = useState<string[]>([]);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [pendingEdit, setPendingEdit] = useState<{ tagId: number; name: string; oldName: string } | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTagSuggestions(newTagType, newTagName).then((s) => {
      if (!cancelled) setAddSuggestions(s.filter((name) => name.toLowerCase() !== newTagName.trim().toLowerCase()));
    });
    return () => {
      cancelled = true;
    };
  }, [newTagType, newTagName]);

  const editingTag = editingTagId ? photo.tags.find((t) => t.id === editingTagId) ?? null : null;

  useEffect(() => {
    if (!editingTag) {
      setEditSuggestions([]);
      return;
    }
    let cancelled = false;
    fetchTagSuggestions(editingTag.type, editingName).then((s) => {
      if (!cancelled) {
        setEditSuggestions(
          s.filter((name) => name.toLowerCase() !== editingName.trim().toLowerCase() && name !== editingTag.name)
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editingTag, editingName]);

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

  async function addTag(overrideName?: string) {
    const name = (overrideName ?? newTagName).trim();
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
      setAddSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function startEditTag(tag: Tag) {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setPendingEdit(null);
  }

  function cancelEditTag() {
    setEditingTagId(null);
    setEditingName("");
    setEditSuggestions([]);
    setPendingEdit(null);
  }

  function saveEditTag() {
    if (!editingTag) return;
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === editingTag.name) {
      cancelEditTag();
      return;
    }
    setPendingEdit({ tagId: editingTag.id, name: trimmed, oldName: editingTag.name });
  }

  async function confirmEditTag(scope: "this" | "all") {
    if (!pendingEdit) return;
    setEditBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}/tags/${pendingEdit.tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pendingEdit.name, scope }),
      });
      if (!res.ok) throw new Error("Could not update tag");
      const { tags } = await res.json();
      onPhotoChange({ ...photo, tags });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEditBusy(false);
      cancelEditTag();
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

  async function saveContext() {
    const text = contextText.trim();
    if (!text) {
      setContextError("Add some context first");
      return;
    }
    setContextBusy(true);
    setContextError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, input_method: "text" }),
      });
      if (!res.ok) throw new Error("Could not add context");
      const { photo: updated, new_tags: newTags } = await res.json();
      onPhotoChange(updated);
      setNewTagKeys(new Set((newTags as { name: string; type: string }[]).map((t) => `${t.type}:${t.name}`)));
      setContextText("");
      setContextOpen(false);
      setShowUndo(true);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setShowUndo(false);
        setNewTagKeys(new Set());
      }, 10_000);
    } catch (err) {
      setContextError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setContextBusy(false);
    }
  }

  async function undoContext() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setShowUndo(false);
    setNewTagKeys(new Set());
    try {
      const res = await fetch(`/api/photos/${photo.id}/context/undo`, { method: "POST" });
      if (!res.ok) throw new Error("Could not undo");
      const { photo: updated } = await res.json();
      onPhotoChange(updated);
    } catch (err) {
      setContextError(err instanceof Error ? err.message : "Something went wrong");
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
            <p
              className={`font-serif text-base leading-relaxed text-text transition-colors duration-1000 ${
                showUndo ? "rounded-lg bg-accent/15 px-2 py-1 -mx-2" : ""
              }`}
            >
              {photo.description}
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              No description yet —{" "}
              <a href="/settings" className="underline">
                analyze it in Settings
              </a>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {photo.tags.map((tag) =>
              editingTagId === tag.id ? (
                <div key={tag.id} className="relative w-full">
                  <div className="flex gap-2">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditTag();
                        if (e.key === "Escape") cancelEditTag();
                      }}
                      autoFocus
                      className="flex-1 rounded-lg border border-accent bg-surface px-3 py-1.5 text-sm text-text"
                    />
                    <button
                      onClick={saveEditTag}
                      disabled={editBusy || !editingName.trim()}
                      className="rounded-lg bg-accent px-3 text-sm font-medium text-bg disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditTag}
                      className="rounded-lg border border-border px-3 text-sm text-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                  {editSuggestions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface p-2">
                      {editSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditingName(s)}
                          className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text hover:border-accent"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span
                  key={tag.id}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-text ${
                    newTagKeys.has(`${tag.type}:${tag.name}`)
                      ? "border-accent bg-accent/15"
                      : "border-border bg-surface-2"
                  }`}
                >
                  <button onClick={() => startEditTag(tag)}>{tag.name}</button>
                  {newTagKeys.has(`${tag.type}:${tag.name}`) && (
                    <span className="text-[10px] uppercase text-accent">new</span>
                  )}
                  <button
                    onClick={() => removeTag(tag)}
                    disabled={busy}
                    aria-label={`Remove ${tag.name}`}
                    className="text-text-muted hover:text-text"
                  >
                    ×
                  </button>
                </span>
              )
            )}
          </div>

          {pendingEdit && (
            <div className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-3 text-sm text-text">
              <p>
                Rename &ldquo;{pendingEdit.oldName}&rdquo; to &ldquo;{pendingEdit.name}&rdquo; — just for this photo,
                or everywhere it&apos;s used?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmEditTag("this")}
                  disabled={editBusy}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text disabled:opacity-40"
                >
                  Just this photo
                </button>
                <button
                  onClick={() => confirmEditTag("all")}
                  disabled={editBusy}
                  className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-bg disabled:opacity-40"
                >
                  All photos
                </button>
                <button
                  onClick={cancelEditTag}
                  disabled={editBusy}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="relative">
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
                onClick={() => addTag()}
                disabled={busy || !newTagName.trim()}
                className="rounded-lg bg-accent px-3 text-sm font-medium text-bg disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {addSuggestions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface p-2">
                {addSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addTag(s)}
                    className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text hover:border-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-node-events">{error}</p>}

          {contextOpen && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex gap-2">
                <textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="What does this photo mean to you?"
                  rows={3}
                  className="flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted"
                />
                <MicButton onResult={(text) => setContextText((prev) => (prev ? `${prev} ${text}` : text))} />
              </div>
              {contextError && <p className="text-xs text-node-events">{contextError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setContextOpen(false);
                    setContextText("");
                    setContextError(null);
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={saveContext}
                  disabled={contextBusy || !contextText.trim()}
                  className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
                >
                  {contextBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {showUndo && (
            <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text">
              <span>Context added</span>
              <button onClick={undoContext} className="font-medium text-accent underline">
                Undo
              </button>
            </div>
          )}

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
              onClick={() => setContextOpen((open) => !open)}
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text"
            >
              Add context
            </button>
          </div>
        </div>
      </div>
  );
}

