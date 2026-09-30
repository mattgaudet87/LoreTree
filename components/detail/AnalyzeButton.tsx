import { useState } from "react";
import type { PhotoWithTags } from "@/lib/types";

interface AnalyzeButtonProps {
  photo: PhotoWithTags;
  onPhotoChange: (photo: PhotoWithTags) => void;
}

/** "Analyze this photo" for a photo the AI hasn't described yet. Renders nothing once it's analyzed. */
export default function AnalyzeButton({ photo, onPhotoChange }: AnalyzeButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (photo.ai_status === "done") return null;

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; failed?: number; firstError?: string | null } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not analyze this photo");
      if (data?.failed) throw new Error(data.firstError ?? "The analysis failed");
      const photoRes = await fetch(`/api/photos/${photo.id}`);
      if (!photoRes.ok) throw new Error("Analyzed, but could not reload the photo");
      const { photo: updated } = await photoRes.json();
      onPhotoChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={analyze}
        disabled={busy}
        className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-medium text-text disabled:opacity-60"
      >
        {busy ? "Analyzing…" : "Analyze this photo"}
      </button>
      {photo.ai_status === "error" && !error && (
        <p className="text-xs text-text-muted">The last attempt failed. You can try again.</p>
      )}
      {error && <p className="text-xs text-node-events">{error}</p>}
    </div>
  );
}
