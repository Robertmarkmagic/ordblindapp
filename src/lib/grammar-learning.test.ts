import { describe, expect, it } from "vitest";
import { analyseGrammar, analyseDanishGrammar, applyCommaSuggestion, detectGrammarLanguage, findDanishCommaSuggestions } from "./grammar-learning";

const markedWords = (text: string, language: "da" | "en" = "da") => analyseGrammar(text, language)
  .filter((token) => token.sentenceRole)
  .map((token) => [token.word, token.sentenceRole]);

describe("grammar learning", () => {
  it("detects short drafts and falls back when words are unfamiliar", () => {
    expect(detectGrammarLanguage("Mor arbejder.", "en")).toBe("da");
    expect(detectGrammarLanguage("I write.", "da")).toBe("en");
    expect(detectGrammarLanguage("Computer", "da")).toBe("da");
  });
  it("marks the first subject and predicate", () => {
    expect(markedWords("Jeg skriver en tydelig tekst")).toEqual([["Jeg", "subject"], ["skriver", "predicate"]]);
  });

  it("marks both sentences and both sides of a conjunction", () => {
    expect(markedWords("Jeg læser. Du skriver men hun kommer.")).toEqual([
      ["Jeg", "subject"], ["læser", "predicate"], ["Du", "subject"], ["skriver", "predicate"], ["hun", "subject"], ["kommer", "predicate"],
    ]);
  });

  it("marks an inverted question", () => {
    expect(markedWords("Læser du bogen?")).toEqual([["Læser", "predicate"], ["du", "subject"]]);
  });

  it("uses English grammar for English text", () => {
    expect(markedWords("I write. You read but she sleeps.", "en")).toEqual([
      ["I", "subject"], ["write", "predicate"], ["You", "subject"], ["read", "predicate"], ["she", "subject"], ["sleeps", "predicate"],
    ]);
  });

  it("does not mark the object of an English command as the subject", () => {
    expect(markedWords("Read the book.", "en")).toEqual([]);
  });

  it("does not invent verbs from noun endings", () => {
    const tokens = analyseDanishGrammar("Jeg har sommer og computer");
    expect(tokens.find((token) => token.word === "sommer")?.role).toBe("unknown");
    expect(tokens.find((token) => token.word === "computer")?.role).toBe("unknown");
  });

  it("keeps original offsets including Danish letters and apostrophes", () => {
    const text = "Børnene læser. It's easy!";
    for (const token of analyseGrammar(text, "en")) {
      expect(text.slice(token.start, token.end)).toBe(token.word);
    }
    expect(analyseGrammar(text, "en").map((token) => token.word)).toContain("It's");
  });

  it("does not confuse the Danish preposition I with a subject", () => {
    expect(markedWords("I teksten skriver jeg.")).toEqual([["skriver", "predicate"], ["jeg", "subject"]]);
  });

  it("handles empty text", () => {
    expect(analyseDanishGrammar(" \n ")).toEqual([]);
    expect(findDanishCommaSuggestions("")).toEqual([]);
  });
});

describe("Danish comma hints", () => {
  it("guides the learner to a missing comma before men", () => {
    const suggestions = findDanishCommaSuggestions("Jeg læser men du skriver");
    expect(suggestions[0]?.corrected).toBe("Jeg læser, men du skriver");
    expect(suggestions[0]?.rule).toContain("men");
    expect(suggestions[0]?.optional).toBe(false);
  });

  it.each(["Jeg læser, men du skriver", "Jeg læser,  men du skriver", "Jeg læser. Men du skriver", "Jeg læser\nmen du skriver"])("does not add a duplicate or sentence-start comma to %s", (text) => {
    expect(findDanishCommaSuggestions(text)).toEqual([]);
  });

  it.each(["En lille men god bog", "Jeg læser og skriver", "Jeg læser men en bog og du skriver", "Jeg læser men du"])("does not mistake a phrase or an incomplete clause for two main clauses: %s", (text) => {
    expect(findDanishCommaSuggestions(text)).toEqual([]);
  });

  it("can guide commas between two full clauses joined by og", () => {
    expect(findDanishCommaSuggestions("Jeg læser og du skriver")[0]?.corrected).toBe("Jeg læser, og du skriver");
  });

  it("does not present optional start commas as missing commas by default", () => {
    expect(findDanishCommaSuggestions("Jeg læser fordi du skriver")).toEqual([]);
  });

  it("offers optional start commas only when selected", () => {
    const [suggestion] = findDanishCommaSuggestions("Jeg læser fordi du skriver", { startComma: true });
    expect(suggestion.corrected).toBe("Jeg læser, fordi du skriver");
    expect(suggestion.optional).toBe(true);
    expect(suggestion.rule).toContain("Valgfrit");
  });

  it("skips ambiguous multiword conjunctions", () => {
    expect(findDanishCommaSuggestions("Jeg læser lige når du skriver", { startComma: true })).toEqual([]);
  });

  it("preserves whitespace and inserts suggestions in text order", () => {
    const text = "Jeg læser  men du skriver og hun kommer";
    const suggestions = findDanishCommaSuggestions(text);
    expect(suggestions.map((suggestion) => suggestion.index)).toEqual([9, 25]);
    expect(suggestions[0].corrected).toBe("Jeg læser,  men du skriver og hun kommer");
  });

  it("recomputes after acceptance without repeating the accepted comma", () => {
    const original = "Jeg læser men du skriver og hun kommer";
    const [first] = findDanishCommaSuggestions(original);
    const next = applyCommaSuggestion(original, first);
    expect(findDanishCommaSuggestions(next).map((item) => item.corrected)).toEqual(["Jeg læser, men du skriver, og hun kommer"]);
  });

  it("cannot replace text with a stale suggestion", () => {
    const original = "Jeg læser men du skriver";
    const [suggestion] = findDanishCommaSuggestions(original);
    expect(applyCommaSuggestion(original, suggestion)).toBe("Jeg læser, men du skriver");
    expect(applyCommaSuggestion(original + " videre", suggestion)).toBe(original + " videre");
  });
});
