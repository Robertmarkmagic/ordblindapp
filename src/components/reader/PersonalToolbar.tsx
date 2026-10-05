import React from "react";
import { Settings2 } from "lucide-react";
import { TOOL_OPTIONS, type ToolbarTool } from "@/lib/app-preferences";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useLanguage } from "@/lib/i18n";

interface PersonalToolbarProps {
  onRead: () => void;
  onWords: () => void;
  onNotes: () => void;
  onHighlight: () => void;
  onWritingHelp: () => void;
  onSettings: () => void;
}

const RILEY_PROMPTS: Partial<Record<ToolbarTool, { da: string; en: string }>> = {
  spelling: {
    da: "Kontroller kun stavningen i den tekst, jeg markerer eller indsætter.",
    en: "Check spelling only in the text I select or paste.",
  },
  grammar: {
    da: "Kontroller grammatikken. Bevar min tone og mine formuleringer.",
    en: "Check the grammar. Keep my tone and wording.",
  },
  comma: {
    da: "Kontroller kun kommaerne og forklar kort dine forslag.",
    en: "Check commas only and briefly explain your suggestions.",
  },
};

export function PersonalToolbar({ onRead, onWords, onNotes, onHighlight, onWritingHelp, onSettings }: PersonalToolbarProps) {
  const { preferences } = useAppPreferences();
  const { language } = useLanguage();

  const run = (tool: ToolbarTool) => {
    if (tool === "read") return onRead();
    if (tool === "words") return onWords();
    if (tool === "dictate") return onNotes();
    if (tool === "highlight") return onHighlight();
    if (RILEY_PROMPTS[tool]) return onWritingHelp();
  };

  const selected = TOOL_OPTIONS.filter((tool) => preferences.toolbar.includes(tool.value));

  return (
    <nav
      aria-label={language === "da" ? "Din værktøjslinje" : "Your toolbar"}
      className="mb-5 overflow-x-auto rounded-2xl border border-border bg-card/90 p-2 shadow-paper backdrop-blur"
    >
      <div className="flex min-w-max items-center gap-1.5">
        {selected.map((tool) => (
          <button
            key={tool.value}
            type="button"
            onClick={() => run(tool.value)}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">{tool.emoji}</span>
            {tool.label[language]}
          </button>
        ))}
        <button
          type="button"
          onClick={onSettings}
          className="ml-1 flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {language === "da" ? "Flere værktøjer" : "More tools"}
        </button>
      </div>
    </nav>
  );
}

export default PersonalToolbar;
