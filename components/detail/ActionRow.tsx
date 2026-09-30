import { useState } from "react";
import { photoImageUrl } from "@/lib/image-url";
import type { PhotoWithTags } from "@/lib/types";

interface ActionRowProps {
  photo: PhotoWithTags;
  onToggleContext: () => void;
}

/**
 * The Share / Add context button row. "Add to profile" is hidden until the
 * Profile page is built (the API still supports is_profile).
 */
export default function ActionRow({ photo, onToggleContext }: ActionRowProps) {
  const [shareState, setShareState] = useState<"idle" | "sharing" | "downloaded">("idle");

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

  const buttonClass = "flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text";

  return (
    <div className="mt-auto flex gap-2 pt-2">
      <button onClick={share} className={buttonClass}>
        {shareState === "downloaded" ? "Downloaded" : "Share"}
      </button>
      <button onClick={onToggleContext} className={buttonClass}>
        Add context
      </button>
    </div>
  );
}
