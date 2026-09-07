import { describe, expect, it } from "vitest";
import { buildReplyRequest } from "@/lib/reply-assistant";

describe("buildReplyRequest", () => {
  it("protects the user's wording in fix-only mode", () => {
    const request = buildReplyRequest({
      documentTitle: "Mail",
      documentText: "Please reply.",
      userText: "Tak for mail jeg vender tilbage",
      mode: "fix-only",
      tone: "natural",
      length: "normal",
      lang: "da",
    });
    expect(request.system).toContain("Correct only spelling");
    expect(request.system).toContain("Preserve every fact");
    expect(request.system).toContain("Do not translate it");
  });

  it("forbids invented commitments in a new reply", () => {
    const request = buildReplyRequest({
      documentTitle: "Invitation",
      documentText: "Can you attend?",
      userText: "Jeg kan ikke den dag",
      mode: "compose",
      tone: "warm",
      length: "short",
      lang: "da",
    });
    expect(request.system).toContain("without inventing facts, promises, prices, dates or availability");
    expect(request.system).toContain("warm, friendly and respectful");
    expect(request.system).toContain("2 to 4 sentences");
  });

  it("limits the amount of source and user text sent", () => {
    const request = buildReplyRequest({
      documentTitle: "Long",
      documentText: "a".repeat(35000),
      userText: "b".repeat(9000),
      mode: "friendly",
      tone: "warm",
      length: "normal",
      lang: "en",
    });
    expect(request.message).not.toContain("a".repeat(30001));
    expect(request.message).not.toContain("b".repeat(8001));
  });
});
