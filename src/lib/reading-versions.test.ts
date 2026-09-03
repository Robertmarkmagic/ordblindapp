import { describe, expect, it } from "vitest";
import { splitReadingText } from "@/lib/reading-versions";

describe("splitReadingText", () => {
  it("keeps short paragraphs together", () => {
    expect(splitReadingText("First.\n\nSecond.", 100)).toEqual(["First.\n\nSecond."]);
  });

  it("splits at paragraph boundaries before the limit", () => {
    expect(splitReadingText("Alpha alpha.\n\nBeta beta.", 14)).toEqual(["Alpha alpha.", "Beta beta."]);
  });

  it("splits a long paragraph at sentence boundaries", () => {
    expect(splitReadingText("One sentence. Two sentence. Three.", 20)).toEqual([
      "One sentence.",
      "Two sentence. Three.",
    ]);
  });

  it("never leaves a single long sentence above the limit", () => {
    const chunks = splitReadingText("one two three four five six", 10);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join(" ")).toBe("one two three four five six");
  });
});
