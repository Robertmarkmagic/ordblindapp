import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GrammarLearningPanel } from "./GrammarLearningPanel";

const render = (text: string, language: "da" | "en", grammar = true, comma = true) => renderToStaticMarkup(
  <GrammarLearningPanel text={text} language={language} grammar={grammar} comma={comma} onApply={() => undefined} />,
);

describe("grammar learning panel", () => {
  it("offers a Danish main-clause comma and keeps start commas optional", () => {
    const html = render("Jeg læser men du skriver. Hun kommer fordi vi skriver.", "da");
    expect(html.match(/Brug dette komma/g)).toHaveLength(1);
    expect(html).toContain("Med startkomma");
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("× Grundled");
  });

  it("uses English labels and English analysis", () => {
    const html = render("I write but you read.", "en");
    expect(html).toContain("Pronoun");
    expect(html).toContain("× Subject");
    expect(html).not.toContain("Stedord");
    expect(html).not.toContain("Grundled");
    expect(html).not.toContain("Use this comma");
    expect(html).toContain("For English, enable Commas");
  });

  it("keeps text language independent of interface language", () => {
    const html = render("I write but you read.", "da");
    expect(html).toContain("engelsk");
    expect(html).toContain("× Grundled");
    expect(html).not.toContain("Brug dette komma");
    expect(html).toContain("Til engelsk");
  });

  it("lets longer drafts show more words instead of silently truncating", () => {
    const html = render("Jeg skriver. ".repeat(20), "da");
    expect(html).toContain("Vis flere ord");
    expect(html).toContain("24/40");
  });

  it("respects the separate grammar and comma controls", () => {
    expect(render("Jeg læser men du skriver", "da", false, true)).not.toContain("Stedord");
    expect(render("Jeg læser men du skriver", "da", true, false)).not.toContain("Brug dette komma");
  });
});
