// ReliefRead reading preferences.
//
// One row per user in the `user_setting` entity (user_scoped — the platform
// enforces that each user only ever reads/writes their own row). These
// defaults are applied to every new reading session.

import { overskill } from "@/lib/auth";

export type FontChoice = "lexend" | "opendyslexic" | "standard";
export type TintChoice = "cream" | "white" | "sepia" | "soft-blue" | "soft-gray";
export type PlanChoice = "free" | "premium";

export interface ReadingSettings {
  id?: string;
  plan: PlanChoice;
  default_font: FontChoice;
  default_background_tint: TintChoice;
  default_voice: string;
  default_playback_speed: number;
}

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  plan: "free",
  default_font: "lexend",
  default_background_tint: "cream",
  default_voice: "default",
  default_playback_speed: 1,
};

export interface FontOption {
  value: FontChoice;
  label: string;
  description: string;
  /** CSS font-family stack — always ends in a safe fallback. */
  fontFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: "lexend",
    label: "Lexend",
    description: "Designed to help you read a little faster and easier.",
    fontFamily: "'Lexend', ui-sans-serif, system-ui, sans-serif",
  },
  {
    value: "opendyslexic",
    label: "OpenDyslexic",
    description: "Weighted letter bottoms to reduce swapping and flipping.",
    fontFamily: "'OpenDyslexic', 'Lexend', ui-sans-serif, system-ui, sans-serif",
  },
  {
    value: "standard",
    label: "Standard sans-serif",
    description: "A clean, familiar typeface if you prefer something plain.",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
];

export interface TintOption {
  value: TintChoice;
  label: string;
  /** Light-mode reading surface color. */
  swatch: string;
}

export const TINT_OPTIONS: TintOption[] = [
  { value: "cream", label: "Warm cream", swatch: "#FDFBF7" },
  { value: "white", label: "Plain white", swatch: "#FFFFFF" },
  { value: "sepia", label: "Sepia", swatch: "#F4ECD8" },
  { value: "soft-blue", label: "Soft blue", swatch: "#EAF2F8" },
  { value: "soft-gray", label: "Soft gray", swatch: "#EEF0F2" },
];

export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

/** Resolve helpers so the reader can apply a saved preference. */
export function fontFamilyFor(font: FontChoice): string {
  return (FONT_OPTIONS.find((f) => f.value === font) ?? FONT_OPTIONS[0]).fontFamily;
}
export function tintColorFor(tint: TintChoice): string {
  return (TINT_OPTIONS.find((t) => t.value === tint) ?? TINT_OPTIONS[0]).swatch;
}

function normalize(row: Record<string, unknown>): ReadingSettings {
  const speed = Number((row.default_playback_speed as number | string) ?? 1);
  return {
    id: row.id as string | undefined,
    plan: ((row.plan as PlanChoice) || "free") as PlanChoice,
    default_font: ((row.default_font as FontChoice) || "lexend") as FontChoice,
    default_background_tint: ((row.default_background_tint as TintChoice) || "cream") as TintChoice,
    default_voice: (row.default_voice as string) || "default",
    default_playback_speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
  };
}

/** Load the current user's settings, creating a defaults row on first use. */
export async function loadReadingSettings(): Promise<ReadingSettings> {
  const rows = await overskill.entities.user_setting.list();
  if (rows && rows.length > 0) {
    return normalize(rows[0]);
  }
  const created = await overskill.entities.user_setting.create({ ...DEFAULT_READING_SETTINGS });
  return { ...DEFAULT_READING_SETTINGS, id: created.id };
}

/** Persist settings, creating the row if it does not exist yet. */
export async function saveReadingSettings(settings: ReadingSettings): Promise<ReadingSettings> {
  const payload = {
    plan: settings.plan,
    default_font: settings.default_font,
    default_background_tint: settings.default_background_tint,
    default_voice: settings.default_voice,
    default_playback_speed: settings.default_playback_speed,
  };
  if (settings.id) {
    await overskill.entities.user_setting.update(settings.id, payload);
    return { ...settings, ...payload };
  }
  const created = await overskill.entities.user_setting.create(payload);
  return { ...settings, ...payload, id: created.id };
}
