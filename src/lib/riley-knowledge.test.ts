import { describe, expect, it } from "vitest";
import { answerReliefReadQuestion } from "./riley-knowledge";

describe("Riley ReliefRead knowledge", () => {
  it("answers app overview questions without the remote AI", () => {
    expect(answerReliefReadQuestion("Hvad kan ReliefRead hjælpe mig med?", "da")).toContain("oplæsning");
  });

  it("points users to writing help", () => {
    expect(answerReliefReadQuestion("Hvor finder jeg grammatik og komma i appen?", "da")).toContain("Skriv");
  });

  it("is honest about scanned PDF OCR", () => {
    expect(answerReliefReadQuestion("Kan appen scanne et billede med OCR?", "da")).toContain("under udvikling");
  });

  it("leaves ordinary text tasks for the remote assistant", () => {
    expect(answerReliefReadQuestion("Skriv en venlig fødselsdagshilsen", "da")).toBeNull();
  });
});
