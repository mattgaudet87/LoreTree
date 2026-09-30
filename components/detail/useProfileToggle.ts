import { useState } from "react";
import type { PhotoWithTags } from "@/lib/types";

/** Adds the photo to (or removes it from) the profile. */
export function useProfileToggle(photo: PhotoWithTags, onPhotoChange: (photo: PhotoWithTags) => void) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_profile: !photo.is_profile }),
      });
      if (res.ok) {
        const { photo: updated } = (await res.json()) as { photo: PhotoWithTags };
        onPhotoChange(updated);
      }
    } finally {
      setBusy(false);
    }
  }

  return { isProfile: photo.is_profile, busy, toggle };
}
