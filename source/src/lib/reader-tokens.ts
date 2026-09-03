// Pure, dependency-free text logic for the ReliefRead reading engine.
//
// Everything here is framework-agnostic and unit-tested (reader-tokens.test.ts)
// so the two hard parts — mapping a playback position to the right WORD, and
// choosing/falling-back between audio engines — can be verified without a
// browser or a React renderer.

export interface Word {
  /** Global 0-based index; identical in the collapsed string and in render. */
  index: number;
  text: string;
  /** Char offset of this word in the COLLAPSED (single-spaced) string. */
  charStart: number;
  /** Exclusive end offset in the collapsed string. */
  charEnd: number;
}

export interface ParaWord {
  index: number;
  text: string;
}

export interface ReaderModel {
  words: Word[];
  /** Paragraphs preserved for rendering; word `index` matches `words`. */
  paragraphs: ParaWord[][];
  /**
   * The text with all whitespace collapsed to single spaces and trimmed —
   * EXACTLY what `useSpeech` normalizes to, so a `boundary` event's `charIndex`
   * lines up with these offsets.
   */
  collapsed: string;
}

const WS = /\s+/;

/**
 * Build the reader model from raw text.
 *
 * Word indices are assigned in reading order and are shared between the
 * collapsed string (used for browser-TTS `charIndex` mapping) and the rendered
 * paragraphs (used for the highlight + click-to-seek), so a single
 * `currentWordIndex` drives both.
 */
export function buildReaderModel(text: string): ReaderModel {
  const src = (text || "").replace(/\r\n?/g, "\n");
  const paraStrings = src
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  const words: Word[] = [];
  const paragraphs: ParaWord[][] = [];
  let globalIndex = 0;
  let cursor = 0; // running position in the collapsed string

  for (const para of paraStrings) {
    const tokens = para.split(WS).filter(Boolean);
    const paraWords: ParaWord[] = [];
    for (const t of tokens) {
      const charStart = cursor;
      const charEnd = charStart + t.length;
      words.push({ index: globalIndex, text: t, charStart, charEnd });
      paraWords.push({ index: globalIndex, text: t });
      globalIndex += 1;
      cursor = charEnd + 1; // +1 for the single space separator
    }
    if (paraWords.length) paragraphs.push(paraWords);
  }

  // Equivalent to words.join(" ") — matches useSpeech's collapse-and-trim.
  const collapsed = words.map((w) => w.text).join(" ");
  return { words, paragraphs, collapsed };
}

/**
 * Map a `charIndex` (from the browser-TTS `boundary` event, an offset into the
 * collapsed string) to the WORD being spoken. Clamps below the first word and
 * past the last word so it never returns out of range.
 */
export function charIndexToWordIndex(words: Word[], charIndex: number): number {
  if (!words.length) return 0;
  if (charIndex <= words[0].charStart) return words[0].index;
  let lo = 0;
  let hi = words.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].charStart <= charIndex) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return words[ans].index;
}

/**
 * Re-base a slice of the model starting at `fromWord` so its char offsets begin
 * at 0 — matching the collapsed text that `useSpeech` receives when we speak
 * only `words.slice(fromWord)`. Each returned word KEEPS its original absolute
 * `.index`, so `charIndexToWordIndex(slice, boundaryCharIndex)` yields the
 * correct ABSOLUTE word index even when playback started mid-document.
 */
export function reindexSlice(words: Word[], fromWord: number): Word[] {
  const start = Math.max(0, Math.min(fromWord, words.length));
  const out: Word[] = [];
  let cursor = 0;
  for (let i = start; i < words.length; i++) {
    const text = words[i].text;
    const charStart = cursor;
    const charEnd = charStart + text.length;
    out.push({ index: words[i].index, text, charStart, charEnd });
    cursor = charEnd + 1;
  }
  return out;
}

/**
 * Re-base an INCLUSIVE slice [startWord, endWord] so its char offsets begin at
 * 0 — used to speak ONLY a selected fragment. Each word keeps its absolute
 * `.index`, so a browser-TTS boundary charIndex maps back to the correct
 * ABSOLUTE word and the highlight lands on the right words during fragment
 * playback. Indices are clamped, and an end below start is clamped up to start.
 */
export function sliceRange(words: Word[], startWord: number, endWord: number): Word[] {
  const n = words.length;
  if (!n) return [];
  const start = Math.max(0, Math.min(startWord, n - 1));
  const end = Math.max(start, Math.min(endWord, n - 1));
  const out: Word[] = [];
  let cursor = 0;
  for (let i = start; i <= end; i++) {
    const text = words[i].text;
    const charStart = cursor;
    const charEnd = charStart + text.length;
    out.push({ index: words[i].index, text, charStart, charEnd });
    cursor = charEnd + 1;
  }
  return out;
}

// Closing punctuation that can trail a sentence/clause: ) ] ' plus the
// unicode double-quote (\u0022), right single quote (\u2019) and right double
// quote (\u201d). Written with escapes so no literal quote appears in source.
const TRAILING_CLOSER = "[)\\]'\\u2019\\u201d\\u0022]?$";
const SENTENCE_END = new RegExp("[.!?]" + TRAILING_CLOSER);
const CLAUSE_END = new RegExp("[,;:]" + TRAILING_CLOSER);

/**
 * Relative "spoken weight" of a word — longer words take longer, and sentence /
 * clause punctuation adds a natural pause. Used to spread words across a clip's
 * duration for the HD engine (which returns no per-word timestamps).
 */
export function wordWeight(text: string): number {
  let w = text.length + 1; // characters + the trailing space
  if (SENTENCE_END.test(text)) w += 4; // end-of-sentence pause
  else if (CLAUSE_END.test(text)) w += 2; // clause pause
  return w;
}

/**
 * Estimate a start time (seconds) for each word given the clip's total
 * duration. First timing is always 0, timings strictly increase, and the last
 * timing is < duration. With a non-positive duration every timing is 0.
 */
export function estimateWordTimings(words: Word[], durationSec: number): number[] {
  const n = words.length;
  if (n === 0) return [];
  if (!(durationSec > 0)) return words.map(() => 0);

  const weights = words.map((w) => wordWeight(w.text));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const timings: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    timings.push((acc / total) * durationSec);
    acc += weights[i];
  }
  return timings;
}

/**
 * Given per-word start times, return the index of the word that should be
 * highlighted at playback time `time` (the last word whose start time has
 * passed). Clamps to the first/last word.
 */
export function timeToWordIndex(timings: number[], time: number): number {
  if (!timings.length) return 0;
  if (time <= timings[0]) return 0;
  let lo = 0;
  let hi = timings.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timings[mid] <= time) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export type Engine = "hd" | "browser";

/**
 * Decide which playback engine to use. The app must NEVER be silent because an
 * API failed, so:
 *   - if the browser can't speak at all → HD (our only option)
 *   - else HD only when it was requested AND hasn't errored this session
 *   - otherwise the free browser voice (this is the automatic fallback)
 */
export function chooseEngine(opts: {
  hdRequested: boolean;
  hdError: boolean;
  browserSupported: boolean;
}): Engine {
  if (!opts.browserSupported) return "hd";
  if (opts.hdRequested && !opts.hdError) return "hd";
  return "browser";
}

/**
 * Split a word for Bionic Reading — bold the leading ~40% (min 1 char). The
 * caller wraps `bold` in <b> and appends `rest`, so the highlight span still
 * covers the whole word regardless of Bionic being on.
 */
export function bionicSplit(word: string): { bold: string; rest: string } {
  const len = word.length;
  if (len <= 1) return { bold: word, rest: "" };
  const boldLen = Math.max(1, Math.ceil(len * 0.4));
  return { bold: word.slice(0, boldLen), rest: word.slice(boldLen) };
}

const DANISH_STOPWORDS = new Set([
  "og", "ikke", "jeg", "det", "er", "til", "har", "med", "han", "hun", "også",
  "være", "så", "kan", "vil", "skal", "fordi", "men", "eller", "hvad", "hvor",
  "en", "et", "på", "af", "for", "som", "der", "de", "vi", "du", "at", "min",
]);
const ENGLISH_STOPWORDS = new Set([
  "the", "and", "is", "are", "to", "of", "you", "that", "with", "for", "this",
  "have", "not", "but", "or", "what", "where", "because", "a", "an", "in", "on",
  "it", "we", "he", "she", "they", "my", "your", "was", "were",
]);

/**
 * Lightweight en/da language detection for narration. Danish-specific letters
 * are a strong signal; otherwise we compare common-stopword hit counts.
 */
export function detectLanguage(text: string): "en" | "da" {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return "en";
  if (/[æøå]/.test(t)) return "da";

  let da = 0;
  let en = 0;
  for (const raw of t.split(/\s+/)) {
    const w = raw.replace(/[^a-zæøå]/g, "");
    if (!w) continue;
    if (DANISH_STOPWORDS.has(w)) da += 1;
    if (ENGLISH_STOPWORDS.has(w)) en += 1;
  }
  return da > en ? "da" : "en";
}

/** BCP-47 tag for the browser voice picker. */
export function bcp47For(lang: string): string {
  return lang === "da" ? "da-DK" : "en-US";
}
