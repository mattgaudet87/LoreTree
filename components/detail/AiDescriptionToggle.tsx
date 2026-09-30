import { useState } from "react";
import type { PhotoWithTags } from "@/lib/types";

/** Collapsible "See AI description" row at the bottom of the detail panel. */
export default function AiDescriptionToggle({ photo }: { photo: PhotoWithTags }) {
  const [open, setOpen] = useState(false);

  if (photo.ai_status !== "done" || !photo.description) return null;

  return (
    <div className="border-t border-white/10 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-xs text-text-muted">
        <span>{open ? "Hide AI description" : "See AI description"}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <p className="mt-2 text-xs leading-relaxed text-text-muted">{photo.description}</p>}
    </div>
  );
}
