export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="mb-2 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full border border-border bg-surface-2 text-text-muted transition-colors hover:text-text"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

export function ShowToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; dot: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-accent text-bg" : "text-text-muted hover:text-text"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
