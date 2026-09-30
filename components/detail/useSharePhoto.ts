import { useState } from "react";
import { photoImageUrl } from "@/lib/image-url";
import type { PhotoWithTags } from "@/lib/types";

/** Shares the photo with the phone's share sheet, or downloads it where sharing isn't available. */
export function useSharePhoto(photo: PhotoWithTags) {
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

  return { shareState, share };
}
