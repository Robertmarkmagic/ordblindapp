// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GrammarLearningPanel } from "./GrammarLearningPanel";

let host: HTMLDivElement;
let root: Root;
const applied = vi.fn();
function Harness({ initial, language = "da", grammar = true, comma = true, onAskRiley }: { initial: string; language?: "da" | "en"; grammar?: boolean; comma?: boolean; onAskRiley?: (topic: string) => void }) {
  const [text, setText] = useState(initial);
  return <><output aria-label="Original text">{text}</output><GrammarLearningPanel text={text} language={language} grammar={grammar} comma={comma} onApply={(next) => { applied(next); setText(next); }} onAskRiley={onAskRiley} /></>;
}
const click = (element: Element | null) => { expect(element).not.toBeNull(); act(() => { element!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); };
const button = (label: string) => Array.from(host.querySelectorAll("button")).find((item) => item.textContent === label) || null;
const mount = (props: React.ComponentProps<typeof Harness>) => act(() => root.render(<Harness {...props} />));
const change = (element: HTMLSelectElement, value: string) => act(() => { element.value = value; element.dispatchEvent(new Event("change", { bubbles: true })); });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  applied.mockClear();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("grammar learning panel", () => {
  it("marks the exact comma position and explains before applying", () => {
    mount({ initial: "Jeg læser men du skriver.\nHun kommer fordi vi skriver." });
    expect(host.querySelectorAll(".rr-learning-comma")).toHaveLength(1);
    expect(applied).not.toHaveBeenCalled();
    expect(button("Brug dette komma")).toBeNull();
    click(host.querySelector(".rr-learning-comma"));
    expect(host.textContent).toContain("to helsætninger");
    click(button("Brug dette komma"));
    expect(applied).toHaveBeenCalledWith("Jeg læser, men du skriver.\nHun kommer fordi vi skriver.");
    expect(host.querySelectorAll(".rr-learning-comma")).toHaveLength(0);
  });

  it("offers optional start commas only when selected", () => {
    mount({ initial: "Jeg læser fordi du skriver." });
    expect(host.querySelector(".rr-learning-comma")).toBeNull();
    click(host.querySelector('[role="switch"]'));
    click(host.querySelector(".rr-learning-comma"));
    expect(host.textContent).toContain("Valgfrit startkomma");
    expect(applied).not.toHaveBeenCalled();
  });

  it("provides English comma help with English labels", () => {
    mount({ initial: "I write but you read.", language: "en" });
    expect(host.querySelector('[aria-label="I. Pronoun. Subject"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Grundled");
    click(host.querySelector(".rr-learning-comma"));
    click(button("Use this comma"));
    expect(applied).toHaveBeenCalledWith("I write, but you read.");
  });

  it("keeps text-language and interface-language independent", () => {
    mount({ initial: "I write but you read." });
    expect(host.textContent).toContain("engelsk");
    click(host.querySelector(".rr-learning-comma"));
    expect(host.textContent).toContain("to helsætninger");
    expect(host.textContent).not.toContain("Use a comma");
  });

  it("shows the whole draft and preserves whitespace and punctuation", () => {
    const text = '  “Jeg skriver.”\n\n' + "Jeg skriver. ".repeat(20);
    mount({ initial: text });
    const clone = host.querySelector(".rr-learning-text")!.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".rr-learning-symbol,.rr-learning-comma").forEach((item) => item.remove());
    expect(clone.textContent).toBe(text);
    expect(host.querySelectorAll(".rr-learning-word")).toHaveLength(42);
  });

  it("explains a selected word without changing the draft", () => {
    mount({ initial: "Jeg skriver." });
    click(host.querySelector('[aria-label="Jeg. Stedord. Grundled"]'));
    expect(host.textContent).toContain("Hvem eller hvad gør noget?");
    expect(applied).not.toHaveBeenCalled();
  });

  it("lets the learner try, get a hint and try again before revealing feedback", () => {
    mount({ initial: "Jeg skriver." });
    click(button("Øv selv"));
    expect(host.textContent).not.toContain("Begge ord hører med");
    click(button("læser"));
    expect(host.textContent).toContain("Prøv en gang til");
    expect(host.textContent).not.toContain("Begge ord hører med");
    click(button("Min søster"));
    expect(host.textContent).toContain("Ja, det er rigtigt");
    expect(host.textContent).toContain("Begge ord hører med");
    click(button("Prøv igen"));
    expect(host.textContent).not.toContain("Ja, det er rigtigt");
  });

  it("resets exercise feedback when changing rule", () => {
    mount({ initial: "Jeg skriver." }); click(button("Øv selv")); click(button("Min søster"));
    change(host.querySelector("article")!.parentElement!.querySelector("select")!, "predicate");
    expect(host.textContent).not.toContain("Ja, det er rigtigt");
    expect(host.textContent).toContain("har skrevet");
  });

  it("respects independent grammar and comma controls", () => {
    mount({ initial: "Jeg læser men du skriver", grammar: false });
    expect(host.querySelector(".rr-learning-word")).toBeNull();
    expect(host.querySelector(".rr-learning-comma")).not.toBeNull();
  });

  it("offers rules even before the learner has typed", () => {
    mount({ initial: "" }); click(button("Regler og eksempler"));
    expect(host.textContent).toContain("Den lille hund");
    expect(host.textContent).toContain("Flere kommaregler");
  });

  it("can open step-by-step help for the learner's own task", () => {
    const ask = vi.fn(); mount({ initial: "Jeg skriver.", onAskRiley: ask });
    click(button("Arbejd med min opgave sammen med Riley"));
    expect(ask).toHaveBeenCalledWith("Min grammatikopgave, ét trin ad gangen");
  });
});
