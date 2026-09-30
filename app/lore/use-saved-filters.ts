import { useEffect, useState } from "react";
import type { StartType, View } from "./lore-shared";

const SAVED_FILTERS_KEY = "loretree:saved-filters";

export interface SavedFilter {
  id: string;
  label: string;
  view: View;
  path: string;
  show: string;
  start: StartType;
  year: string;
  query: string;
}

function persist(filters: SavedFilter[]) {
  try {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Ignore — the change just won't persist across visits.
  }
}

/** Named Lore filters, remembered in this browser only. */
export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SAVED_FILTERS_KEY);
      if (stored) setSavedFilters(JSON.parse(stored) as SavedFilter[]);
    } catch {
      // Ignore — saved filters just start empty.
    }
  }, []);

  function saveFilter(filter: Omit<SavedFilter, "id" | "label">) {
    const label = window.prompt("Name this filter");
    if (!label || !label.trim()) return;
    const next: SavedFilter[] = [
      ...savedFilters,
      { ...filter, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: label.trim() },
    ];
    setSavedFilters(next);
    persist(next);
  }

  function deleteFilter(id: string) {
    const next = savedFilters.filter((sf) => sf.id !== id);
    setSavedFilters(next);
    persist(next);
  }

  return { savedFilters, saveFilter, deleteFilter };
}
