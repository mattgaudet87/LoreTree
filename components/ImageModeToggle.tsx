import type { ImageFitMode } from "@/lib/image-mode";

interface ImageModeToggleProps {
  mode: ImageFitMode;
  onChange: (mode: ImageFitMode) => void;
  // Position and colors, since the feed and the detail view place and tint it differently.
  className: string;
}

/** The "Fit | Zoom" pill: Fit shows the whole photo, Zoom fills the screen. */
export default function ImageModeToggle({ mode, onChange, className }: ImageModeToggleProps) {
  return (
    <div
      className={`absolute z-10 flex overflow-hidden rounded-full border text-xs backdrop-blur ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {(["fit", "zoom"] as ImageFitMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`px-3 py-1.5 font-medium capitalize transition-colors ${
            mode === m ? "bg-accent text-bg" : "text-text-muted"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
