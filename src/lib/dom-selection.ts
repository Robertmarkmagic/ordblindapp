// Thin DOM glue for the reader's selection tools (Prompt 5).
//
// The pure fragment math lives in reader-tokens.ts (sliceRange, unit-tested).
// This file only reads the live DOM selection and maps it to a word-index
// range using the `.rr-word` spans rendered by ReaderContent — each carries a
// `data-word-index`. Kept tiny and dependency-free on purpose.

/**
 * Map the current window selection to an inclusive [start, end] ABSOLUTE word
 * range within `container`, or null when there is no usable selection inside
 * it. Uses Range.intersectsNode against the rendered word spans, so it's robust
 * to partial-word selections and doesn't rely on character math.
 */
export function selectionWordRange(
  container: HTMLElement | null
): { start: number; end: number } | null {
  if (!container) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const spans = container.querySelectorAll<HTMLElement>(".rr-word");
  let min = Infinity;
  let max = -Infinity;

  for (const span of Array.from(spans)) {
    let hit = false;
    try {
      hit = range.intersectsNode(span);
    } catch {
      hit = false;
    }
    if (!hit) continue;
    const idx = Number(span.getAttribute("data-word-index"));
    if (Number.isNaN(idx)) continue;
    if (idx < min) min = idx;
    if (idx > max) max = idx;
  }

  if (min === Infinity) return null;
  return { start: min, end: max };
}
