export type ImageFitMode = "fit" | "zoom";

// Shared across every single-image view (feed and detail) so the choice
// carries over between them instead of resetting.
export const IMAGE_MODE_KEY = "loretree:image-mode";

export function loadImageMode(): ImageFitMode {
  try {
    const stored = window.localStorage.getItem(IMAGE_MODE_KEY);
    if (stored === "fit" || stored === "zoom") return stored;
  } catch {
    // Private browsing or blocked storage: fall back to the default silently.
  }
  return "fit";
}

export function saveImageMode(mode: ImageFitMode): void {
  try {
    window.localStorage.setItem(IMAGE_MODE_KEY, mode);
  } catch {
    // Ignore — the choice just won't persist across visits.
  }
}
