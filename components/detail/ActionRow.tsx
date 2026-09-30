import { useState } from "react";
import { photoImageUrl } from "@/lib/image-url";
import type { PhotoWithTags } from "@/lib/types";

interface ActionRowProps {
  photo: PhotoWithTags;
  onPhotoChange: (photo: PhotoWithTags) => void;
  onToggleContext: () => void;
}

/** The Share / Add to profile / Add context button row. */
export default function ActionRow({ photo, onPhotoChange, onToggleContext }: ActionRowProps) {
  const [shareState, setShareState] = useState<"idle" | "sharing" | "downloaded">("idle");
  const [profileBusy, setProfileBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function toggleProfile() {
    setProfileBusy(true);
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
      setProfileBusy(false);
    }
  }

  const buttonClass = "flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text";

  return (
    <>
      {error && <p className="text-xs text-node-events">{error}</p>}
      <div className="mt-auto flex gap-2 pt-2">
        <button onClick={share} className={buttonClass}>
          {shareState === "downloaded" ? "Downloaded" : "Share"}
        </button>
        <button onClick={toggleProfile} disabled={profileBusy} className={buttonClass}>
          {photo.is_profile ? "★ In profile" : "☆ Add to profile"}
        </button>
        <button onClick={onToggleContext} className={buttonClass}>
          Add context
        </button>
      </div>
    </>
  );
}
