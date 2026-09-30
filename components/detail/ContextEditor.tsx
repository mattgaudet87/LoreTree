import MicButton from "@/components/MicButton";
import type { ContextNotesState } from "./useContextNotes";

/** The "Add context" form (typed or dictated) and the "Context added — Undo" bar. */
export default function ContextEditor({ context }: { context: ContextNotesState }) {
  return (
    <>
      {context.open && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
          <div className="flex gap-2">
            <textarea
              value={context.text}
              onChange={(e) => context.setText(e.target.value)}
              placeholder="What does this photo mean to you?"
              rows={3}
              className="flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted"
            />
            <MicButton onResult={(spoken) => context.setText((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
          </div>
          {context.error && <p className="text-xs text-node-events">{context.error}</p>}
          <div className="flex gap-2">
            <button
              onClick={context.cancel}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted"
            >
              Cancel
            </button>
            <button
              onClick={context.save}
              disabled={context.busy || !context.text.trim()}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
            >
              {context.busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {!context.open && context.error && <p className="text-xs text-node-events">{context.error}</p>}

      {context.showUndo && (
        <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text">
          <span>Context added</span>
          <button onClick={context.undo} className="font-medium text-accent underline">
            Undo
          </button>
        </div>
      )}
    </>
  );
}
