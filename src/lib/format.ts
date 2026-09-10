export function formatGHS(amount: number): string {
  return `GHS ${Math.round(amount).toLocaleString("en-US")}`;
}

/** "yyyy-mm-dd" -> Date at local midnight, avoiding TZ off-by-one issues */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Mon 14 Sep 2026" */
export function formatDateLong(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14 Sep 2026" */
export function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#2d7a63", "#8a5a3b", "#6b6456", "#3b6b8a", "#7a4d8a",
  "#8a6b2d", "#4d6b3b", "#8a3b5a", "#3b5a8a", "#6b8a3b",
];

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
