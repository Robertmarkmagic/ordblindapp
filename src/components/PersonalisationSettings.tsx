import React from "react";
import { Check, LayoutGrid, Palette, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AESTHETIC_OPTIONS, TOOL_OPTIONS } from "@/lib/app-preferences";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useLanguage } from "@/lib/i18n";

export function PersonalisationSettings() {
  const { preferences, setPreferences } = useAppPreferences();
  const { language } = useLanguage();

  const toggleTool = (tool: (typeof TOOL_OPTIONS)[number]["value"]) => {
    const selected = preferences.toolbar.includes(tool);
    const toolbar = selected
      ? preferences.toolbar.filter((item) => item !== tool)
      : [...preferences.toolbar, tool];
    setPreferences({ ...preferences, toolbar: toolbar.length ? toolbar : ["riley"] });
  };

  return (
    <>
      <section className="rounded-3xl border border-border bg-card p-6 shadow-paper">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            {language === "da" ? "Vælg din stil" : "Choose your style"}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === "da"
            ? "Farverne ændres i hele ReliefRead. Du kan altid skifte igen."
            : "Colors change throughout ReliefRead. You can switch again at any time."}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {AESTHETIC_OPTIONS.map((option) => {
            const active = preferences.aesthetic === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setPreferences({ ...preferences, aesthetic: option.value })}
                className={`relative flex min-h-[84px] items-center gap-3 rounded-2xl border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-primary bg-accent" : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{option.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{option.name[language]}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{option.description[language]}</span>
                  <span className="mt-2 flex gap-1" aria-hidden="true">
                    {option.swatches.map((swatch) => (
                      <span key={swatch} className="h-3.5 w-8 rounded-full border border-black/10" style={{ backgroundColor: swatch }} />
                    ))}
                  </span>
                </span>
                {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-background px-4">
          <label className="flex min-h-[68px] items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-foreground">{language === "da" ? "Pynt og stickers" : "Decorations and stickers"}</span>
              <span className="block text-xs text-muted-foreground">{language === "da" ? "Kan slås fra for en mere rolig oplevelse" : "Turn off for a calmer experience"}</span>
            </span>
            <Switch
              checked={preferences.decorations}
              onCheckedChange={(decorations) => setPreferences({ ...preferences, decorations })}
              aria-label={language === "da" ? "Pynt og stickers" : "Decorations and stickers"}
            />
          </label>
          <label className="flex min-h-[68px] items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-foreground">{language === "da" ? "Venlige systembeskeder" : "Friendly system messages"}</span>
              <span className="block text-xs text-muted-foreground">{language === "da" ? "Eksempel: Riley gør din tekst klar" : "Example: Riley is getting your text ready"}</span>
            </span>
            <Switch
              checked={preferences.gentleMessages}
              onCheckedChange={(gentleMessages) => setPreferences({ ...preferences, gentleMessages })}
              aria-label={language === "da" ? "Venlige systembeskeder" : "Friendly system messages"}
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-paper">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            {language === "da" ? "Din værktøjslinje" : "Your toolbar"}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === "da" ? "Vælg de værktøjer, du vil have lige ved hånden." : "Choose the tools you want close at hand."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TOOL_OPTIONS.map((tool) => {
            const active = preferences.toolbar.includes(tool.value);
            return (
              <button
                key={tool.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTool(tool.value)}
                className={`relative flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-primary bg-accent text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span className="text-xl" aria-hidden="true">{tool.emoji}</span>
                <span className="text-xs font-semibold">{tool.label[language]}</span>
                {active && <Sparkles className="absolute right-2 top-2 h-3 w-3 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default PersonalisationSettings;
