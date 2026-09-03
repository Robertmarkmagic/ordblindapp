import React, { useEffect } from "react";
import { X, Sparkles, Languages, Play, Square, Loader2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { bcp47For } from "@/lib/reader-tokens";
import { SoftNotice } from "@/components/SoftNotice";
import type { LookupKind, Lang } from "@/lib/lookups";

interface LookupCardProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  kind: LookupKind;
  sourceText: string;
  resultText: string;
  /** Language of the RESULT — the card speaks it in this language. */
  resultLang: Lang;
  /** The reader's font — the explanation/translation is shown in it. */
  fontFamily: string;
  onClose: () => void;
}

/**
 * The calm result card for Explain / Translate. It respects the user's reading
 * font (an OpenDyslexic reader gets their explanation in OpenDyslexic too) and
 * carries its own small play button that reads the result aloud in the result's
 * language. Never uses red; dismissible by backdrop, close button, or Escape.
 */
export function LookupCard({
  open,
  loading,
  error,
  kind,
  sourceText,
  resultText,
  resultLang,
  fontFamily,
  onClose,
}: LookupCardProps) {
  const speech = useSpeech();

  // Stop any audio whenever the card closes.
  useEffect(() => {
    if (!open) speech.stop();
  }, [open, speech]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleAudio = () => {
    if (speech.speaking) speech.stop();
    else if (resultText) speech.speak(resultText, { lang: bcp47For(resultLang) });
  };

  const isTranslate = kind === "translate";
  const badgeLabel = isTranslate ? "Translation" : "Explained simply";
  const BadgeIcon = isTranslate ? Languages : Sparkles;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={badgeLabel}
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-in fade-in"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            <BadgeIcon className="h-4 w-4 text-sage" aria-hidden="true" />
            {badgeLabel}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Original text — small, above the result. */}
        {sourceText && (
          <p className="mb-3 line-clamp-3 text-sm italic leading-relaxed text-muted-foreground">
            "{sourceText}"
          </p>
        )}

        {loading ? (
          <div className="space-y-3 py-2" aria-hidden="true">
            <div className="rr-skeleton h-5 w-full rounded" />
            <div className="rr-skeleton h-5 w-11/12 rounded" />
            <div className="rr-skeleton h-5 w-2/3 rounded" />
          </div>
        ) : error ? (
          <SoftNotice>{error}</SoftNotice>
        ) : (
          <>
            <p
              className="text-xl leading-relaxed text-foreground"
              style={{ fontFamily }}
            >
              {resultText}
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={toggleAudio}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-sage px-5 text-sm font-semibold text-sage-foreground shadow-paper outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                aria-label={speech.speaking ? "Stop reading" : "Read this aloud"}
              >
                {speech.speaking ? (
                  <>
                    <Square className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Listen
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LookupCard;
