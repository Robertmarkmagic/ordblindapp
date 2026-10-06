import React from "react";
import { BookOpen, Camera, Highlighter, Mic, NotebookText, PenLine, Search, Settings2, SpellCheck2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface PersonalToolbarProps {
  onRead: () => void;
  onWords: () => void;
  onNotes: () => void;
  onHighlight: () => void;
  onWritingHelp: () => void;
  onSettings: () => void;
  onScan: () => void;
}

export function PersonalToolbar({ onRead, onWords, onNotes, onHighlight, onWritingHelp, onSettings, onScan }: PersonalToolbarProps) {
  const { language } = useLanguage();
  const tools = [
    { id: "read", da: "Læs højt", en: "Read aloud", helpDa: "Ord, sætning eller hele teksten", helpEn: "A word, sentence or the full text", icon: BookOpen, action: onRead },
    { id: "highlight", da: "Marker", en: "Highlight", helpDa: "Fremhæv vigtige steder", helpEn: "Mark important passages", icon: Highlighter, action: onHighlight },
    { id: "dictate", da: "Tal", en: "Dictate", helpDa: "Indtal tekst og noter", helpEn: "Dictate text and notes", icon: Mic, action: onNotes },
    { id: "write", da: "Skrivehjælp", en: "Writing help", helpDa: "Stavning, grammatik og komma", helpEn: "Spelling, grammar and commas", icon: SpellCheck2, action: onWritingHelp },
    { id: "notes", da: "Noter", en: "Notes", helpDa: "Gem tanker ved teksten", helpEn: "Save thoughts beside the text", icon: NotebookText, action: onNotes },
    { id: "dictionary", da: "Ordbog", en: "Dictionary", helpDa: "Betydning, bøjning og udtale", helpEn: "Meaning, inflection and pronunciation", icon: Search, action: onWords },
    { id: "scan", da: "PDF og scan", en: "PDF and scan", helpDa: "Åbn tekst og dokumenter", helpEn: "Open text and documents", icon: Camera, action: onScan },
  ];

  return (
    <nav
      aria-label={language === "da" ? "Din værktøjslinje" : "Your toolbar"}
      className="rr-core-toolbar mb-5 rounded-2xl border border-border bg-white p-3 shadow-paper"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div><b className="text-sm text-black">{language === "da" ? "Værktøjer til teksten" : "Tools for your text"}</b><p className="text-xs text-black/65">{language === "da" ? "Læs, forstå og skriv uden at skifte arbejdsflade." : "Read, understand and write without changing workspace."}</p></div>
        <button type="button" onClick={onSettings} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-black hover:bg-slate-50"><Settings2 className="h-4 w-4" />{language === "da" ? "Indstillinger" : "Settings"}</button>
      </div>
      <div className="rr-core-toolbar-grid">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={tool.action}
            className="rr-core-tool"
          >
            <tool.icon aria-hidden="true" />
            <span><b>{language === "da" ? tool.da : tool.en}</b><small>{language === "da" ? tool.helpDa : tool.helpEn}</small></span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default PersonalToolbar;
