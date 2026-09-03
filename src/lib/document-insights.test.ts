import { describe, expect, it } from "vitest";
import { insightsAsText, normalizeDocumentInsights } from "@/lib/document-insights";

describe("normalizeDocumentInsights", () => {
  it("cleans and limits model output", () => {
    const result = normalizeDocumentInsights({
      mainPoint: "  Send the form. ",
      importantPoints: [" One ", "", "Two", "Three", "Four", "Five", "Six"],
      actions: [{ task: " Submit ", deadline: "14 September", owner: "You" }, { task: "" }],
      dates: [{ date: "14 September", meaning: "Deadline" }, { date: "", meaning: "Missing" }],
      needsReply: true,
      replyReason: " A confirmation is requested. ",
    });
    expect(result.mainPoint).toBe("Send the form.");
    expect(result.importantPoints).toHaveLength(5);
    expect(result.actions).toEqual([{ task: "Submit", deadline: "14 September", owner: "You" }]);
    expect(result.dates).toEqual([{ date: "14 September", meaning: "Deadline" }]);
    expect(result.needsReply).toBe(true);
  });

  it("returns a safe empty structure for invalid output", () => {
    expect(normalizeDocumentInsights(null)).toEqual({
      mainPoint: "",
      importantPoints: [],
      actions: [],
      dates: [],
      needsReply: false,
      replyReason: "",
    });
  });
});
describe("insightsAsText", () => {
  it("creates a Danish text suitable for read aloud", () => {
    const text = insightsAsText({
      mainPoint: "Du skal sende blanketten.",
      importantPoints: ["Brug den vedlagte formular"],
      actions: [{ task: "Send blanketten", deadline: "14. september", owner: "Dig" }],
      dates: [{ date: "14. september", meaning: "Sidste frist" }],
      needsReply: false,
      replyReason: "",
    }, "da");
    expect(text).toContain("Det vigtigste");
    expect(text).toContain("Det skal du gøre");
    expect(text).toContain("14. september");
  });
});
