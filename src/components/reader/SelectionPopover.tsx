import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sparkles, Languages, Volume2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type LookupAction = "explain" | "translate" | "read";

interface SelectionPopoverProps {
  /** The document container whose text selections should trigger the popover. */
  containerRef: React.RefObject<HTMLElement>;
  onAction: (action: LookupAction, text: string) => void;
}

const GAP = 10;

/**
 * A small, calm helper that appears when you select text in the document. It
 * auto-positions ABOVE the selection, dropping BELOW only when there isn't room
 * — so it never covers the words you're looking at. Three large icon+label
 * choices: Explain simply, Translate, Read this. Works for mouse selection and
 * touch long-press (native selection fires the same events).
 */
export function SelectionPopover({ containerRef, onAction }: SelectionPopoverProps) {
  const { t } = useLanguage();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [text, setText] = useState("");
  const popRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  const clear = useCallback(() => {
    setRect(null);
    setText("");
    setStyle(null);
  }, []);

  const readSelection = useCallback(() => {
    const sel = window.getSelection();
    const container = containerRef.current;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !container) return clear();

    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return clear();

    const t = sel.toString().trim();
    if (!t) return clear();

    const r = range.getBoundingClientRect();
    if (!r || (r.width === 0 && r.height === 0)) return clear();

    setRect(r);
    setText(t);
  }, [containerRef, clear]);

  // Show once the selection has SETTLED (mouseup / touchend). Hide the moment it
  // collapses (selectionchange). Debounced to the next tick so the browser has
  // finalized the selection.
  useEffect(() => {
    const onSettle = () => window.setTimeout(readSelection, 0);
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) clear();
    };
    document.addEventListener("mouseup", onSettle);
    document.addEventListener("touchend", onSettle);
    document.addEventListener("selectionchange", onSelChange);
    return () => {
      document.removeEventListener("mouseup", onSettle);
      document.removeEventListener("touchend", onSettle);
      document.removeEventListener("selectionchange", onSelChange);
    };
  }, [readSelection, clear]);

  // A stale fixed position after scroll/resize would look broken — hide instead.
  useEffect(() => {
    if (!rect) return;
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
    };
  }, [rect, clear]);

  // Position after render, once we can measure the popover. Prefer above; drop
  // below only when there isn't room; clamp horizontally into the viewport.
  useLayoutEffect(() => {
    if (!rect || !popRef.current) return;
    const pop = popRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.top - pop.height - GAP;
    if (top < 8) {
      const below = rect.bottom + GAP;
      top = below + pop.height <= vh - 8 ? below : Math.max(8, top);
    }
    let left = rect.left + rect.width / 2 - pop.width / 2;
    left = Math.max(8, Math.min(left, vw - pop.width - 8));

    setStyle({ position: "fixed", top, left, zIndex: 50 });
  }, [rect, text]);

  if (!rect || !text) return null;

  const fire = (action: LookupAction) => {
    onAction(action, text); // selection still live here — needed for "Read this"
    window.getSelection()?.removeAllRanges();
    clear();
  };

  return (
    <div
      ref={popRef}
      // Hidden off-screen until positioned to avoid a first-frame flash.
      style={style ?? { position: "fixed", top: -9999, left: -9999, zIndex: 50 }}
      // Keep the text selection intact when interacting with the popover.
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-stretch gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label={t("lookup.tools", "Selection tools")}
    >
      <PopButton
        icon={<Sparkles className="h-5 w-5 text-sage" aria-hidden="true" />}
        label={t("lookup.explain", "Explain simply")}
        onClick={() => fire("explain")}
      />
      <PopButton
        icon={<Languages className="h-5 w-5 text-sage" aria-hidden="true" />}
        label={t("lookup.translate", "Translate")}
        onClick={() => fire("translate")}
      />
      <PopButton
        icon={<Volume2 className="h-5 w-5 text-sage" aria-hidden="true" />}
        label={t("lookup.read", "Read this")}
        onClick={() => fire("read")}
      />
    </div>
  );
}

function PopButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default SelectionPopover;
