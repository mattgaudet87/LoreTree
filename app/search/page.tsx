export default function SearchPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-lg font-semibold text-text">Search</h1>
      <input
        type="text"
        disabled
        placeholder="Search for people on LoreTree…"
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted placeholder:text-text-muted"
      />
      <p className="mt-6 text-center text-sm text-text-muted">Coming soon.</p>
    </div>
  );
}
