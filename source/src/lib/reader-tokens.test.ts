import { describe, it, expect } from "vitest";
import {
  buildReaderModel,
  charIndexToWordIndex,
  estimateWordTimings,
  timeToWordIndex,
  chooseEngine,
  detectLanguage,
  bionicSplit,
  reindexSlice,
} from "./reader-tokens";

describe("buildReaderModel", () => {
  it("assigns sequential indices and collapsed offsets that round-trip", () => {
    const m = buildReaderModel("Hello world.\n\nSecond para here.");
    expect(m.words.map((w) => w.text)).toEqual([
      "Hello",
      "world.",
      "Second",
      "para",
      "here.",
    ]);
    expect(m.paragraphs.length).toBe(2);
    // The collapsed string equals words joined by single spaces (matches
    // useSpeech's normalization), so each word's offsets round-trip.
    for (const w of m.words) {
      expect(m.collapsed.slice(w.charStart, w.charEnd)).toBe(w.text);
    }
  });

  it("collapses single newlines inside a paragraph and ignores blank runs", () => {
    const m = buildReaderModel("line one\nline two\n\n\n  final  ");
    expect(m.words.map((w) => w.text)).toEqual([
      "line",
      "one",
      "line",
      "two",
      "final",
    ]);
    expect(m.paragraphs.length).toBe(2);
  });
});

describe("charIndexToWordIndex — browser-TTS boundary → word", () => {
  const m = buildReaderModel("The quick brown fox");
  it("maps collapsed char offsets to the right word", () => {
    expect(charIndexToWordIndex(m.words, 0)).toBe(0); // "The"
    expect(charIndexToWordIndex(m.words, 4)).toBe(1); // "quick"
    expect(charIndexToWordIndex(m.words, 10)).toBe(2); // "brown"
    expect(charIndexToWordIndex(m.words, 16)).toBe(3); // "fox"
  });
  it("clamps below the first and past the last word", () => {
    expect(charIndexToWordIndex(m.words, -5)).toBe(0);
    expect(charIndexToWordIndex(m.words, 9999)).toBe(3);
  });
});

describe("estimateWordTimings + timeToWordIndex — HD audio → word", () => {
  const m = buildReaderModel("One two three four five");
  const t = estimateWordTimings(m.words, 10);

  it("starts at 0, strictly increases, and stays under the duration", () => {
    expect(t[0]).toBe(0);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(t[t.length - 1]).toBeLessThan(10);
  });

  it("round-trips a playback time back to the correct word", () => {
    expect(timeToWordIndex(t, 0)).toBe(0);
    expect(timeToWordIndex(t, t[3] + 0.01)).toBe(3);
    expect(timeToWordIndex(t, 9999)).toBe(4);
  });

  it("handles zero / negative duration without throwing", () => {
    expect(estimateWordTimings(m.words, 0).every((x) => x === 0)).toBe(true);
    expect(estimateWordTimings(m.words, -3).every((x) => x === 0)).toBe(true);
    expect(estimateWordTimings([], 10)).toEqual([]);
  });
});

describe("chooseEngine — automatic fallback", () => {
  it("uses HD when requested and no error has occurred", () => {
    expect(
      chooseEngine({ hdRequested: true, hdError: false, browserSupported: true })
    ).toBe("hd");
  });
  it("falls back to the browser voice once HD has errored", () => {
    expect(
      chooseEngine({ hdRequested: true, hdError: true, browserSupported: true })
    ).toBe("browser");
  });
  it("uses the browser voice when HD was not requested", () => {
    expect(
      chooseEngine({ hdRequested: false, hdError: false, browserSupported: true })
    ).toBe("browser");
  });
  it("uses HD when the browser cannot speak — even after an HD error", () => {
    expect(
      chooseEngine({ hdRequested: true, hdError: true, browserSupported: false })
    ).toBe("hd");
  });
});

describe("detectLanguage", () => {
  it("detects Danish from special letters", () => {
    expect(detectLanguage("Jeg vil gerne læse en bog på dansk")).toBe("da");
  });
  it("detects Danish from common stopwords without special letters", () => {
    expect(detectLanguage("Det er ikke fordi jeg vil")).toBe("da");
  });
  it("detects English", () => {
    expect(detectLanguage("The weather is nice today and I am reading")).toBe("en");
  });
  it("defaults to English on empty input", () => {
    expect(detectLanguage("")).toBe("en");
  });
});

describe("bionicSplit", () => {
  it("bolds roughly the leading 40% (min 1 char)", () => {
    expect(bionicSplit("reading")).toEqual({ bold: "rea", rest: "ding" });
    expect(bionicSplit("a")).toEqual({ bold: "a", rest: "" });
    expect(bionicSplit("to")).toEqual({ bold: "t", rest: "o" });
  });
});

describe("reindexSlice — mid-document browser playback", () => {
  const m = buildReaderModel("The quick brown fox jumps");
  it("re-bases offsets to 0 while preserving absolute indices", () => {
    const slice = reindexSlice(m.words, 2); // start at "brown"
    expect(slice[0].charStart).toBe(0);
    expect(slice.map((w) => w.text)).toEqual(["brown", "fox", "jumps"]);
    // Absolute indices are preserved so the highlight targets the right word.
    expect(slice.map((w) => w.index)).toEqual([2, 3, 4]);
  });

  it("maps a boundary charIndex on the slice back to the ABSOLUTE word", () => {
    const slice = reindexSlice(m.words, 2);
    // "fox" begins right after "brown " → charIndex 6 in the sliced string.
    expect(charIndexToWordIndex(slice, 6)).toBe(3);
    expect(charIndexToWordIndex(slice, 0)).toBe(2);
  });
});
