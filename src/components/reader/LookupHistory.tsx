import React from "react";
import { Sparkles, Languages, Play, Square, BookMarked } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { bcp47For } from "@/lib/reader-tokens";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { LookupRow, Lang } from "@/lib/lookups";
import { useLanguage } from "@/lib/i18n";

interface LookupHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LookupRow[];
  loading: boolean;
  /** The reader's font — results are shown in it, like the card. */
  fontFamily: string;
}

/**
 * The "Looked up" list — every explanation and translation the reader has saved
 * for this document, newest first, so a student can revisit hard words before a
 * test. Each entry can be re-read aloud. Opens from the book icon in the reader.
 */
export function LookupHistory({ open, onOpenChange, items, loading, fontFamily }: LookupHistoryProps) {
  const speech = useSpeech();
  const { t } = useLanguage();

  // Stop audio when the sheet closes.
  React.useEffect(() => {
    if (!open) speech.stop();
  }, [open, speech]);

  const speak = (row: LookupRow) => {
    const text = row.result_text || "";
    if (!text) return;
    if (speech.speaking) {
      speech.stop();
      return;
    }
    speech.speak(text, { lang: bcp47For((row.target_lang as Lang) || "en") });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-2xl">
            <BookMarked className="h-6 w-6 text-sage" aria-hidden="true" />
            Looked up
          </SheetTitle>
          <SheetDescription>
            Words and lines you've explored — come back any time to revisit them.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="rr-skeleton mb-3 h-4 w-24 rounded" />
                <div className="rr-skeleton mb-2 h-4 w-full rounded" />
                <div className="rr-skeleton h-4 w-2/3 rounded" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
              <BookMarked className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-base font-medium text-foreground">{t("lookup.empty", "Nothing here yet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("lookup.emptyHelp", "Select any word or line, then tap Explain simply or Translate. It will be saved here.")}
              </p>
            </div>
          ) : (
            items.map((row) => {
              const isTranslate = row.kind === "translate";
              const Icon = isTranslate ? Languages : Sparkles;
              return (
                <div key={row.id} className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                      <Icon className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
                      {isTranslate ? t("lookup.translation", "Translation") : t("lookup.explained", "Explained")}
                    </span>
                    <button
                      onClick={() => speak(row)}
                      aria-label={t("lookup.readAloud", "Read this aloud")}
                      className="grid h-9 w-9 place-items-center rounded-full text-sage outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      {speech.speaking ? (
                        <Square className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <p className="mb-1 line-clamp-2 text-sm italic text-muted-foreground">
                    "{row.source_text}"
                  </p>
                  <p className="text-base leading-relaxed text-foreground" style={{ fontFamily }}>
                    {row.result_text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default LookupHistory;
