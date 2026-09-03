import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { ReadingVersion } from "@/lib/reading-versions";
import { useLanguage } from "@/lib/i18n";

interface ReadingVersionControlsProps {
  value: ReadingVersion;
  loading: ReadingVersion | null;
  onChange: (value: ReadingVersion) => void;
}

const OPTIONS: Array<{ value: ReadingVersion; da: string; en: string }> = [
  { value: "original", da: "Original", en: "Original" },
  { value: "easy", da: "Let", en: "Easy" },
  { value: "very-easy", da: "Meget let", en: "Very easy" },
  { value: "explain", da: "Forklar", en: "Explain" },
];

export function ReadingVersionControls({ value, loading, onChange }: ReadingVersionControlsProps) {
  const { language } = useLanguage();
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-3 shadow-paper" aria-label={language === "da" ? "Tekstniveau" : "Reading level"}>
      <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-sage" aria-hidden="true" />
        {language === "da" ? "Vælg hvordan teksten vises" : "Choose how the text is shown"}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          const busy = loading === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              disabled={loading !== null}
              onClick={() => onChange(option.value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70 ${
                active ? "border-sage bg-accent text-foreground" : "border-border bg-background text-muted-foreground hover:border-sage/50"
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {option[language]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-muted-foreground">
        {language === "da"
          ? "Originalen ændres aldrig. Lettere versioner laves kun som en visning."
          : "The original is never changed. Easier versions are created as a view only."}
      </p>
    </section>
  );
}

export default ReadingVersionControls;
