import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Check, Loader2, Moon, Volume2, Gauge, Type, Palette, Sparkles, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReliefHeader } from "@/components/ReliefHeader";
import { SoftNotice } from "@/components/SoftNotice";
import { SettingRowSkeleton } from "@/components/Skeletons";
import { useReadingSettings } from "@/hooks/useReadingSettings";
import {
  FONT_OPTIONS,
  TINT_OPTIONS,
  SPEED_OPTIONS,
  fontFamilyFor,
  type FontChoice,
  type TintChoice,
} from "@/lib/reading-settings";
import { usePremium } from "@/hooks/usePremium";
import { getMonthlyUsage } from "@/lib/usage";
import { aiMinutesRemaining, nextResetLabel, downgradeToFree, PRICING } from "@/lib/billing";
import { PersonalisationSettings } from "@/components/PersonalisationSettings";
import { useLanguage } from "@/lib/i18n";

const VOICE_OPTIONS = [
  { value: "default", label: "System default" },
  { value: "warm", label: "Warm & steady" },
  { value: "bright", label: "Bright & clear" },
  { value: "calm", label: "Calm & slow" },
];

/**
 * Reading settings — the defaults applied to every new session.
 * Saved to the user's `user_setting` row so they persist across logout/login.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, setSettings, save, loading, error } = useReadingSettings();
  const { premium, loading: premiumLoading, refresh: refreshPremium } = usePremium();
  const { t } = useLanguage();

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ttsSecondsUsed, setTtsSecondsUsed] = useState(0);
  const [downgrading, setDowngrading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    getMonthlyUsage().then((u) => active && setTtsSecondsUsed(u.ttsSecondsUsed));
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const handleDowngrade = async () => {
    setDowngrading(true);
    try {
      await downgradeToFree();
      await refreshPremium();
      toast("You're back on Free.", {
        description: "Your readings and saved audio are all still here. You can upgrade again anytime.",
      });
    } catch {
      toast("We couldn't change your plan just now. Try again in a moment.");
    } finally {
      setDowngrading(false);
    }
  };

  // Clear the "Saved" confirmation shortly after showing it.
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await save(settings);
      setJustSaved(true);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSaveError("We couldn't save your settings just now. Give it another try.");
    } finally {
      setSaving(false);
    }
  };

  const showSkeleton = authLoading || (loading && !!user);

  return (
    <div className="min-h-screen bg-background">
      <ReliefHeader />

      <main className="mx-auto max-w-2xl px-5 pb-32 pt-8 sm:px-8">
        <div className="rr-fade-up">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {t("settings.title", "Reading settings")}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t("settings.intro", "Make ReliefRead your own. You can change your choices at any time.")}
          </p>
        </div>

        {error && !showSkeleton && (
          <SoftNotice className="mt-6">{error}</SoftNotice>
        )}

        {showSkeleton ? (
          <div className="mt-8 space-y-8">
            <SettingRowSkeleton />
            <SettingRowSkeleton />
            <SettingRowSkeleton />
          </div>
        ) : (
          <div className="rr-settle mt-8 space-y-5">
            <PersonalisationSettings />
            {/* Your plan — discreet, warm; AI minutes shown quietly (never a reader countdown) */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-sage" aria-hidden="true" />
                <h2 className="font-display text-xl font-semibold text-foreground">Your plan</h2>
              </div>
              {premiumLoading ? (
                <div className="mt-4 rr-skeleton h-10 w-40 rounded-xl" />
              ) : premium ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-sm font-semibold text-sage-foreground">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Premium
                    </span>
                    <span className="text-sm text-muted-foreground">Thank you for supporting ReliefRead.</span>
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold tabular-nums">{aiMinutesRemaining(ttsSecondsUsed)}</span> of 90 AI voice minutes left this month.
                    <span className="text-muted-foreground"> Replaying saved audio is always free and never counts. Resets on {nextResetLabel()}.</span>
                  </p>
                  <button
                    onClick={handleDowngrade}
                    disabled={downgrading}
                    className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-muted-foreground outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    {downgrading ? "Switching…" : "Switch to Free"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Cancel anytime — no questions, no dark patterns. You keep everything you've made.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-foreground">
                    You're on <span className="font-semibold">Free</span> — 3 readings a month and the standard voice.
                  </p>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-sage px-5 text-sm font-semibold text-sage-foreground shadow-paper outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    See Premium — {PRICING.monthly.price}{PRICING.monthly.cadence}
                  </button>
                </div>
              )}
            </section>

            {/* Default font */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-sage" aria-hidden="true" />
                <h2 className="font-display text-xl font-semibold text-foreground">Reading font</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the letters that feel easiest for your eyes.
              </p>
              <div className="mt-5 grid gap-3">
                {FONT_OPTIONS.map((opt) => {
                  const active = settings.default_font === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSettings({ ...settings, default_font: opt.value as FontChoice })
                      }
                      className={`flex min-h-[44px] items-center justify-between gap-4 rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active
                          ? "border-sage bg-accent"
                          : "border-border bg-background hover:border-sage/40"
                      }`}
                    >
                      <div>
                        <p
                          className="text-lg font-semibold text-foreground"
                          style={{ fontFamily: opt.fontFamily }}
                        >
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{opt.description}</p>
                      </div>
                      {active && <Check className="h-5 w-5 shrink-0 text-sage" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Background tint */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-sage" aria-hidden="true" />
                <h2 className="font-display text-xl font-semibold text-foreground">Background tint</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                A gentle page color can reduce glare and make words settle.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {TINT_OPTIONS.map((opt) => {
                  const active = settings.default_background_tint === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      aria-label={opt.label}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          default_background_tint: opt.value as TintChoice,
                        })
                      }
                      className={`flex min-h-[44px] items-center gap-3 rounded-2xl border px-4 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active ? "border-sage bg-accent" : "border-border bg-background hover:border-sage/40"
                      }`}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-border"
                        style={{ backgroundColor: opt.swatch }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      {active && <Check className="h-4 w-4 text-sage" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {/* Live preview */}
              <div
                className="mt-5 rounded-2xl border border-border p-5 text-base leading-loose"
                style={{
                  backgroundColor: TINT_OPTIONS.find(
                    (t) => t.value === settings.default_background_tint
                  )?.swatch,
                  fontFamily: fontFamilyFor(settings.default_font),
                  color: "#1E293B",
                }}
              >
                This is how your reading will look. Calm, clear, and comfortable.
              </div>
            </section>

            {/* Voice + speed */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-sage" aria-hidden="true" />
                <h2 className="font-display text-xl font-semibold text-foreground">Listening</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Your default voice and pace for reading aloud.
              </p>

              <div className="mt-5 space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="voice" className="text-base font-medium">
                    Default voice
                  </Label>
                  <Select
                    value={settings.default_voice}
                    onValueChange={(v) => setSettings({ ...settings, default_voice: v })}
                  >
                    <SelectTrigger
                      id="voice"
                      className="h-12 rounded-xl border-input bg-background text-base"
                      aria-label="Choose your default voice"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {VOICE_OPTIONS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Label className="text-base font-medium">Playback speed</Label>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {SPEED_OPTIONS.map((speed) => {
                      const active = settings.default_playback_speed === speed;
                      return (
                        <button
                          key={speed}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setSettings({ ...settings, default_playback_speed: speed })
                          }
                          className={`min-h-[44px] min-w-[64px] rounded-full border px-4 text-base font-medium tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            active
                              ? "border-sage bg-sage text-sage-foreground"
                              : "border-border bg-background text-foreground hover:border-sage/40"
                          }`}
                        >
                          {speed}×
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-sage" aria-hidden="true" />
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">Dark mode</p>
                    <p className="text-sm text-muted-foreground">
                      Dim the whole app for low-light reading.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
              </div>
            </section>

            {saveError && <SoftNotice>{saveError}</SoftNotice>}
          </div>
        )}
      </main>

      {/* Sticky calm save bar */}
      {!showSkeleton && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <span
              className={`text-sm font-medium text-sage transition-opacity ${
                justSaved ? "opacity-100" : "opacity-0"
              }`}
              role="status"
            >
              <Check className="mr-1 inline h-4 w-4" aria-hidden="true" />
              Saved — these apply to every new reading.
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="h-12 rounded-full px-5 text-base text-muted-foreground hover:bg-accent"
                onClick={() => navigate("/dashboard")}
              >
                Done
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-12 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
