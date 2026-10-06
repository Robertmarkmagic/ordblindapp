// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { FunctionPlayground } from "./FunctionPlayground";

it("lets a visitor use inline comma guidance, rules and exercises before signup", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("reliefread-language", "da");
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const click = (element: Element | null | undefined) => { expect(element).toBeTruthy(); act(() => element!.dispatchEvent(new MouseEvent("click", { bubbles: true }))); };
  const button = (label: string) => Array.from(host.querySelectorAll("button")).find((element) => element.textContent === label);
  try {
    act(() => root.render(<LanguageProvider><FunctionPlayground /></LanguageProvider>));
    const draft = host.querySelector<HTMLTextAreaElement>("#function-draft")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(draft, "Jeg læser men du skriver.");
      draft.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelectorAll(".rr-learning-comma")).toHaveLength(1);
    click(host.querySelector(".rr-learning-comma"));
    click(button("Brug dette komma"));
    expect(draft.value).toBe("Jeg læser, men du skriver.");
    click(button("Regler og eksempler"));
    expect(host.textContent).toContain("Den lille hund");
    click(button("Øv selv"));
    click(button("Min søster"));
    expect(host.textContent).toContain("Ja, det er rigtigt");
    click(host.querySelector('[role="switch"][aria-label="Grammatikmode"]'));
    expect(host.querySelector('[aria-label="Lær af din egen tekst"]')).toBeNull();
  } finally {
    act(() => root.unmount()); host.remove(); localStorage.removeItem("reliefread-language");
  }
});
