import { describe, it, expect } from "vitest";
import { buildReaderModel, sliceRange } from "@/lib/reader-tokens";

describe("sliceRange (fragment playback)", () => {
  const model = buildReaderModel("The quick brown fox jumps over the lazy dog");

  it("returns only the inclusive range, keeping absolute indices", () => {
    const slice = sliceRange(model.words, 2, 4); // brown fox jumps
    expect(slice.map((w) => w.text)).toEqual(["brown", "fox", "jumps"]);
    expect(slice.map((w) => w.index)).toEqual([2, 3, 4]);
  });

  it("re-bases char offsets to start at 0", () => {
    const slice = sliceRange(model.words, 2, 4);
    expect(slice[0].charStart).toBe(0);
    expect(slice[1].charStart).toBe("brown".length + 1);
    expect(slice[1].charEnd).toBe("brown".length + 1 + "fox".length);
  });

  it("clamps out-of-range indices to the document bounds", () => {
    expect(sliceRange(model.words, -5, 100).length).toBe(model.words.length);
  });

  it("clamps an end below start up to start (single word)", () => {
    const slice = sliceRange(model.words, 5, 2);
    expect(slice.map((w) => w.index)).toEqual([5]);
  });

  it("handles a single-word selection", () => {
    const slice = sliceRange(model.words, 3, 3);
    expect(slice.map((w) => w.text)).toEqual(["fox"]);
    expect(slice[0].charStart).toBe(0);
  });

  it("handles empty input", () => {
    expect(sliceRange([], 0, 3)).toEqual([]);
  });
});
