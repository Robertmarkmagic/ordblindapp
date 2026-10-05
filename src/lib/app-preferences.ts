export type AestheticChoice =
  | "strawberry"
  | "sage"
  | "cloud"
  | "lavender"
  | "cozy"
  | "midnight"
  | "minimal"
  | "dino"
  | "unicorn";

export type ToolbarTool =
  | "read"
  | "highlight"
  | "words"
  | "dictate"
  | "spelling"
  | "grammar"
  | "comma"
  | "riley";

export type HighlightMode = "word" | "line" | "sentence";
export type FocusScope = "off" | "word" | "line" | "two-lines" | "sentence" | "paragraph";
export type HighlightColor = "yellow" | "pink" | "blue" | "green" | "lavender";

export interface AppPreferences {
  aesthetic: AestheticChoice;
  decorations: boolean;
  gentleMessages: boolean;
  toolbar: ToolbarTool[];
  highlightMode: HighlightMode;
  focusScope: FocusScope;
  highlightColor: HighlightColor;
  readerFontSize: number;
  readerFontWeight: number;
  readerLineHeight: number;
  readerLetterSpacing: number;
  readerWordSpacing: number;
  readerTextColor: string;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  aesthetic: "cloud",
  decorations: true,
  gentleMessages: true,
  toolbar: ["read", "highlight", "words", "dictate", "riley"],
  highlightMode: "word",
  focusScope: "off",
  highlightColor: "yellow",
  readerFontSize: 20,
  readerFontWeight: 400,
  readerLineHeight: 1.9,
  readerLetterSpacing: 0,
  readerWordSpacing: 0.08,
  readerTextColor: "#1E293B",
};

export const HIGHLIGHT_COLORS: Array<{ value: HighlightColor; hex: string; label: { da: string; en: string } }> = [
  { value: "yellow", hex: "#FEF08A", label: { da: "Gul", en: "Yellow" } },
  { value: "pink", hex: "#FBCFE8", label: { da: "Pink", en: "Pink" } },
  { value: "blue", hex: "#BFDBFE", label: { da: "Blå", en: "Blue" } },
  { value: "green", hex: "#BBF7D0", label: { da: "Grøn", en: "Green" } },
  { value: "lavender", hex: "#DDD6FE", label: { da: "Lavendel", en: "Lavender" } },
];

export const AESTHETIC_OPTIONS: Array<{
  value: AestheticChoice;
  emoji: string;
  name: { da: string; en: string };
  description: { da: string; en: string };
  swatches: [string, string, string];
}> = [
  { value: "minimal", emoji: "🤍", name: { da: "Hvid", en: "White" }, description: { da: "Hvid baggrund med sort tekst", en: "White background with black text" }, swatches: ["#ffffff", "#f7f7f7", "#171717"] },
  { value: "midnight", emoji: "🌙", name: { da: "Night Mode", en: "Night Mode" }, description: { da: "Sort baggrund med hvid tekst", en: "Black background with white text" }, swatches: ["#000000", "#111111", "#ffffff"] },
  { value: "cloud", emoji: "🌊", name: { da: "Ocean", en: "Ocean" }, description: { da: "Lyseblå baggrund med sort tekst", en: "Light blue background with black text" }, swatches: ["#edf8ff", "#cce8f8", "#171717"] },
  { value: "dino", emoji: "🦕", name: { da: "Dino", en: "Dino" }, description: { da: "Et grønt børneunivers", en: "A green children's world" }, swatches: ["#e4f2d4", "#b9dca8", "#171717"] },
  { value: "unicorn", emoji: "🦄", name: { da: "Glimmer-magi", en: "Glitter magic" }, description: { da: "Enhjørning, glimmer og pasteller", en: "Unicorns, glitter and pastels" }, swatches: ["#ffdff1", "#d9eeff", "#171717"] },
];

export const TOOL_OPTIONS: Array<{
  value: ToolbarTool;
  emoji: string;
  label: { da: string; en: string };
}> = [
  { value: "read", emoji: "▶️", label: { da: "Læs", en: "Read" } },
  { value: "highlight", emoji: "🩷", label: { da: "Highlight", en: "Highlight" } },
  { value: "words", emoji: "🔤", label: { da: "Ord", en: "Words" } },
  { value: "dictate", emoji: "🎙️", label: { da: "Tal", en: "Dictate" } },
  { value: "spelling", emoji: "✓", label: { da: "Stavning", en: "Spelling" } },
  { value: "grammar", emoji: "✍️", label: { da: "Grammatik", en: "Grammar" } },
  { value: "comma", emoji: "[,]", label: { da: "Komma", en: "Comma" } },
  { value: "riley", emoji: "✨", label: { da: "Riley", en: "Riley" } },
];

const STORAGE_KEY = "reliefread-app-preferences-v1";
export const PREFERENCES_EVENT = "reliefread:preferences";

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function normalize(value: Partial<AppPreferences> | null): AppPreferences {
  const toolbar = Array.isArray(value?.toolbar)
    ? value.toolbar.filter((tool): tool is ToolbarTool => TOOL_OPTIONS.some((item) => item.value === tool))
    : DEFAULT_APP_PREFERENCES.toolbar;
  const oldAesthetic = value?.aesthetic;
  const aesthetic: AestheticChoice = AESTHETIC_OPTIONS.some((item) => item.value === oldAesthetic)
    ? (oldAesthetic as AestheticChoice)
    : ["strawberry", "sage", "lavender", "cozy"].includes(oldAesthetic || "")
      ? "minimal"
      : DEFAULT_APP_PREFERENCES.aesthetic;
  return {
    aesthetic,
    decorations: value?.decorations !== false,
    gentleMessages: value?.gentleMessages !== false,
    toolbar: toolbar.length ? toolbar : DEFAULT_APP_PREFERENCES.toolbar,
    highlightMode: ["word", "line", "sentence"].includes(value?.highlightMode || "")
      ? (value?.highlightMode as HighlightMode)
      : DEFAULT_APP_PREFERENCES.highlightMode,
    focusScope: ["off", "word", "line", "two-lines", "sentence", "paragraph"].includes(value?.focusScope || "")
      ? (value?.focusScope as FocusScope)
      : DEFAULT_APP_PREFERENCES.focusScope,
    highlightColor: HIGHLIGHT_COLORS.some((item) => item.value === value?.highlightColor)
      ? (value?.highlightColor as HighlightColor)
      : DEFAULT_APP_PREFERENCES.highlightColor,
    readerFontSize: numberInRange(value?.readerFontSize, DEFAULT_APP_PREFERENCES.readerFontSize, 16, 32),
    readerFontWeight: [300, 400, 500, 700, 800].includes(value?.readerFontWeight || 0)
      ? (value?.readerFontWeight as number)
      : DEFAULT_APP_PREFERENCES.readerFontWeight,
    readerLineHeight: numberInRange(value?.readerLineHeight, DEFAULT_APP_PREFERENCES.readerLineHeight, 1.4, 2.6),
    readerLetterSpacing: numberInRange(value?.readerLetterSpacing, DEFAULT_APP_PREFERENCES.readerLetterSpacing, 0, 0.12),
    readerWordSpacing: numberInRange(value?.readerWordSpacing, DEFAULT_APP_PREFERENCES.readerWordSpacing, 0, 0.3),
    readerTextColor: aesthetic === "midnight" ? "#FFFFFF" : "#171717",
  };
}

export function loadAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_APP_PREFERENCES;
  try {
    return normalize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function applyAppPreferences(preferences: AppPreferences) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.aesthetic = preferences.aesthetic;
  document.documentElement.dataset.decorations = preferences.decorations ? "on" : "off";
}

export function saveAppPreferences(preferences: AppPreferences) {
  const next = normalize(preferences);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: next }));
  }
  applyAppPreferences(next);
  return next;
}
