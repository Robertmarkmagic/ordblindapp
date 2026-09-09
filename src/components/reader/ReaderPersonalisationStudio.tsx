import { Check, Plus } from "lucide-react";
import { HIGHLIGHT_COLORS, TOOL_OPTIONS, type AestheticChoice, type AppPreferences, type ToolbarTool } from "@/lib/app-preferences";
import type { FontChoice, TintChoice } from "@/lib/reading-settings";
import { useLanguage } from "@/lib/i18n";

const THEME_CHOICES: Array<{ value: AestheticChoice; emoji: string; label: string }> = [
  { value: "strawberry", emoji: "🍓", label: "Pinky" },
  { value: "cloud", emoji: "🌊", label: "Ocean" },
  { value: "minimal", emoji: "♡", label: "Minimal" },
  { value: "sage", emoji: "🌿", label: "Wood" },
  { value: "midnight", emoji: "☾", label: "Night Mode" },
];

const FONT_CHOICES: Array<{ value: FontChoice; label: string }> = [
  { value: "opendyslexic", label: "OpenDyslexic" },
  { value: "poppins", label: "Poppins" },
  { value: "lora", label: "Lora" },
];

const BACKGROUNDS: Array<{ value: TintChoice; color: string; label: string }> = [
  { value: "cream", color: "#fff8ee", label: "Creme" },
  { value: "white", color: "#ffffff", label: "Hvid" },
  { value: "sepia", color: "#ead9c3", label: "Sepia" },
  { value: "soft-gray", color: "#cad3bf", label: "Salvie" },
  { value: "soft-blue", color: "#d9edff", label: "Lyseblå" },
];

const TEXT_COLORS = ["#1E293B", "#203B5B", "#4B3621", "#111827", "#FFF0AA"];

interface Props {
  preferences: AppPreferences;
  onPreferences: (next: AppPreferences) => void;
  font: FontChoice;
  onFont: (font: FontChoice) => void;
  tint: TintChoice;
  onTint: (tint: TintChoice) => void;
  bionic: boolean;
  onBionic: (active: boolean) => void;
}

export function ReaderThemeChooser({ value, onChange }: { value: AestheticChoice; onChange: (value: AestheticChoice) => void }) {
  return (
    <section className="rr-theme-chooser" aria-labelledby="theme-heading">
      <div className="text-center text-foreground drop-shadow-sm">
        <h1 id="theme-heading" className="font-display text-3xl font-bold uppercase tracking-[0.04em] sm:text-5xl">Gør det til dit eget</h1>
        <p className="mt-1 text-base font-semibold sm:text-xl">Ikke alle læser bedst på samme måde.</p>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">Vælg et tema, og tilpas derefter skrift, farver og værktøjer.</p>
      </div>
      <div className="mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-5">
        {THEME_CHOICES.map((theme) => (
          <button
            key={theme.value}
            type="button"
            onClick={() => onChange(theme.value)}
            aria-pressed={value === theme.value}
            className={`rr-theme-card rr-theme-card-${theme.value} ${value === theme.value ? "is-active" : ""}`}
          >
            <span className="text-3xl" aria-hidden="true">{theme.emoji}</span>
            <span>{theme.label}</span>
            {value === theme.value && <Check className="absolute right-2 top-2 h-4 w-4" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ReaderPersonalisationStudio({ preferences, onPreferences, font, onFont, tint, onTint, bionic, onBionic }: Props) {
  const { language } = useLanguage();
  const update = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => onPreferences({ ...preferences, [key]: value });
  const toggleTool = (tool: ToolbarTool) => {
    const selected = preferences.toolbar.includes(tool);
    const next = selected ? preferences.toolbar.filter((item) => item !== tool) : [...preferences.toolbar, tool];
    if (next.length) update("toolbar", next);
  };

  return (
    <section className="mt-5 space-y-3" aria-label={language === "da" ? "Tilpas din læseplads" : "Personalise your reading space"}>
      <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr_.68fr]">
        <div className="rr-control-card">
          <h2>Skrifttype</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {FONT_CHOICES.map((option) => (
              <button key={option.value} type="button" onClick={() => { onFont(option.value); onBionic(false); }} className={`rr-font-choice ${font === option.value && !bionic ? "is-active" : ""}`} style={{ fontFamily: option.value === "lora" ? "Lora, serif" : option.value === "poppins" ? "Poppins, sans-serif" : "OpenDyslexic, sans-serif" }}>
                <b>Aa</b><span>{option.label}</span>
              </button>
            ))}
            <button type="button" onClick={() => onBionic(!bionic)} className={`rr-font-choice ${bionic ? "is-active" : ""}`}><b>Aa</b><span>Bionic Reading</span></button>
          </div>
        </div>

        <div className="rr-control-card">
          <h2>Tekststørrelse og afstand</h2>
          <label className="rr-range-row"><span className="text-sm">A</span><input type="range" min="16" max="32" step="1" value={preferences.readerFontSize} onChange={(event) => update("readerFontSize", Number(event.target.value))} aria-label="Tekststørrelse" /><span className="text-2xl">A</span></label>
          <span className="rr-control-label">Linjeafstand</span>
          <label className="rr-range-row"><span>☰</span><input type="range" min="1.4" max="2.6" step="0.1" value={preferences.readerLineHeight} onChange={(event) => update("readerLineHeight", Number(event.target.value))} aria-label="Linjeafstand" /><span>☷</span></label>
          <span className="rr-control-label">Bogstavsafstand</span>
          <label className="rr-range-row"><span>Aa</span><input type="range" min="0" max="0.12" step="0.01" value={preferences.readerLetterSpacing} onChange={(event) => update("readerLetterSpacing", Number(event.target.value))} aria-label="Bogstavsafstand" /><span>A a</span></label>
        </div>

        <div className="rr-control-card">
          <h2>Baggrund og tekstfarve</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {BACKGROUNDS.map((option) => <button key={option.value} type="button" onClick={() => onTint(option.value)} aria-label={`Baggrund: ${option.label}`} aria-pressed={tint === option.value} className={`rr-color-dot ${tint === option.value ? "is-active" : ""}`} style={{ backgroundColor: option.color }} />)}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {TEXT_COLORS.map((color) => <button key={color} type="button" onClick={() => update("readerTextColor", color)} aria-label="Vælg tekstfarve" aria-pressed={preferences.readerTextColor === color} className={`rr-color-dot ${preferences.readerTextColor === color ? "is-active" : ""}`} style={{ backgroundColor: color }} />)}
          </div>
        </div>

        <div className="rr-control-card">
          <h2>Highlights</h2>
          <div className="mt-2 space-y-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button key={color.value} type="button" onClick={() => update("highlightColor", color.value)} className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-xs font-medium">
                <span className={`h-5 w-5 rounded-full ${preferences.highlightColor === color.value ? "ring-2 ring-primary ring-offset-2" : ""}`} style={{ backgroundColor: color.hex }} />
                {color.label.da}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_1fr]">
        <div className="rr-control-card">
          <h2>Vælg dine værktøjer</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {TOOL_OPTIONS.map((tool) => {
              const active = preferences.toolbar.includes(tool.value);
              return <button key={tool.value} type="button" onClick={() => toggleTool(tool.value)} aria-pressed={active} className={`rr-tool-choice ${active ? "is-active" : ""}`}><span className="text-xl" aria-hidden="true">{tool.emoji}</span><span>{tool.label.da}</span>{active && <Check className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />}</button>;
            })}
            <button type="button" className="rr-tool-choice"><Plus className="h-5 w-5" /><span>Tilføj</span></button>
          </div>
        </div>
        <div className="rr-control-card">
          <div className="flex items-center justify-between"><h2>Stickers</h2><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={preferences.decorations} onChange={(event) => update("decorations", event.target.checked)} /> Vis pynt</label></div>
          <div className="mt-3 flex flex-wrap gap-2" aria-hidden={!preferences.decorations}>
            {["🍓", "♡", "🎀", "🌼", "⭐", "🐱", "☕", "🌊"].map((sticker) => <span key={sticker} className={`grid h-12 w-12 place-items-center rounded-xl border border-border bg-background text-2xl ${preferences.decorations ? "" : "opacity-25 grayscale"}`}>{sticker}</span>)}
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-dashed border-primary text-primary"><Plus /></span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReaderPersonalisationStudio;
