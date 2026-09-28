import Link from "next/link";

export default function AddPhotosPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <Link href="/lore" className="text-sm text-text-muted hover:text-text">
        &larr; Back
      </Link>
      <h1 className="mb-1 mt-4 text-lg font-semibold text-text">Add Photos</h1>
      <p className="mb-6 text-sm text-text-muted">
        Bring in photos from your library or connected storage. For now, importing runs from Terminal — see the
        LoreTree setup notes for the current import command.
      </p>
      <div className="flex flex-col gap-2">
        {["Sync library", "Google Drive", "Dropbox", "OneDrive", "iCloud Backup"].map((source) => (
          <button
            key={source}
            disabled
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm text-text-muted opacity-60"
          >
            {source} — coming soon
          </button>
        ))}
      </div>
    </div>
  );
}
