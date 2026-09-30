import { useSharePhoto } from "@/components/detail/useSharePhoto";
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
  const { shareState, share } = useSharePhoto(photo);

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
