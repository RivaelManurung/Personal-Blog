import { format, parseISO } from "date-fns";

/** Format an ISO date string as e.g. "Oct 16, 2024". Returns "" for null. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "";
  }
}

/** Machine-readable date for <time dateTime>. */
export function isoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return parseISO(iso).toISOString();
  } catch {
    return "";
  }
}
