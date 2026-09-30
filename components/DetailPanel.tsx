"use client";

import { useEffect } from "react";
import type { PhotoWithTags } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import { captionTagsFor, longCaption } from "@/lib/caption";
import { formatPhotoDate } from "@/lib/format";
import { useImageMode } from "@/lib/use-image-mode";
import ImageModeToggle from "@/components/ImageModeToggle";
import ActionRow from "@/components/detail/ActionRow";
import AnalyzeButton from "@/components/detail/AnalyzeButton";
import ContextEditor from "@/components/detail/ContextEditor";
import TagSection from "@/components/detail/TagSection";
import { useContextNotes } from "@/components/detail/useContextNotes";

interface DetailPanelProps {
  photo: PhotoWithTags;
  onClose: () => void;
  onPhotoChange: (photo: PhotoWithTags) => void;
}

/** The full-screen photo view: image on the back, description, tags, and actions on top. */
export default function DetailPanel({ photo, onClose, onPhotoChange }: DetailPanelProps) {
  const [imageMode, selectImageMode] = useImageMode();
  const context = useContextNotes(photo, onPhotoChange);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape inside a text box (e.g. editing a tag) only cancels that edit.
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const caption = longCaption(captionTagsFor(photo.tags));

  return (
    <div className="fixed inset-0 z-30 bg-black" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoImageUrl(photo, "display")}
        alt={photo.description ?? "Photo"}
        className={`absolute inset-0 h-full w-full ${imageMode === "fit" ? "object-contain" : "object-cover"}`}
        draggable={false}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Back"
        className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-text"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <ImageModeToggle
        mode={imageMode}
        onChange={selectImageMode}
        className="bottom-3 left-3 border-white/15 bg-black/50"
      />

      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[70vh] w-full flex-col gap-4 overflow-y-auto bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-6 pt-20 backdrop-blur-md md:inset-x-auto md:inset-y-auto md:bottom-auto md:left-auto md:right-6 md:top-1/2 md:h-auto md:w-96 md:max-h-[80vh] md:-translate-y-1/2 md:rounded-2xl md:border md:border-white/10 md:bg-none md:bg-black/70 md:px-6 md:py-6 md:pt-6 md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-xs text-text-muted">{formatPhotoDate(photo.taken_at, "long")}</p>
        </div>

        {/* The caption is the short "who, what, where" line; the story below it is the heart of the view. */}
        {caption && <p className="text-sm font-medium text-text">{caption}</p>}

        {photo.description ? (
          <p className="font-serif text-base leading-relaxed text-text">{photo.description}</p>
        ) : (
          <p className="text-sm text-text-muted">No description yet.</p>
        )}

        {context.notes.length > 0 && (
          <div
            className={`flex flex-col gap-1.5 transition-colors duration-1000 ${
              context.showUndo ? "-mx-2 rounded-lg bg-accent/15 px-2 py-1" : ""
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Your notes</p>
            {context.notes.map((note, i) => (
              <p key={i} className="text-sm leading-relaxed text-text-muted">
                {note}
              </p>
            ))}
          </div>
        )}

        {/* Keyed by photo so each section starts fresh when Matt flips to another photo. */}
        <AnalyzeButton key={`analyze-${photo.id}`} photo={photo} onPhotoChange={onPhotoChange} />

        <TagSection key={`tags-${photo.id}`} photo={photo} onPhotoChange={onPhotoChange} newTagKeys={context.newTagKeys} />

        <ContextEditor context={context} />

        <ActionRow
          key={`actions-${photo.id}`}
          photo={photo}
          onToggleContext={() => context.setOpen((open) => !open)}
        />

      </div>
    </div>
  );
}
