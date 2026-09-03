import React from "react";
import { Focus, Highlighter, MoveHorizontal, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  HIGHLIGHT_COLORS,
  type AppPreferences,
  type FocusScope,
  type HighlightMode,
} from "@/lib/app-preferences";
import { useLanguage } from "@/lib/i18n";

interface ReaderFocusControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: AppPreferences;
  onChange: (preferences: AppPreferences) => void;
}

const HIGHLIGHT_MODES: Array<{ value: HighlightMode; da: string; en: string }> = [
  { value: "word", da: "Ord", en: "Word" },
  { value: "line", da: "Linje", en: "Line" },
  { value: "sentence", da: "Sætning", en: "Sentence" },
];

const FOCUS_SCOPES: Array<{ value: FocusScope; da: string; en: string }> = [
  { value: "off", da: "Fra", en: "Off" },
  { value: "word", da: "1 ord", en: "1 word" },
  { value: "line", da: "1 linje", en: "1 line" },
  { value: "two-lines", da: "2 linjer", en: "2 lines" },
  { value: "sentence", da: "1 sætning", en: "1 sentence" },
  { value: "paragraph", da: "1 afsnit", en: "1 paragraph" },
];

const FONT_WEIGHTS = [
  { value: 300, da: "Tynd", en: "Light" },
  { value: 400, da: "Normal", en: "Normal" },
  { value: 500, da: "Medium", en: "Medium" },
  { value: 700, da: "Fed", en: "Bold" },
  { value: 800, da: "Ekstra", en: "Extra" },
];

const TEXT_COLORS = [
  { value: "#1E293B", da: "Mørk grå", en: "Dark grey" },
  { value: "#111827", da: "Sort", en: "Black" },
  { value: "#4B3621", da: "Mørk brun", en: "Dark brown" },
  { value: "#203B5B", da: "Mørk blå", en: "Dark blue" },
];

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  language,
}: {
  options: Array<{ value: T; da: string; en: string }>;
  value: T;
  onChange: (value: T) => void;
  language: "da" | "en";
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
              active ? "border-sage bg-accent text-foreground" : "border-border bg-background text-muted-foreground hover:border-sage/50"
            }`}
          >
            {option[language]}
          </button>
        );
      })}
    </div>
  );
}

export function ReaderFocusControls({ open, onOpenChange, preferences, onChange }: ReaderFocusControlsProps) {
  const { language } = useLanguage();
  const change = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    onChange({ ...preferences, [key]: value });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-paper outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={language === "da" ? "Fokus og markering" : "Focus and highlighting"}
        >
          <Focus className="h-4 w-4 text-sage" aria-hidden="true" />
          <span className="hidden sm:inline">{language === "da" ? "Fokus" : "Focus"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[75vh] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Highlighter className="h-4 w-4 text-sage" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            {language === "da" ? "Markér under oplæsning" : "Highlight while reading"}
          </h2>
        </div>
        <OptionGrid
          options={HIGHLIGHT_MODES}
          value={preferences.highlightMode}
          onChange={(value) => change("highlightMode", value)}
          language={language}
        />

        <div className="mt-5 flex items-center gap-2">
          <Focus className="h-4 w-4 text-sage" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            {language === "da" ? "Fokusvisning" : "Focus view"}
          </h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {language === "da"
            ? "Dæmper resten af teksten, mens du lytter."
            : "Dims the rest of the text while you listen."}
        </p>
        <OptionGrid
          options={FOCUS_SCOPES}
          value={preferences.focusScope}
          onChange={(value) => change("focusScope", value)}
          language={language}
        />

        <div className="mt-5 flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {language === "da" ? "Markeringsfarve" : "Highlight colour"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {HIGHLIGHT_COLORS.map((color) => {
            const active = preferences.highlightColor === color.value;
            return (
              <button
                key={color.value}
                type="button"
                aria-label={color.label[language]}
                aria-pressed={active}
                title={color.label[language]}
                onClick={() => change("highlightColor", color.value)}
                className={`grid h-11 w-11 place-items-center rounded-full border outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-sage ring-2 ring-sage/40" : "border-border"
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-slate-700" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-sage" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              {language === "da" ? "Tekststørrelse" : "Text size"}: {preferences.readerFontSize}px
            </span>
          </div>
          <Slider
            value={[preferences.readerFontSize]}
            min={16}
            max={32}
            step={1}
            onValueChange={([value]) => change("readerFontSize", value)}
            aria-label={language === "da" ? "Tekststørrelse" : "Text size"}
          />

          <div className="mb-2 mt-5 text-sm font-semibold text-foreground">
            {language === "da" ? "Teksttykkelse" : "Text weight"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FONT_WEIGHTS.map((weight) => {
              const active = preferences.readerFontWeight === weight.value;
              return (
                <button
                  key={weight.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => change("readerFontWeight", weight.value)}
                  className={`min-h-11 rounded-xl border px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-sage bg-accent" : "border-border bg-background hover:border-sage/50"
                  }`}
                  style={{ fontWeight: weight.value }}
                >
                  {weight[language]}
                </button>
              );
            })}
          </div>

          <div className="mb-3 mt-5 flex items-center gap-2">
            <MoveHorizontal className="h-4 w-4 text-sage" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              {language === "da" ? "Bogstavafstand" : "Letter spacing"}
            </span>
          </div>
          <Slider
            value={[preferences.readerLetterSpacing]}
            min={0}
            max={0.12}
            step={0.01}
            onValueChange={([value]) => change("readerLetterSpacing", value)}
            aria-label={language === "da" ? "Bogstavafstand" : "Letter spacing"}
          />

          <div className="mb-3 mt-5 flex items-center gap-2">
            <MoveHorizontal className="h-4 w-4 text-sage" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              {language === "da" ? "Afstand mellem ord" : "Space between words"}
            </span>
          </div>
          <Slider
            value={[preferences.readerWordSpacing]}
            min={0}
            max={0.3}
            step={0.02}
            onValueChange={([value]) => change("readerWordSpacing", value)}
            aria-label={language === "da" ? "Afstand mellem ord" : "Space between words"}
          />

          <div className="mb-3 mt-5 flex items-center justify-between text-sm font-semibold text-foreground">
            <span>{language === "da" ? "Linjeafstand" : "Line spacing"}</span>
            <span>{preferences.readerLineHeight.toFixed(1)}</span>
          </div>
          <Slider
            value={[preferences.readerLineHeight]}
            min={1.4}
            max={2.6}
            step={0.1}
            onValueChange={([value]) => change("readerLineHeight", value)}
            aria-label={language === "da" ? "Linjeafstand" : "Line spacing"}
          />

          <div className="mb-2 mt-5 text-sm font-semibold text-foreground">
            {language === "da" ? "Tekstfarve" : "Text colour"}
          </div>
          <div className="flex flex-wrap gap-2">
            {TEXT_COLORS.map((color) => {
              const active = preferences.readerTextColor === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color[language]}
                  aria-pressed={active}
                  title={color[language]}
                  onClick={() => change("readerTextColor", color.value)}
                  className={`grid h-11 w-11 place-items-center rounded-full border bg-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-sage ring-2 ring-sage/40" : "border-border"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: color.value }} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ReaderFocusControls;
