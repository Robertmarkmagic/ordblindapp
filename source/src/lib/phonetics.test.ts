import { describe, it, expect } from "vitest";
import {
  splitSentences,
  currentSentenceIndex,
  locateOccurrences,
  buildFlagged,
  segmentForRender,
  rangeAtCaret,
  applyCorrection,
  normalizeWord,
  type Correction,
} from "./phonetics";

describe("splitSentences", () => {
  it("keeps exact offsets so a sentence maps back onto the source", () => {
    const text = "Hej. Hvordan går det?";
    const s = splitSentences(text);
    expect(s.map((x) => x.text)).toEqual(["Hej.", "Hvordan går det?"]);
    expect(text.slice(s[0].start, s[0].end)).toBe("Hej.");
    expect(text.slice(s[1].start, s[1].end)).toBe("Hvordan går det?");
  });

  it("splits on line breaks too", () => {
    const s = splitSentences("first line\nsecond line");
    expect(s).toHaveLength(2);
    expect(s[1].text).toBe("second line");
  });

  it("returns the whole thing when there is no terminator", () => {
    const s = splitSentences("jeg skal lave en åvessættelse af teksten");
    expect(s).toHaveLength(1);
    expect(s[0].start).toBe(0);
  });
});

describe("currentSentenceIndex", () => {
  it("finds the sentence containing the caret", () => {
    const s = splitSentences("One. Two. Three.");
    expect(currentSentenceIndex(s, 0)).toBe(0);
    expect(currentSentenceIndex(s, 6)).toBe(1);
    expect(currentSentenceIndex(s, 12)).toBe(2);
  });
});

describe("locateOccurrences (Danish aware)", () => {
  it("finds a phonetic Danish word by whole-word match", () => {
    const sentence = "jeg skal lave en åvessættelse af teksten";
    const occ = locateOccurrences(sentence, "åvessættelse");
    expect(occ).toHaveLength(1);
    expect(sentence.slice(occ[0].start, occ[0].end)).toBe("åvessættelse");
  });

  it("does not match inside a larger word", () => {
    expect(locateOccurrences("enoughness", "enuff")).toHaveLength(0);
    expect(locateOccurrences("the enuff test", "enuff")).toHaveLength(1);
  });
});

describe("buildFlagged", () => {
  const dict = new Set<string>();
  const cache = new Map<string, Correction[]>();
  const text = "jeg skal lave en åvessættelse af teksten";
  cache.set(text.trim(), [{ original: "åvessættelse", suggestion: "oversættelse", confidence: 0.95 }]);

  it("resolves cached corrections to absolute ranges", () => {
    const flagged = buildFlagged(text, cache, dict);
    expect(flagged).toHaveLength(1);
    expect(text.slice(flagged[0].start, flagged[0].end)).toBe("åvessættelse");
    expect(flagged[0].suggestion).toBe("oversættelse");
  });

  it("drops words kept in the personal dictionary (never flagged again)", () => {
    const kept = new Set<string>([normalizeWord("åvessættelse")]);
    expect(buildFlagged(text, cache, kept)).toHaveLength(0);
  });

  it("drops low-confidence corrections", () => {
    const shy = new Map<string, Correction[]>();
    shy.set(text.trim(), [{ original: "åvessættelse", suggestion: "oversættelse", confidence: 0.2 }]);
    expect(buildFlagged(text, shy, dict)).toHaveLength(0);
  });
});

describe("segmentForRender", () => {
  it("splits text into normal and flagged segments in order", () => {
    const flagged = [{ start: 4, end: 9, original: "enuff", suggestion: "enough", confidence: 1 }];
    const segs = segmentForRender("the enuff test", flagged);
    expect(segs.map((s) => s.flagged)).toEqual([false, true, false]);
    expect(segs[1].text).toBe("enuff");
  });
});

describe("rangeAtCaret", () => {
  it("returns the range the caret is inside", () => {
    const flagged = [{ start: 4, end: 9, original: "enuff", suggestion: "enough", confidence: 1 }];
    expect(rangeAtCaret(flagged, 6)?.suggestion).toBe("enough");
    expect(rangeAtCaret(flagged, 1)).toBeNull();
  });
});

describe("applyCorrection", () => {
  it("replaces the word and preserves leading capitalization", () => {
    const text = "Enuff already";
    const res = applyCorrection(text, { start: 0, end: 5 }, "enough");
    expect(res.text).toBe("Enough already");
    expect(res.caret).toBe(6);
  });

  it("keeps lowercase words lowercase", () => {
    const res = applyCorrection("the enuff test", { start: 4, end: 9 }, "enough");
    expect(res.text).toBe("the enough test");
  });
});
