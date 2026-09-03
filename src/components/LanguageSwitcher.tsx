import React from "react";
import { Languages } from "lucide-react";
import { useLanguage, type AppLanguage } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  const option = (value: AppLanguage, shortLabel: string, labelKey: string, english: string) => (
    <button
      type="button"
      onClick={() => setLanguage(value)}
      aria-pressed={language === value}
      aria-label={t(labelKey, english)}
      className={`min-h-9 rounded-full px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        language === value
          ? "bg-sage text-sage-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {shortLabel}
    </button>
  );

  return (
    <div
      className="inline-flex min-h-11 items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-paper"
      role="group"
      aria-label="Language"
    >
      {!compact && <Languages className="ml-2 h-4 w-4 text-sage" aria-hidden="true" />}
      {option("da", "DA", "language.danish", "Danish")}
      {option("en", "EN", "language.english", "English")}
    </div>
  );
}

export default LanguageSwitcher;
