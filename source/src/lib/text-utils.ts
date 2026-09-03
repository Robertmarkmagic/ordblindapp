// Small, dependency-free text helpers used across ReliefRead.

/** Count words in a block of text. */
export function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate reading time in whole minutes. 200 wpm is a comfortable average;
 * we never return less than 1 so a card never reads "0 min read".
 */
export function estimateReadingMinutes(text: string | null | undefined, wpm = 200): number {
  const words = wordCount(text);
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / wpm));
}

/** First N words of a block of text, with a soft ellipsis if truncated. */
export function firstWords(text: string | null | undefined, n = 15): string {
  if (!text) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const slice = words.slice(0, n).join(" ");
  return words.length > n ? `${slice}…` : slice;
}

/** Friendly, locale-aware short date, e.g. "Aug 5, 2026". */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Pull a first name out of a full name (or fall back gracefully). */
export function firstNameFrom(name?: string | null, fallback = "there"): string {
  if (!name) return fallback;
  const first = name.trim().split(/\s+/)[0];
  return first || fallback;
}
