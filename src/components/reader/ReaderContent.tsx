import React, { useEffect, useRef } from "react";
import { ReaderModel, bionicSplit } from "@/lib/reader-tokens";

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
}: ReaderContentProps) {
  const activeRef = useRef<HTMLSpanElement | null>(null);

  // Keep the active word in the middle third of the viewport, smoothly.
  useEffect(() => {
    if (!following) return;
    const el = activeRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentWordIndex, following]);

  // Only fall back to class-based sizing when NO custom size is provided.
  const usingCustomSize = typeof fontSize === "number";

  return (
    <div
      className="rounded-3xl border border-border p-6 shadow-paper sm:p-9"
      style={{ backgroundColor: tintColor, color: "#1E293B" }}
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

        return (
          <p
            key={pIdx}
            className={usingCustomSize ? "leading-loose" : "text-lg leading-loose sm:text-xl"}
            style={pStyle}
          >
            {para.map((w) => {
              const active = w.index === currentWordIndex;
              return (
                <React.Fragment key={w.index}>
                  <span
                    ref={active ? activeRef : undefined}
                    data-word-index={w.index}
                    className={`rr-word${active ? " rr-word-active" : ""}`}
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
