import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizePublicWebUrl, parseWebPageText, safeWebSourceUrl, WebImportError, MAX_WEB_TEXT_LENGTH } from "../supabase/functions/_shared/web-source";
import { createWebImportHandler } from "../supabase/functions/web-import/handler";

const text = "Dette er et kapitel med tekst, som du kan få læst højt.\n\nJeg læser historien og følger ordene på skærmen, mens appen giver mig tid til at forstå det, der står i teksten.";
const payload = { code: 200, data: { title: "Mit kapitel", text, url: "https://www.wattpad.com/123-kapitel", httpStatus: 200 } };
const request = (url: unknown = payload.data.url, headers: Record<string, string> = {}) => new Request("https://reliefread.test/functions/web-import", {
  method: "POST", headers: { "Content-Type": "application/json", origin: "https://reliefread.com", authorization: "Bearer private-user-token", ...headers }, body: JSON.stringify({ url }),
});
afterEach(() => vi.useRealTimers());

describe("public web address and returned text", () => {
  it("normalizes a domain and removes only the fragment", () => {
    expect(normalizePublicWebUrl("  www.wattpad.com/123-kapitel?part=1#reading ")).toBe("https://www.wattpad.com/123-kapitel?part=1");
    expect(normalizePublicWebUrl("http://example.com/article")).toBe("http://example.com/article");
  });
  it.each(["", "javascript:alert(1)", "data:text/html,hello", "ftp://example.com/book", "http://localhost/a", "http://127.1/a", "http://0x7f000001", "http://169.254.169.254", "http://[::1]/", "https://192.168.1.1/a", "https://site.internal/a", "https://user:password@example.com/a", "https://example.com:8080/a", "https://example.com/a?access_token=private"]) ("rejects %s", (url) => {
    expect(() => normalizePublicWebUrl(url)).toThrow(WebImportError);
    expect(safeWebSourceUrl(url)).toBeNull();
  });
  it("preserves paragraphs and title without turning text into HTML", () => {
    expect(parseWebPageText(payload, payload.data.url)).toEqual({ title: "Mit kapitel", text, sourceUrl: payload.data.url });
  });
  it("rejects challenge pages, login walls, short pages and excessive text", () => {
    expect(() => parseWebPageText({ data: { text, title: "Just a moment..." } }, payload.data.url)).toThrow("page_blocked");
    expect(() => parseWebPageText({ data: { text: text + " Sign in to read the chapter" } }, payload.data.url)).toThrow("page_blocked");
    expect(() => parseWebPageText({ data: { text: "Navigation only" } }, payload.data.url)).toThrow("no_readable_text");
    expect(() => parseWebPageText({ data: { text: "word ".repeat(MAX_WEB_TEXT_LENGTH / 5 + 1) } }, payload.data.url)).toThrow("page_too_long");
    expect(() => parseWebPageText({ data: { ...payload.data, httpStatus: 403 } }, payload.data.url)).toThrow("page_blocked");
  });
});

describe("web-import server handler", () => {
  it("requires a user before calling the reader service", async () => {
    const fetchPage = vi.fn();
    const response = await createWebImportHandler({ authenticate: async () => false, fetchPage })(request());
    expect(response.status).toBe(401);
    expect(fetchPage).not.toHaveBeenCalled();
  });
  it("checks CORS and the request method", async () => {
    const fetchPage = vi.fn();
    const handler = createWebImportHandler({ authenticate: async () => true, fetchPage });
    expect((await handler(request(undefined, { origin: "https://other.example.com" }))).status).toBe(403);
    expect((await handler(new Request("https://reliefread.test", { method: "GET" }))).status).toBe(405);
    const preflight = await handler(new Request("https://reliefread.test", { method: "OPTIONS", headers: { origin: "https://reliefread.com" } }));
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("https://reliefread.com");
    expect(fetchPage).not.toHaveBeenCalled();
  });
  it("calls only the fixed public relay and never forwards session credentials", async () => {
    const fetchPage = vi.fn().mockResolvedValue(Response.json(payload));
    const response = await createWebImportHandler({ authenticate: async () => true, fetchPage })(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ title: "Mit kapitel", text, sourceUrl: payload.data.url });
    const [url, options] = fetchPage.mock.calls[0];
    expect(url).toBe(`https://r.jina.ai/${payload.data.url}`);
    expect(options.headers).toEqual({ Accept: "application/json", "X-Return-Format": "text" });
    expect(options.redirect).toBe("error");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("rejects a local address and explains Wattpad story-cover links before fetching", async () => {
    const fetchPage = vi.fn();
    const handler = createWebImportHandler({ authenticate: async () => true, fetchPage });
    expect((await handler(request("http://localhost"))).status).toBe(400);
    const result = await handler(request("https://www.wattpad.com/story/123-story"));
    expect(await result.json()).toEqual({ error: "chapter_link_required" });
    expect(fetchPage).not.toHaveBeenCalled();
  });
  it("handles rate limits and blocked pages without returning a fake reading", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 })).mockResolvedValueOnce(new Response("", { status: 403 }));
    const handler = createWebImportHandler({ authenticate: async () => true, fetchPage });
    expect(await (await handler(request())).json()).toEqual({ error: "rate_limited" });
    expect(await (await handler(request())).json()).toEqual({ error: "page_blocked" });
  });
  it("limits response bytes even when Content-Length is missing", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2_000_001)); }, cancel });
    const fetchPage = vi.fn().mockResolvedValue(new Response(body));
    const response = await createWebImportHandler({ authenticate: async () => true, fetchPage })(request());
    expect(await response.json()).toEqual({ error: "page_too_long" });
    expect(cancel).toHaveBeenCalled();
  });
  it("aborts a slow provider instead of leaving the request running", async () => {
    vi.useFakeTimers();
    const fetchPage = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    const pending = createWebImportHandler({ authenticate: async () => true, fetchPage })(request());
    await vi.advanceTimersByTimeAsync(25_001);
    expect((await pending).status).toBe(504);
    expect(await (await pending).json()).toEqual({ error: "web_timeout" });
  });
});
