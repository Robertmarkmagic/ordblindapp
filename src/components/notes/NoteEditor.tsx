import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Mic, MicOff, Sparkles, Volume2, AlertCircle } from "lucide-react";

import { toast } from "@/components/ui/sonner";
import { bcp47For } from "@/lib/reader-tokens";
import {
  segmentForRender,
  rangeAtCaret,
  applyCorrection,
  normalizeWord,
  type FlaggedRange,
} from "@/lib/phonetics";
import { usePhoneticCheck } from "@/hooks/usePhoneticCheck";
import { useDictation } from "@/hooks/useDictation";
import { SuggestionCard } from "@/components/notes/SuggestionCard";
import { useLanguage } from "@/lib/i18n";

interface NoteEditorProps {
  value: string;
  onChange: (next: string) => void;
  lang: "en" | "da";
  /** Personal dictionary — words the user chose to keep (already normalized). */
  dictionary: Set<string>;
  /** Called when the user keeps a word; should persist + update the set. */
  onKeepWord: (word: string) => void;
  /** Premium-only: the phonetic writing coach (suggestions + Polish). Free readers still write freely. */
  coachEnabled?: boolean;
  /** Hide the built-in mic/check row when a parent workspace supplies its own toolbar. */
  showToolbar?: boolean;
  placeholder?: string;
}

/**
 * NoteEditor — a crisp, fully-readable textarea with a pixel-aligned backdrop
 * that draws a soft sage DOTTED underline under phonetically-flagged words
 * (never red, never wavy). Tapping a flagged chip — or placing the caret in a
 * flagged word — opens a gentle suggestion card. Includes hands-free dictation
 * and a "Polish my note" batch review.
 */
export function NoteEditor({
  value,
  onChange,
  lang,
  dictionary,
  onKeepWord,
  coachEnabled = true,
  showToolbar = true,
  placeholder,
}: NoteEditorProps) {
  const { language } = useLanguage();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState<FlaggedRange | null>(null);
  const [batch, setBatch] = useState<FlaggedRange[] | null>(null);
  const [polishing, setPolishing] = useState(false);

  const langTag = bcp47For(lang);

  const { suggestions, checking, checkAll } = usePhoneticCheck({
    text: value,
    caret,
    lang,
    dictionary,
    enabled: coachEnabled,
  });

  // Dictation inserts finalized phrases at the caret; interim shows live.
  const insertAtCaret = useCallback(
    (chunk: string) => {
      const el = taRef.current;
      const at = el ? el.selectionStart : value.length;
      const needsSpace = at > 0 && !/\s$/.test(value.slice(0, at)) ? " " : "";
      const insert = needsSpace + chunk + " ";
      const next = value.slice(0, at) + insert + value.slice(at);
      onChange(next);
      const newCaret = at + insert.length;
      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          el.setSelectionRange(newCaret, newCaret);
          setCaret(newCaret);
        }
      });
    },
    [value, onChange]
  );

  const { supported: dictationSupported, listening, interim, error: dictationError, permission, requesting, start, stop, retry } =
    useDictation({ lang: langTag, onFinal: insertAtCaret });

  const segments = useMemo(() => segmentForRender(value, suggestions), [value, suggestions]);

  // Keep the backdrop scrolled in lockstep with the textarea.
  const syncScroll = useCallback(() => {
    if (taRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = taRef.current.scrollTop;
      backdropRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }, []);

  const updateCaret = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    setCaret(pos);
    const r = rangeAtCaret(suggestions, pos);
    setActive(r);
  }, [suggestions]);

  // If the active card's word is no longer flagged (accepted/kept), close it.
  useEffect(() => {
    if (active && !suggestions.some((s) => s.start === active.start && s.original === active.original)) {
      setActive(null);
    }
  }, [suggestions, active]);

  const handleUse = useCallback(
    (range: FlaggedRange) => {
      const { text, caret: c } = applyCorrection(value, range, range.suggestion);
      onChange(text);
      setActive(null);
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(c, c);
          setCaret(c);
        }
      });
    },
    [value, onChange]
  );

  const handleKeep = useCallback(
    (range: FlaggedRange) => {
      onKeepWord(normalizeWord(range.original));
      setActive(null);
      toast(language === "da" ? "Din stavning er gemt." : "Kept your spelling.", {
        description:
          language === "da"
            ? `"${range.original}" bliver ikke markeret igen.`
            : `"${range.original}" won't be flagged again.`,
      });
    },
    [language, onKeepWord]
  );

  const handlePolish = useCallback(async () => {
    setPolishing(true);
    try {
      const all = await checkAll();
      setBatch(all);
      if (all.length === 0) {
        toast(language === "da" ? "Intet at ændre." : "Nothing to change.", {
          description: language === "da" ? "Din tekst ser fin ud." : "Your note reads just fine.",
        });
      }
    } finally {
      setPolishing(false);
    }
  }, [checkAll, language]);

  // Batch accept/reject. Apply from the END so earlier offsets stay valid.
  const acceptBatch = useCallback(
    (range: FlaggedRange) => {
      const { text } = applyCorrection(value, range, range.suggestion);
      onChange(text);
      setBatch((prev) => (prev ? prev.filter((r) => r.start !== range.start) : prev));
    },
    [value, onChange]
  );
  const rejectBatch = useCallback((range: FlaggedRange) => {
    setBatch((prev) => (prev ? prev.filter((r) => r.start !== range.start) : prev));
  }, []);

  const speakBatch = useCallback(
    (word: string) => {
      try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(word);
        u.lang = langTag;
        u.rate = 0.82;
        synth.speak(u);
      } catch {
        /* ignore */
      }
    },
    [langTag]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar: dictate + polish */}
      {showToolbar && <div className="mb-2 flex items-center gap-2">
        {dictationSupported && (
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={requesting}
            aria-pressed={listening}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 ${
              listening
                ? "bg-sage text-sage-foreground hover:bg-sage/90"
                : "border border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            {requesting
              ? language === "da" ? "Tillad mikrofon…" : "Allow mic…"
              : listening
                ? language === "da" ? "Lytter…" : "Listening…"
                : language === "da" ? "Diktér" : "Dictate"}
          </button>
        )}
        {coachEnabled && (
          <button
            type="button"
            onClick={handlePolish}
            disabled={polishing || !value.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-sage" aria-hidden="true" />
            {polishing
              ? language === "da" ? "Læser…" : "Reading…"
              : language === "da" ? "Tjek min note" : "Polish my note"}
          </button>
        )}
        {checking && !polishing && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {language === "da" ? "tjekker…" : "checking…"}
          </span>
        )}
      </div>}

      {/* Live dictation caption — always-correct, shows what the mic is hearing right now */}
      {listening && (
        <div
          className="mb-3 flex items-start gap-3 rounded-2xl border border-sage/30 bg-sage/10 px-4 py-3"
          aria-live="polite"
        >
          <Mic className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-sage" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            {interim ? (
              interim
            ) : (
              <span className="text-muted-foreground">
                {language === "da"
                  ? "Lytter… tal naturligt, så kommer ordene ind i din tekst."
                  : "Listening… speak naturally and your words appear here, then drop into your note."}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Dictation permission / error — calm, with a Try again when the mic is blocked */}
      {dictationError && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-foreground">{dictationError}</p>
            {permission === "denied" && (
              <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                <li>Click the microphone (or lock) icon in your browser's address bar.</li>
                <li>Set the microphone for this site to <span className="font-medium text-foreground">Allow</span>.</li>
                <li>Press <span className="font-medium text-foreground">Try again</span> below.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={retry}
              disabled={requesting}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-sage px-4 text-xs font-semibold text-sage-foreground outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              {requesting
                ? language === "da" ? "Anmoder…" : "Requesting…"
                : language === "da" ? "Prøv igen" : "Try again"}
            </button>
          </div>
        </div>
      )}

      {/* Editor: backdrop (dotted underlines) sits perfectly under the textarea */}
      <div className="relative flex-1">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="rr-note-layer pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl border border-transparent p-4 text-lg leading-relaxed text-transparent"
        >
          {segments.map((seg, i) =>
            seg.flagged && seg.range ? (
              <span
                key={i}
                className="rr-misspelled pointer-events-auto cursor-pointer"
                onClick={() => setActive(seg.range!)}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart ?? 0);
          }}
          onScroll={syncScroll}
          onClick={updateCaret}
          onKeyUp={updateCaret}
          onSelect={updateCaret}
          placeholder={placeholder || (language === "da"
            ? "Skriv frit. Vi hjælper roligt med stavning uden at ændre din stemme."
            : "Write freely. We'll gently help with spelling, never your voice.")}
          className="rr-note-layer relative h-full w-full resize-none rounded-2xl border border-input bg-transparent p-4 text-lg leading-relaxed text-foreground caret-sage outline-none placeholder:text-muted-foreground/70 focus:border-sage/50 focus:ring-2 focus:ring-sage/20"
          aria-label="Note text"
          spellCheck={false}
        />
      </div>

      {/* Inline suggestion card for the active word */}
      {active && (
        <SuggestionCard
          suggestion={active}
          langTag={langTag}
          onUse={() => handleUse(active)}
          onKeepMine={() => handleKeep(active)}
          onDismiss={() => setActive(null)}
        />
      )}

      {/* Batch review: accept/reject list */}
      {batch && batch.length > 0 && (
        <div className="rr-fade-up mt-3 rounded-2xl border border-sage/30 bg-accent/50 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">
            {batch.length} gentle suggestion{batch.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {batch.map((r) => (
              <li key={`${r.start}-${r.original}`} className="flex items-center justify-between gap-3 rounded-xl bg-card/70 p-2 pl-3">
                <div className="min-w-0 text-sm">
                  <span className="text-muted-foreground line-through">{r.original}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-semibold text-sage">{r.suggestion}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => speakBatch(r.suggestion)}
                    className="grid h-9 w-9 place-items-center rounded-full text-sage outline-none transition hover:bg-sage/15 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Hear "${r.suggestion}"`}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => acceptBatch(r)}
                    className="h-9 rounded-full bg-sage px-3 text-xs font-semibold text-sage-foreground outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectBatch(r)}
                    className="h-9 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Keep
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setBatch(null)}
            className="mt-3 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default NoteEditor;
