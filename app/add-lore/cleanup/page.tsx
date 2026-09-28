import Link from "next/link";

export default function CleanupPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <Link href="/lore" className="text-sm text-text-muted hover:text-text">
        &larr; Back
      </Link>
      <h1 className="mb-1 mt-4 text-lg font-semibold text-text">Clean Library</h1>
      <p className="mb-6 text-sm text-text-muted">
        LoreTree will group duplicate and very similar photos so you can quickly keep or delete them — including from
        your linked photo library.
      </p>
      <p className="text-center text-sm text-text-muted">Coming soon.</p>
    </div>
  );
}
