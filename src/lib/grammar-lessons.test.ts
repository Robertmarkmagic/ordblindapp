import { describe, expect, it } from "vitest";
import { buildGrammarCoachPrompt, getGrammarLessons } from "./grammar-lessons";

describe("grammar teaching content", () => {
  it.each(["da", "en"] as const)("has valid exercises, unique topics and both rule types in %s", (language) => {
    const lessons = getGrammarLessons(language);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(lessons.length);
    expect(lessons.some((lesson) => lesson.category === "grammar")).toBe(true);
    expect(lessons.some((lesson) => lesson.category === "comma")).toBe(true);
    for (const lesson of lessons) {
      expect(lesson.exercise.choices[lesson.exercise.answer]).toBeTruthy();
      expect(lesson.exercise.choices.length).toBeGreaterThan(1);
      expect(lesson.steps.length).toBeGreaterThan(1);
    }
  });
  it("asks Riley to coach rather than rewrite the learner's task", () => {
    const prompt = buildGrammarCoachPrompt("Min opgave", "da", "Grundled");
    expect(prompt).toContain("lad mig prøve selv");
    expect(prompt).toContain("Ret ikke teksten automatisk");
    expect(prompt).toContain("Fokus: Grundled");
    expect(prompt).toContain("Min opgave");
  });
});
