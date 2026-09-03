import React from "react";
import { Type, Palette, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FONT_OPTIONS,
  TINT_OPTIONS,
  type FontChoice,
  type TintChoice,
} from "@/lib/reading-settings";

interface ReaderAdjustProps {
  font: FontChoice;
  setFont: (f: FontChoice) => void;
  tint: TintChoice;
  setTint: (t: TintChoice) => void;
  bionic: boolean;
  setBionic: (b: boolean) => void;
}

/**
 * In-reader appearance controls — reading font, background tint, and Bionic
 * Reading. Session-local (never persisted), so a reader can flip Bionic ON for
 * a single text without changing their saved defaults. Mirrors the public
 * share AdjustPanel so the two surfaces feel identical.
 */
export function ReaderAdjust({
  font,
  setFont,
  tint,
  setTint,
  bionic,
  setBionic,
}: ReaderAdjustProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-paper outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Adjust reading appearance"
        >
          <Type className="h-4 w-4 text-sage" aria-hidden="true" />
          <span className="hidden sm:inline">Adjust</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-5">
        {/* Font */}
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-sage" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Reading font</span>
        </div>
        <div className="mt-2 grid gap-2">
          {FONT_OPTIONS.map((opt) => {
            const active = font === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFont(opt.value)}
                aria-pressed={active}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-sage bg-accent"
                    : "border-border bg-background hover:border-sage/40"
                }`}
                style={{ fontFamily: opt.fontFamily }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Tint */}
        <div className="mt-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-sage" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Background</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TINT_OPTIONS.map((opt) => {
            const active = tint === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTint(opt.value)}
                aria-pressed={active}
                aria-label={opt.label}
                title={opt.label}
                className={`grid h-10 w-10 place-items-center rounded-full border transition outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-sage ring-2 ring-sage/40" : "border-border"
                }`}
                style={{ backgroundColor: opt.swatch }}
              >
                {active && (
                  <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bionic */}
        <button
          onClick={() => setBionic(!bionic)}
          aria-pressed={bionic}
          className={`mt-4 flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
            bionic
              ? "border-sage bg-accent"
              : "border-border bg-background hover:border-sage/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-sage" aria-hidden="true" />
            Bionic reading
          </span>
          <span
            className={`grid h-6 w-11 items-center rounded-full px-0.5 transition ${
              bionic ? "bg-sage" : "bg-muted"
            }`}
            aria-hidden="true"
          >
            <span
              className={`h-5 w-5 rounded-full bg-background transition-transform ${
                bionic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

export default ReaderAdjust;
