import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReaderModel, bionicSplit } from "@/lib/reader-tokens";
import type { FocusScope, HighlightMode } from "@/lib/app-preferences";

interface ReaderContentProps {
  model: ReaderModel;
  /** Absolute index of the word to highlight, or -1 for none. */
  currentWordIndex: number;
  /** True while audio is playing/paused — enables auto-scroll follow. */
  following: boolean;
  bionic: boolean;
  fontFamily: string;
  tintColor: string;
  /** Click a word to jump playback there. */
  onWordClick: (wordIndex: number) => void;
  /**
   * Optional local text-style overrides (used by the public shared view so a
   * recipient can adjust size/spacing). When omitted, the reader keeps its
   * default class-based sizing — the private reader is unaffected.
   */
  fontSize?: number; // px
  lineHeight?: number; // unitless multiplier
  letterSpacing?: number; // em
  wordSpacing?: number; // em
  fontWeight?: number;
  textColor?: string;
  highlightMode?: HighlightMode;
  focusScope?: FocusScope;
  highlightColor?: string;
}

function sentenceIndices(model: ReaderModel, active: number): Set<number> {
  if (active < 0 || active >= model.words.length) return new Set();
  const endsSentence = (text: string) => /[.!?][\])}'\u2019\u201d"]*$/.test(text);
  let start = active;
  while (start > 0 && !endsSentence(model.words[start - 1].text)) start -= 1;
  let end = active;
  while (end < model.words.length - 1 && !endsSentence(model.words[end].text)) end += 1;
  return new Set(model.words.slice(start, end + 1).map((word) => word.index));
}

function paragraphIndices(model: ReaderModel, active: number): Set<number> {
  const paragraph = model.paragraphs.find((items) => items.some((word) => word.index === active));
  return new Set((paragraph || []).map((word) => word.index));
}

/**
 * Renders the document as clickable, individually-indexed word spans so the
 * synchronized highlight and click-to-seek both work off a single
 * `currentWordIndex`. Auto-scroll keeps the active word in the middle third of
 * the viewport, smoothly.
 *
 * Bionic Reading bolds each word's leading letters INSIDE the same span, so the
 * highlight always covers the whole word regardless of Bionic being on.
 */
export function ReaderContent({
  model,
  currentWordIndex,
  following,
  bionic,
  fontFamily,
  tintColor,
  onWordClick,
  fontSize,
  lineHeight,
  letterSpacing,
  wordSpacing,
  fontWeight,
  textColor = "#1E293B",
  highlightMode = "word",
  focusScope = "off",
  highlightColor = "#FEF08A",
}: ReaderContentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef(new Map<number, HTMLSpanElement>());
  const [visualLines, setVisualLines] = useState<number[][]>([]);

  const registerWord = useCallback((index: number, element: HTMLSpanElement | null) => {
    if (element) wordRefs.current.set(index, element);
    else wordRefs.current.delete(index);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const positions = Array.from(wordRefs.current.entries()).map(([index, element]) => ({
        index,
        top: Math.round(element.getBoundingClientRect().top),
      }));
      const grouped = new Map<number, number[]>();
      for (const position of positions) {
        const nearbyTop = Array.from(grouped.keys()).find((top) => Math.abs(top - position.top) <= 1);
        const top = nearbyTop ?? position.top;
        grouped.set(top, [...(grouped.get(top) || []), position.index]);
      }
      setVisualLines(Array.from(grouped.entries()).sort(([a], [b]) => a - b).map(([, indices]) => indices));
    };

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (containerRef.current) observer?.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [model, fontSize, lineHeight, letterSpacing, wordSpacing]);

  const lineIndices = useMemo(() => {
    const activeLine = visualLines.findIndex((line) => line.includes(currentWordIndex));
    if (activeLine < 0) return { one: new Set<number>(), two: new Set<number>() };
    const one = new Set(visualLines[activeLine]);
    const two = new Set(one);
    visualLines[activeLine + 1]?.forEach((index) => two.add(index));
    return { one, two };
  }, [visualLines, currentWordIndex]);

  const sentence = useMemo(() => sentenceIndices(model, currentWordIndex), [model, currentWordIndex]);
  const paragraph = useMemo(() => paragraphIndices(model, currentWordIndex), [model, currentWordIndex]);

  // Keep the active word in the middle third of the viewport, smoothly.
  useEffect(() => {
    if (!following) return;
    const el = wordRefs.current.get(currentWordIndex);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentWordIndex, following]);

  // Only fall back to class-based sizing when NO custom size is provided.
  const usingCustomSize = typeof fontSize === "number";

  return (
    <div
      ref={containerRef}
      className="rounded-3xl border border-border p-6 shadow-paper sm:p-9"
      style={{ backgroundColor: tintColor, color: textColor }}
    >
      {model.paragraphs.map((para, pIdx) => {
        const pStyle: React.CSSProperties = {
          fontFamily,
          marginTop: pIdx > 0 ? "1.4em" : 0,
        };
        if (usingCustomSize) pStyle.fontSize = `${fontSize}px`;
        if (typeof lineHeight === "number") pStyle.lineHeight = lineHeight;
        if (typeof letterSpacing === "number") pStyle.letterSpacing = `${letterSpacing}em`;
        if (typeof wordSpacing === "number") pStyle.wordSpacing = `${wordSpacing}em`;
        if (typeof fontWeight === "number") pStyle.fontWeight = fontWeight;

        return (
          <p
            key={pIdx}
            className={usingCustomSize ? "leading-loose" : "text-lg leading-loose sm:text-xl"}
            style={pStyle}
          >
            {para.map((w) => {
              const highlighted = following && (
                highlightMode === "word"
                  ? w.index === currentWordIndex
                  : highlightMode === "line"
                    ? lineIndices.one.has(w.index)
                    : sentence.has(w.index)
              );
              const inFocus =
                focusScope === "word" ? w.index === currentWordIndex
                  : focusScope === "line" ? lineIndices.one.has(w.index)
                    : focusScope === "two-lines" ? lineIndices.two.has(w.index)
                      : focusScope === "sentence" ? sentence.has(w.index)
                        : focusScope === "paragraph" ? paragraph.has(w.index)
                          : true;
              const dimmed = following && focusScope !== "off" && !inFocus;
              return (
                <React.Fragment key={w.index}>
                  <span
                    ref={(element) => registerWord(w.index, element)}
                    data-word-index={w.index}
                    className={`rr-word${highlighted ? " rr-word-active" : ""}${dimmed ? " rr-word-dimmed" : ""}`}
                    style={highlighted ? { backgroundColor: highlightColor, color: textColor } : undefined}
                    role="button"
                    tabIndex={-1}
                    aria-label={`Read from "${w.text}"`}
                    onClick={() => onWordClick(w.index)}
                  >
                    {bionic ? <BionicWord text={w.text} /> : w.text}
                  </span>{" "}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

function BionicWord({ text }: { text: string }) {
  const { bold, rest } = bionicSplit(text);
  return (
    <>
      <b style={{ fontWeight: 700 }}>{bold}</b>
      {rest}
    </>
  );
}

export default ReaderContent;
