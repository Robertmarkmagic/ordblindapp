import { describe, expect, it } from "vitest";
import { analyseDanishGrammar, findDanishCommaSuggestions } from "./grammar-learning";

describe("grammar learning", () => {
  it("marks the first subject and predicate", () => {
    const tokens = analyseDanishGrammar("Jeg skriver en tydelig tekst");
    expect(tokens.find((token) => token.sentenceRole === "subject")?.word).toBe("Jeg");
    expect(tokens.find((token) => token.sentenceRole === "predicate")?.word).toBe("skriver");
  });

  it("guides the learner to a missing comma before men", () => {
    const suggestions = findDanishCommaSuggestions("Jeg læser men du skriver");
    expect(suggestions[0]?.corrected).toBe("Jeg læser, men du skriver");
    expect(suggestions[0]?.rule).toContain("men");
  });

  it("does not repeat a comma that is already present", () => {
    expect(findDanishCommaSuggestions("Jeg læser, men du skriver")).toHaveLength(0);
  });
});
