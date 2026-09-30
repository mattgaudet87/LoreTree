"use client";

import type { PhotoWithTags } from "@/lib/types";
import type { ImageFitMode } from "@/lib/image-mode";
import { useProfileToggle } from "@/components/detail/useProfileToggle";
import { useSharePhoto } from "@/components/detail/useSharePhoto";

interface FeedActionRailProps {
  photo: PhotoWithTags;
  imageMode: ImageFitMode;
  onImageModeChange: (mode: ImageFitMode) => void;
  onPhotoChange: (photo: PhotoWithTags) => void;
  onAddContext: () => void;
}

const circle =
  "flex h-11 w-11 items-center justify-center rounded-full bg-glass text-text backdrop-blur outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60";

function RailButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={disabled}
        aria-label={label}
        className={circle}
      >
        {children}
      </button>
      <span className="text-[11px] font-medium text-text">{label}</span>
    </div>
  );
}

/** The Profile / Context / Share / View buttons down the right side of the feed. */
export default function FeedActionRail({ photo, imageMode, onImageModeChange, onPhotoChange, onAddContext }: FeedActionRailProps) {
  const { isProfile, busy, toggle } = useProfileToggle(photo, onPhotoChange);
  const { shareState, share } = useSharePhoto(photo);

  return (
    <div className="absolute right-3 z-10 flex flex-col items-center gap-[18px]" style={{ bottom: 200 }}>
      <RailButton label="Profile" onClick={toggle} disabled={busy}>
        <span className={`text-xl leading-none ${isProfile ? "text-node-events" : "text-text-muted"}`}>★</span>
      </RailButton>

      <RailButton label="Context" onClick={onAddContext}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </RailButton>

      <RailButton label={shareState === "downloaded" ? "Saved" : "Share"} onClick={share} disabled={shareState === "sharing"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
          <path d="M12 15V3M7 8l5-5 5 5M5 14v6h14v-6" />
        </svg>
      </RailButton>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageModeChange(imageMode === "fit" ? "zoom" : "fit");
          }}
          aria-label={`View: ${imageMode === "fit" ? "Fit" : "Zoom"}. Tap to switch.`}
          className={`${circle} text-[11px] font-semibold`}
        >
          {imageMode === "fit" ? "Fit" : "Zoom"}
        </button>
        <span className="text-[11px] font-medium text-text">View</span>
      </div>
    </div>
  );
}
