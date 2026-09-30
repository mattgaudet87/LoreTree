/** "Jun 25, 2016" (short) or "June 25, 2016" (long). Empty string when the date is missing or invalid. */
export function formatPhotoDate(iso: string | null, monthStyle: "short" | "long" = "short"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: monthStyle, day: "numeric", year: "numeric" });
}
