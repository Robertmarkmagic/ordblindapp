// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OptimizedImage from "../src/components/OptimizedImage";
import { LAZY_LOAD_FALLBACK_MS } from "../src/lib/lazyLoad";

let host: HTMLDivElement;
let root: Root;
const render = (src: string, priority = false) => act(() => {
  root.render(<OptimizedImage src={src} alt="Example" width={120} height={80} priority={priority} />);
});

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("OptimizedImage hook order and cleanup", () => {
  it("can render an empty source and later load an image without changing hook order", () => {
    render("");
    expect(host.textContent).toBe("No image");
    expect(host.querySelector("img")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    expect(() => render("/images/example.jpg")).not.toThrow();
    expect(host.querySelector("img")?.getAttribute("src")).toContain("example.jpg");
    expect(host.querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });

  it("can clear an image source and cancel its lazy fallback", () => {
    render("/images/example.jpg");
    expect(vi.getTimerCount()).toBe(1);

    expect(() => render("")).not.toThrow();
    expect(host.textContent).toBe("No image");
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(LAZY_LOAD_FALLBACK_MS));
    expect(host.querySelector("img")).toBeNull();
  });

  it("preloads priority images only while a source exists", () => {
    render("", true);
    expect(document.head.querySelector('link[rel="preload"][as="image"]')).toBeNull();

    render("/images/example.jpg", true);
    expect(document.head.querySelector('link[rel="preload"]')?.getAttribute("href")).toContain("example.jpg");
    expect(host.querySelector("img")?.getAttribute("loading")).toBe("eager");
    expect(vi.getTimerCount()).toBe(0);

    render("", true);
    expect(document.head.querySelector('link[rel="preload"]')).toBeNull();
  });

  it("keeps the fallback that loads a lazy image in a hidden container", () => {
    render("/images/example.jpg");
    act(() => vi.advanceTimersByTime(LAZY_LOAD_FALLBACK_MS));
    expect(host.querySelector("img")?.getAttribute("loading")).toBe("eager");
    expect(vi.getTimerCount()).toBe(0);
  });
});
