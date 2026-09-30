import { useEffect, useState } from "react";
import { fetchTagSuggestions } from "@/lib/tag-suggestions";
import { ADDABLE_TAG_TYPES } from "@/lib/tag-types";
import type { PhotoWithTags, Tag, TagType } from "@/lib/types";

interface TagSectionProps {
  photo: PhotoWithTags;
  onPhotoChange: (photo: PhotoWithTags) => void;
  // Tags the last context note added, as "type:name", shown highlighted with a "new" label.
  newTagKeys: Set<string>;
}

interface PendingEdit {
  tagId: number;
  name: string;
  oldName: string;
  type: TagType;
  oldType: TagType;
}

/** A photo's tags: remove one, rename or reclassify one, and add new ones. */
export default function TagSection({ photo, onPhotoChange, newTagKeys }: TagSectionProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<TagType>("person");
  const [addSuggestions, setAddSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState<TagType>("keyword");
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [editBusy, setEditBusy] = useState(false);

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
    fetchTagSuggestions(editingType, editingName).then((s) => {
      if (!cancelled) {
        setEditSuggestions(
          s.filter((name) => name.toLowerCase() !== editingName.trim().toLowerCase() && name !== editingTag.name)
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editingTag, editingType, editingName]);

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
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not add tag");
      }
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
    if (tag.type === "category") return;
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setEditingType(tag.type);
    setPendingEdit(null);
  }

  function cancelEditTag() {
    setEditingTagId(null);
    setEditingName("");
    setEditingType("keyword");
    setEditSuggestions([]);
    setPendingEdit(null);
  }

  function saveEditTag() {
    if (!editingTag) return;
    const trimmed = editingName.trim();
    if (!trimmed || (trimmed === editingTag.name && editingType === editingTag.type)) {
      cancelEditTag();
      return;
    }
    setPendingEdit({
      tagId: editingTag.id,
      name: trimmed,
      oldName: editingTag.name,
      type: editingType,
      oldType: editingTag.type,
    });
  }

  async function confirmEditTag(scope: "this" | "all") {
    if (!pendingEdit) return;
    setEditBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}/tags/${pendingEdit.tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pendingEdit.name, type: pendingEdit.type, scope }),
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

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photo.tags.map((tag) =>
          editingTagId === tag.id ? (
            <div key={tag.id} className="relative w-full">
              <div className="flex gap-2">
                <select
                  value={editingType}
                  onChange={(e) => setEditingType(e.target.value as TagType)}
                  className="rounded-lg border border-border bg-surface px-2 text-xs text-text"
                >
                  {ADDABLE_TAG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
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
                <button onClick={cancelEditTag} className="rounded-lg border border-border px-3 text-sm text-text-muted">
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
                newTagKeys.has(`${tag.type}:${tag.name}`) ? "border-accent bg-accent/15" : "border-border bg-surface-2"
              }`}
            >
              <button onClick={() => startEditTag(tag)} disabled={tag.type === "category"}>
                {tag.name}
              </button>
              {newTagKeys.has(`${tag.type}:${tag.name}`) && <span className="text-[10px] uppercase text-accent">new</span>}
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
            {pendingEdit.type !== pendingEdit.oldType
              ? `Change "${pendingEdit.oldName}" to "${pendingEdit.name}" (${
                  ADDABLE_TAG_TYPES.find((t) => t.value === pendingEdit.type)?.label
                })`
              : `Rename "${pendingEdit.oldName}" to "${pendingEdit.name}"`}{" "}
            — just for this photo, or everywhere it&apos;s used?
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
            {ADDABLE_TAG_TYPES.map((t) => (
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
    </>
  );
}
