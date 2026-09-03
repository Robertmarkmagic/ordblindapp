// Pure, dependency-free logic for the ReliefRead phonetic writing coach.
//
// Everything here is framework-agnostic and unit-tested (phonetics.test.ts) so
// the tricky parts — segmenting a note into sentences with exact offsets,
// locating a (possibly Danish) misspelled word inside a sentence, filtering by
// the user's personal dictionary, and applying a correction without disturbing
// the rest of the note — can be verified without a browser or a React renderer.

/** One correction as returned by the AI (or stored in the sentence cache). */
export interface Correction {
  original: string;
  suggestion: string;
  confidence: number;
}

/** A resolved, absolute-offset flag ready to underline in the note. */
export interface FlaggedRange {
  start: number;
  end: number;
  original: string;
  suggestion: string;
  confidence: number;
}

/** A sentence slice with its absolute offsets in the source note. */
export interface Sentence {
  text: string;
  start: number;
  end: number;
}

/** Only surface corrections we're reasonably confident about (gentle, low noise). */
export const MIN_CONFIDENCE = 0.55;

/** True when `ch` is a Unicode letter (covers æøå, accents, etc.). */
function isLetter(ch: string | undefined): boolean {
  return !!ch && /\p{L}/u.test(ch);
}

/**
 * Split a note into sentences, keeping exact character offsets. Splits on
 * sentence terminators (. ! ?) — consuming a trailing closing quote/bracket —
 * and on line breaks, so a per-sentence check maps cleanly back onto the note.
 */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const n = text.length;
  let start = 0;

  const push = (end: number) => {
    const seg = text.slice(start, end);
    if (seg.trim()) out.push({ text: seg, start, end });
  };
  const skipWs = (from: number) => {
    let k = from;
    while (k < n && /\s/.test(text[k])) k++;
    return k;
  };

  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (c === "." || c === "!" || c === "?") {
      let j = i + 1;
      while (j < n && (text[j] === "." || text[j] === "!" || text[j] === "?")) j++;
      if (j < n && /[)\]'\u2019\u201d\u0022]/.test(text[j])) j++;
      push(j);
      const k = skipWs(j);
      start = k;
      i = k - 1;
    } else if (c === "\n") {
      push(i);
      const k = skipWs(i + 1);
      start = k;
      i = k - 1;
    }
  }
  if (start < n) push(n);
  return out;
}

/** Index of the sentence containing (or immediately before) the caret. */
export function currentSentenceIndex(sentences: Sentence[], caret: number): number {
  if (!sentences.length) return -1;
  for (let i = 0; i < sentences.length; i++) {
    if (caret >= sentences[i].start && caret <= sentences[i].end) return i;
  }
  // caret sits in whitespace between sentences — pick the last one before it
  let ans = 0;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].start <= caret) ans = i;
  }
  return ans;
}

/** The exact cache key for a sentence (per spec: cache by exact sentence). */
export function sentenceKey(sentence: string): string {
  return sentence.trim();
}

/** Lowercase and strip surrounding non-letters (for dictionary comparison). */
export function normalizeWord(word: string): string {
  return (word || "").toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

/**
 * Find every whole-word, case-insensitive occurrence of `word` in `haystack`,
 * returned as absolute ranges offset by `base`. Whole-word means the match is
 * not flanked by other letters (works with Danish letters, no lookbehind).
 */
export function locateOccurrences(
  haystack: string,
  word: string,
  base = 0
): Array<{ start: number; end: number }> {
  const res: Array<{ start: number; end: number }> = [];
  if (!word) return res;
  const hay = haystack.toLowerCase();
  const w = word.toLowerCase();
  let i = 0;
  while (i <= hay.length) {
    const idx = hay.indexOf(w, i);
    if (idx < 0) break;
    const before = haystack[idx - 1];
    const after = haystack[idx + w.length];
    if (!isLetter(before) && !isLetter(after)) {
      res.push({ start: base + idx, end: base + idx + word.length });
    }
    i = idx + Math.max(1, w.length);
  }
  return res;
}

/**
 * Resolve the cached corrections for every sentence still present in `text`
 * into absolute, non-overlapping flagged ranges, dropping low-confidence hits
 * and any word the user has kept in their personal dictionary.
 */
export function buildFlagged(
  text: string,
  cache: Map<string, Correction[]>,
  dictionary: Set<string>
): FlaggedRange[] {
  const ranges: FlaggedRange[] = [];
  for (const s of splitSentences(text)) {
    const corr = cache.get(sentenceKey(s.text));
    if (!corr) continue;
    for (const c of corr) {
      if (!c || !c.original || !c.suggestion) continue;
      if ((Number(c.confidence) || 0) < MIN_CONFIDENCE) continue;
      if (normalizeWord(c.original) === normalizeWord(c.suggestion)) continue;
      if (dictionary.has(normalizeWord(c.original))) continue;
      const slice = text.slice(s.start, s.end);
      for (const occ of locateOccurrences(slice, c.original, s.start)) {
        ranges.push({
          start: occ.start,
          end: occ.end,
          original: c.original,
          suggestion: c.suggestion,
          confidence: Number(c.confidence) || 1,
        });
      }
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const clean: FlaggedRange[] = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      clean.push(r);
      lastEnd = r.end;
    }
  }
  return clean;
}

export interface RenderSegment {
  text: string;
  flagged: boolean;
  range?: FlaggedRange;
}

/** Split `text` into alternating normal / flagged segments for the backdrop. */
export function segmentForRender(text: string, ranges: FlaggedRange[]): RenderSegment[] {
  const segs: RenderSegment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) segs.push({ text: text.slice(cursor, r.start), flagged: false });
    segs.push({ text: text.slice(r.start, r.end), flagged: true, range: r });
    cursor = r.end;
  }
  if (cursor < text.length) segs.push({ text: text.slice(cursor), flagged: false });
  if (segs.length === 0) segs.push({ text, flagged: false });
  return segs;
}

/** The flagged range the caret currently sits inside, or null. */
export function rangeAtCaret(ranges: FlaggedRange[], caret: number): FlaggedRange | null {
  for (const r of ranges) {
    if (caret >= r.start && caret <= r.end) return r;
  }
  return null;
}

/**
 * Replace a flagged range with its suggestion, preserving the leading
 * capitalization of the original word. Returns the new text and where the
 * caret should land (just after the replacement).
 */
export function applyCorrection(
  text: string,
  range: { start: number; end: number },
  suggestion: string
): { text: string; caret: number } {
  const orig = text.slice(range.start, range.end);
  let repl = suggestion;
  const first = orig.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    repl = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  const next = text.slice(0, range.start) + repl + text.slice(range.end);
  return { text: next, caret: range.start + repl.length };
}
