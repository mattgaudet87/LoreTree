import { useEffect, useRef, useState } from "react";
import type { PhotoWithTags } from "@/lib/types";

// How long the "Context added — Undo" bar and the new-tag highlight stay up.
const UNDO_WINDOW_MS = 10_000;

/**
 * The photo's context notes (the text Matt wrote about it), plus adding one
 * (which asks the AI to merge it into the description) and undoing the last.
 */
export function useContextNotes(photo: PhotoWithTags, onPhotoChange: (photo: PhotoWithTags) => void) {
  const [notes, setNotes] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  // Whether any of this note was dictated, so it's saved as a voice note.
  const [usedVoice, setUsedVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tags the last context note added, as "type:name", so they can be highlighted.
  const [newTagKeys, setNewTagKeys] = useState<Set<string>>(new Set());
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The panel stays open while Matt flips through photos, so clear any
  // half-written note from the previous photo and load this one's notes.
  useEffect(() => {
    setOpen(false);
    setText("");
    setUsedVoice(false);
    setBusy(false);
    setError(null);
    // Undo acts on whichever photo is showing, so the bar from the previous
    // photo must not carry over.
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setShowUndo(false);
    setNewTagKeys(new Set());

    let cancelled = false;
    fetch(`/api/photos/${photo.id}/context`)
      .then((res) => (res.ok ? res.json() : { notes: [] }))
      .then(({ notes: loaded }: { notes: { text: string }[] }) => {
        if (!cancelled) setNotes(loaded.map((n) => n.text));
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [photo.id]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  function cancel() {
    setOpen(false);
    setText("");
    setUsedVoice(false);
    setError(null);
  }

  async function save() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Add some context first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, input_method: usedVoice ? "voice" : "text" }),
      });
      if (!res.ok) throw new Error("Could not add context");
      const { photo: updated, new_tags: newTags } = await res.json();
      onPhotoChange(updated);
      setNotes((prev) => [...prev, trimmed]);
      setUsedVoice(false);
      setNewTagKeys(new Set((newTags as { name: string; type: string }[]).map((t) => `${t.type}:${t.name}`)));
      setText("");
      setOpen(false);
      setShowUndo(true);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setShowUndo(false);
        setNewTagKeys(new Set());
      }, UNDO_WINDOW_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setShowUndo(false);
    setNewTagKeys(new Set());
    try {
      const res = await fetch(`/api/photos/${photo.id}/context/undo`, { method: "POST" });
      if (!res.ok) throw new Error("Could not undo");
      const { photo: updated } = await res.json();
      onPhotoChange(updated);
      setNotes((prev) => prev.slice(0, -1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function addDictation(spoken: string) {
    setText((prev) => (prev ? `${prev} ${spoken}` : spoken));
    setUsedVoice(true);
  }

  return { notes, open, setOpen, text, setText, addDictation, busy, error, newTagKeys, showUndo, save, undo, cancel };
}

export type ContextNotesState = ReturnType<typeof useContextNotes>;
