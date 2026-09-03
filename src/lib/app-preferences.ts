export type AestheticChoice =
  | "strawberry"
  | "sage"
  | "cloud"
  | "lavender"
  | "cozy"
  | "midnight"
  | "minimal";

export type ToolbarTool =
  | "read"
  | "highlight"
  | "words"
  | "dictate"
  | "spelling"
  | "grammar"
  | "comma"
  | "riley";

export interface AppPreferences {
  aesthetic: AestheticChoice;
  decorations: boolean;
  gentleMessages: boolean;
  toolbar: ToolbarTool[];
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  aesthetic: "strawberry",
  decorations: true,
  gentleMessages: true,
  toolbar: ["read", "highlight", "words", "dictate", "riley"],
};

export const AESTHETIC_OPTIONS: Array<{
  value: AestheticChoice;
  emoji: string;
  name: { da: string; en: string };
  description: { da: string; en: string };
  swatches: [string, string, string];
}> = [
  { value: "strawberry", emoji: "🍓", name: { da: "Strawberry", en: "Strawberry" }, description: { da: "Pink, creme og bløde detaljer", en: "Pink, cream and soft details" }, swatches: ["#fff8f8", "#f7d7df", "#b54f69"] },
  { value: "sage", emoji: "🌿", name: { da: "Sage", en: "Sage" }, description: { da: "Salviegrøn, rolig og naturlig", en: "Sage green, calm and natural" }, swatches: ["#fdfbf7", "#dfeae2", "#5b7b6b"] },
  { value: "cloud", emoji: "☁️", name: { da: "Cloud", en: "Cloud" }, description: { da: "Lys, blå og enkel", en: "Light, blue and simple" }, swatches: ["#f7fbff", "#dcecf7", "#4f7895"] },
  { value: "lavender", emoji: "💜", name: { da: "Lavender", en: "Lavender" }, description: { da: "Lavendel og bløde pasteller", en: "Lavender and soft pastels" }, swatches: ["#fdf9ff", "#eadcf3", "#77558b"] },
  { value: "cozy", emoji: "☕", name: { da: "Cozy", en: "Cozy" }, description: { da: "Varm beige og study-look", en: "Warm beige and a study feel" }, swatches: ["#fffaf2", "#eadbc5", "#7a5b43"] },
  { value: "midnight", emoji: "🌙", name: { da: "Midnight", en: "Midnight" }, description: { da: "Mørk, rolig og elegant", en: "Dark, calm and elegant" }, swatches: ["#151827", "#2a3046", "#aab8ef"] },
  { value: "minimal", emoji: "🤍", name: { da: "Minimal", en: "Minimal" }, description: { da: "Neutral og professionel", en: "Neutral and professional" }, swatches: ["#ffffff", "#eef0f2", "#344054"] },
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

function normalize(value: Partial<AppPreferences> | null): AppPreferences {
  const toolbar = Array.isArray(value?.toolbar)
    ? value.toolbar.filter((tool): tool is ToolbarTool => TOOL_OPTIONS.some((item) => item.value === tool))
    : DEFAULT_APP_PREFERENCES.toolbar;
  return {
    aesthetic: AESTHETIC_OPTIONS.some((item) => item.value === value?.aesthetic)
      ? (value?.aesthetic as AestheticChoice)
      : DEFAULT_APP_PREFERENCES.aesthetic,
    decorations: value?.decorations !== false,
    gentleMessages: value?.gentleMessages !== false,
    toolbar: toolbar.length ? toolbar : DEFAULT_APP_PREFERENCES.toolbar,
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
