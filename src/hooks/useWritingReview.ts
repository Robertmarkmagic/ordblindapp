import { useCallback, useMemo } from "react";
import { useAiObject, type JSONSchema } from "@/hooks/useAiObject";

export type WritingIssueType = "spelling" | "grammar" | "comma" | "punctuation";

export interface WritingIssue {
  type: WritingIssueType;
  original: string;
  suggestion: string;
  explanation: string;
}

export interface WritingReview {
  correctedText: string;
  issues: WritingIssue[];
  counts: Record<WritingIssueType, number>;
}

export type WritingChecks = Record<WritingIssueType, boolean>;

const REVIEW_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    correctedText: { type: "string", description: "The full corrected text with the writer's voice preserved" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["spelling", "grammar", "comma", "punctuation"] },
          original: { type: "string", description: "Exact text fragment from the original" },
          suggestion: { type: "string", description: "Replacement text fragment" },
          explanation: { type: "string", description: "A short plain-language explanation" },
        },
        required: ["type", "original", "suggestion", "explanation"],
      },
    },
    counts: {
      type: "object",
      properties: {
        spelling: { type: "integer", minimum: 0 },
        grammar: { type: "integer", minimum: 0 },
        comma: { type: "integer", minimum: 0 },
        punctuation: { type: "integer", minimum: 0 },
      },
      required: ["spelling", "grammar", "comma", "punctuation"],
    },
  },
  required: ["correctedText", "issues", "counts"],
};

export function useWritingReview(language: "da" | "en") {
  const options = useMemo(
    () => ({
      model: "gemini-3-flash-preview",
      temperature: 0.1,
      maxTokens: 4096,
      system:
        language === "da"
          ? "Du er ReliefReads rolige skrivehjælper for ordblinde og alle andre aldersgrupper. Ret kun de kategorier, brugeren vælger. Bevar ordvalg, tone, længde og personlighed. Forstå fonetisk og ordblind stavning. Gør aldrig teksten mere formel eller AI-agtig. Forklar hvert forslag med højst 14 enkle ord."
          : "You are ReliefRead's calm writing helper for dyslexic writers and all age groups. Fix only the categories the user selects. Preserve wording, tone, length and personality. Understand phonetic and dyslexic spelling. Never make the text more formal or AI-like. Explain each suggestion in no more than 14 simple words.",
    }),
    [language]
  );

  const { generate, ...aiState } = useAiObject<WritingReview>(REVIEW_SCHEMA, options);

  const review = useCallback(
    (text: string, checks: WritingChecks) => {
      const enabled = (Object.entries(checks) as Array<[WritingIssueType, boolean]>)
        .filter(([, active]) => active)
        .map(([type]) => type);
      return generate(
        `${language === "da" ? "Sprog: dansk" : "Language: English"}\n` +
          `Allowed correction categories: ${enabled.join(", ") || "none"}.\n` +
          "Do not change anything outside those categories. Keep line breaks. Return the original unchanged if no correction is needed. Every issue.original must be an exact fragment from the submitted text.\n\n" +
          text
      );
    },
    [generate, language]
  );

  return { ...aiState, generate, review };
}
