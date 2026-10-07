// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewSessionForm } from "./NewSessionForm";
import { LanguageProvider } from "@/lib/i18n";
import { importWebPage, WebImportError, type WebPageText } from "@/lib/web-import";
import { extractTextFromFile } from "@/lib/import-text";

vi.mock("@/lib/web-import", async (actual) => ({ ...await actual<typeof import("@/lib/web-import")>(), importWebPage: vi.fn() }));
vi.mock("@/lib/import-text", async (actual) => ({ ...await actual<typeof import("@/lib/import-text")>(), extractTextFromFile: vi.fn() }));

let host: HTMLDivElement;
let root: Root;
const onSubmit = vi.fn();
const text = "Dette er min historie. Jeg læser teksten højt og følger ordene på skærmen.\n\nJeg kan også bruge noter og slå et ord op i ordbogen.";
const page = { title: "Historien", text, sourceUrl: "https://www.wattpad.com/123-kapitel" };
const field = (id: string) => host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
const button = (label: string) => Array.from(host.querySelectorAll("button")).find((item) => item.textContent === label)!;
const click = (el: HTMLElement) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const switchTab = (label: string) => act(() => button(label).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
const input = (id: string, value: string) => act(() => {
  const el = field(id);
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
const fetchPage = async () => act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
const mount = (language = "da") => {
  localStorage.setItem("reliefread-language", language);
  act(() => root.render(<LanguageProvider><NewSessionForm saving={false} onSubmit={onSubmit} /></LanguageProvider>));
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  vi.mocked(importWebPage).mockResolvedValue(page);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("new reading sources", () => {
  it("fetches a link, previews editable text and submits its original source", async () => {
    mount(); switchTab("Indsæt link");
    expect(button("Start læsning").disabled).toBe(true);
    input("web-address", "www.wattpad.com/123-kapitel");
    await fetchPage();
    expect(field("web-text").value).toBe(text);
    expect(field("title").value).toBe("Historien");
    expect(host.querySelector('a[target="_blank"]')?.getAttribute("href")).toBe(page.sourceUrl);
    input("web-text", text + " Jeg tilføjer en note.");
    click(button("Start læsning"));
    expect(onSubmit).toHaveBeenCalledWith({ title: "Historien", content: text + " Jeg tilføjer en note.", language: "da", sourceUrl: page.sourceUrl });
  });
  it("keeps pasted text separate from web text and never attaches the web URL to pasted text", async () => {
    mount(); input("content", "Jeg skriver min egen tekst.");
    switchTab("Indsæt link"); input("web-address", page.sourceUrl); await fetchPage();
    switchTab("Indsæt tekst");
    expect(field("content").value).toBe("Jeg skriver min egen tekst.");
    click(button("Start læsning"));
    expect(onSubmit.mock.calls[0][0].sourceUrl).toBeUndefined();
    switchTab("Indsæt link"); expect(field("web-text").value).toBe(text);
  });
  it("invalidates the previous preview when the address changes", async () => {
    mount(); switchTab("Indsæt link"); input("web-address", page.sourceUrl); await fetchPage();
    input("web-address", "https://example.com/other");
    expect(host.querySelector("#web-text")).toBeNull();
    expect(button("Start læsning").disabled).toBe(true);
  });
  it("ignores a stale response after the user changes the address", async () => {
    let resolve!: (value: WebPageText) => void;
    vi.mocked(importWebPage).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    mount(); switchTab("Indsæt link"); input("web-address", page.sourceUrl); await fetchPage();
    const signal = vi.mocked(importWebPage).mock.calls[0][1]!;
    input("web-address", "https://example.com/new");
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(page));
    expect(host.querySelector("#web-text")).toBeNull();
  });
  it("keeps the address and gives helpful fallback guidance for a blocked page", async () => {
    vi.mocked(importWebPage).mockRejectedValueOnce(new WebImportError("page_blocked"));
    mount(); switchTab("Indsæt link"); input("web-address", page.sourceUrl); await fetchPage();
    expect(field("web-address").value).toBe(page.sourceUrl);
    expect(host.textContent).toContain("Siden udleverer ikke teksten");
    expect(button("Start læsning").disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("preserves a manually edited title and provides the English interface", async () => {
    mount("en"); switchTab("Paste link"); input("title", "My reading"); input("web-address", page.sourceUrl); await fetchPage();
    expect(field("title").value).toBe("My reading");
    expect(button("Fetch text from link")).toBeDefined();
    click(button("Start reading"));
    expect(onSubmit.mock.calls[0][0].title).toBe("My reading");
  });
  it("still imports a file using its filename as an editable automatic title", async () => {
    vi.mocked(extractTextFromFile).mockResolvedValue({ text, kind: "txt", scanned: false });
    mount(); switchTab("Upload fil");
    const fileInput = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, "files", { value: [new File([text], "Min tekst.txt", { type: "text/plain" })] });
    await act(async () => fileInput.dispatchEvent(new Event("change", { bubbles: true })));
    expect(field("title").value).toBe("Min tekst");
    click(button("Start læsning"));
    expect(onSubmit.mock.calls[0][0]).toEqual({ title: "Min tekst", content: text, language: "da" });
  });
});
