import React, { useCallback } from "react";
import { Volume2, Check, X } from "lucide-react";
import type { FlaggedRange } from "@/lib/phonetics";
import { useLanguage } from "@/lib/i18n";

/** Speak a single word in the note's language. Best-effort, never throws. */
function speakWord(word: string, langTag: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = langTag;
    u.rate = 0.82;
    const prefix = langTag.slice(0, 2).toLowerCase();
    const voice = synth.getVoices().find((v) => (v.lang || "").toLowerCase().startsWith(prefix));
    if (voice) u.voice = voice;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}

interface SuggestionCardProps {
  suggestion: FlaggedRange;
  /** BCP-47 tag for reading the word aloud (e.g. "da-DK"). */
  langTag: string;
  onUse: () => void;
  onKeepMine: () => void;
  onDismiss: () => void;
}

/**
 * The gentle correction card. Big, friendly suggestion you can hear, with
 * "Use this" and "Keep mine" given EQUAL weight — choosing your own spelling
 * must never feel like the wrong answer. No red, anywhere.
 */
export function SuggestionCard({ suggestion, langTag, onUse, onKeepMine, onDismiss }: SuggestionCardProps) {
  const { language } = useLanguage();
  const speak = useCallback(() => speakWord(suggestion.suggestion, langTag), [suggestion.suggestion, langTag]);

  return (
    <div
      className="rr-fade-up mt-3 rounded-2xl border border-sage/30 bg-accent/60 p-4 shadow-paper"
      role="dialog"
      aria-label={`Spelling help for ${suggestion.original}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {language === "da" ? "Mente du" : "Did you mean"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-3xl font-semibold leading-tight text-sage">
              {suggestion.suggestion}
            </span>
            <button
              type="button"
              onClick={speak}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sage outline-none transition hover:bg-sage/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Hear "${suggestion.suggestion}" spoken aloud`}
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {language === "da" ? "Du skrev" : "You wrote"} <span className="font-medium text-foreground">{suggestion.original}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUse}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sage px-4 text-sm font-semibold text-sage-foreground outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {language === "da" ? "Brug dette" : "Use this"}
        </button>
        <button
          type="button"
          onClick={onKeepMine}
          className="inline-flex h-11 items-center justify-center rounded-full border border-sage/40 bg-card px-4 text-sm font-semibold text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {language === "da" ? "Behold mit" : "Keep mine"}
        </button>
      </div>
    </div>
  );
}

export default SuggestionCard;
