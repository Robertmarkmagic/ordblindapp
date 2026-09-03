import { describe, expect, it } from "vitest";
import {
  getWritingSuggestions,
  insertWritingSuggestion,
  replaceFirstExact,
} from "@/lib/writing-tools";

describe("writing tools", () => {
  it("suggests Danish completions from the current prefix", () => {
    const text = "Jeg skal til tand";
    const result = getWritingSuggestions(text, text.length, "da");
    expect(result.prefix).toBe("tand");
    expect(result.words).toContain("tandlæge");
    expect(result.nextWords).toContain("tandlægen");
  });

  it("replaces only the prefix when a word is chosen", () => {
    const text = "Jeg skal til tand";
    expect(insertWritingSuggestion(text, text.length, "tandlæge", true)).toEqual({
      text: "Jeg skal til tandlæge ",
      caret: 22,
    });
  });

  it("adds a space before a next-word suggestion", () => {
    expect(insertWritingSuggestion("Jeg kan", 7, "godt", false).text).toBe("Jeg kan godt ");
  });

  it("changes only the first exact issue occurrence", () => {
    expect(replaceFirstExact("hej hej", "hej", "Hej")).toBe("Hej hej");
  });
});

