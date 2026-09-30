export const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Returns the "YYYY-MM-DD" Sunday on or before the given "YYYY-MM-DD" date, treating the input as a plain calendar date (no timezone shifting). */
export function weekStartOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Formats a "YYYY-MM-DD" date as e.g. "Jul 14 2024", used to name auto-generated events. */
export function formatEventDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${MONTH_ABBR[Number(month) - 1]} ${Number(day)} ${year}`;
}
