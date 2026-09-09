import React, { useMemo, useState, type CSSProperties } from "react";
import {
  AlignLeft,
  BookOpen,
  Camera,
  Check,
  Folder,
  Mic,
  NotebookText,
  PenLine,
  Play,
  Search,
  Settings,
  Sparkles,
  Type,
  UserCircle,
} from "lucide-react";
import { bionicSplit } from "@/lib/reader-tokens";

const SAMPLE =
  "I ReliefRead bestemmer du selv, hvordan teksten skal se ud. Når skrift, farver og afstand passer til dig, bliver det lettere at læse, forstå og deltage på dine egne præmisser.";

const THEMES = [
  { id: "pinky", emoji: "🍓", label: "Pinky" },
  { id: "ocean", emoji: "🌊", label: "Ocean" },
  { id: "minimal", emoji: "♡", label: "Minimal" },
  { id: "wood", emoji: "🌿", label: "Wood" },
  { id: "night", emoji: "☾", label: "Night Mode" },
] as const;

const NAV_ITEMS = [
  { label: "Læs", icon: BookOpen },
  { label: "Skriv", icon: PenLine },
  { label: "Noter", icon: NotebookText },
  { label: "Spørg Riley", icon: Sparkles },
  { label: "Ordbog", icon: Search },
  { label: "Scan", icon: Camera },
  { label: "Mine filer", icon: Folder },
  { label: "Indstillinger", icon: Settings },
];

const THEME_SURFACES = {
  pinky: { shell: "#fff5f8", panel: "#f9d9e3", workspace: "#fde8ef", toolbar: "#fff0f5", control: "#fff8fa", document: "#ffeef3", documentAlt: "#fff9f1", note: "#f7cfda", ink: "#303746", muted: "#596171", border: "#eebdcb", active: "#efb8ca", button: "#fff8fa", heading: "#e9c5d0" },
  ocean: { shell: "#edf8ff", panel: "#cce8f8", workspace: "#dceffa", toolbar: "#e7f5fd", control: "#f3faff", document: "#e8f5ff", documentAlt: "#fff9ee", note: "#c9e4f4", ink: "#173b70", muted: "#416388", border: "#9ecce7", active: "#9dcef0", button: "#f5fbff", heading: "#cbe3ff" },
  minimal: { shell: "#ffffff", panel: "#f1f2f3", workspace: "#fafafa", toolbar: "#ffffff", control: "#ffffff", document: "#ffffff", documentAlt: "#f7f4ee", note: "#ece9e3", ink: "#252b36", muted: "#5b616b", border: "#d8dce1", active: "#e1e4e8", button: "#ffffff", heading: "#eceff2" },
  wood: { shell: "#f4f7ef", panel: "#d7e3cf", workspace: "#e5ecde", toolbar: "#edf3e8", control: "#f7f9f4", document: "#f0f5eb", documentAlt: "#faf5e9", note: "#cad9bf", ink: "#304a38", muted: "#58705f", border: "#aec5a2", active: "#b9d2ae", button: "#f7faf4", heading: "#d1e3c7" },
  night: { shell: "#16283d", panel: "#1d3651", workspace: "#0f2237", toolbar: "#192f47", control: "#1a3048", document: "#243e59", documentAlt: "#31465b", note: "#304d6d", ink: "#fff0aa", muted: "#d8d2ac", border: "#456b8f", active: "#315c82", button: "#223e5a", heading: "#31577b" },
} as const;

type PreviewStyle = CSSProperties & Record<`--rr-preview-${string}`, string>;

export function MiniReader() {
  const [theme, setTheme] = useState<keyof typeof THEME_SURFACES>("ocean");
  const [dyslexic, setDyslexic] = useState(false);
  const [bionic, setBionic] = useState(false);
  const [softBlue, setSoftBlue] = useState(true);
  const tokens = useMemo(() => SAMPLE.split(/(\s+)/), []);
  const colors = THEME_SURFACES[theme];
  const previewStyle = {
    "--rr-preview-shell": colors.shell,
    "--rr-preview-panel": colors.panel,
    "--rr-preview-workspace": colors.workspace,
    "--rr-preview-toolbar": colors.toolbar,
    "--rr-preview-control": colors.control,
    "--rr-preview-document": colors.document,
    "--rr-preview-note": colors.note,
    "--rr-preview-ink": colors.ink,
    "--rr-preview-muted": colors.muted,
    "--rr-preview-border": colors.border,
    "--rr-preview-active": colors.active,
    "--rr-preview-button": colors.button,
    "--rr-preview-heading": colors.heading,
  } as PreviewStyle;

  return (
    <div className="rr-landing-demo">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Vælg et tema">
        {THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTheme(item.id)}
            aria-pressed={theme === item.id}
            className={`rr-landing-theme-choice rr-landing-theme-${item.id} ${theme === item.id ? "is-active" : ""}`}
          >
            <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
            <span>{item.label}</span>
            {theme === item.id && <Check className="absolute right-2 top-2 h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="rr-landing-themed-preview mt-4" data-preview-theme={theme} style={previewStyle}>
      <div className="rr-landing-reader-window">
        <div className="rr-landing-windowbar">
          <div className="flex gap-1.5" aria-hidden="true"><span className="bg-pink-300" /><span className="bg-amber-300" /><span className="bg-emerald-400" /></div>
          <div className="flex items-center gap-2 text-xs font-bold"><UserCircle className="h-5 w-5" />Min profil</div>
        </div>
        <div className="flex">
          <aside className="rr-landing-reader-nav" aria-label="Eksempel på appmenu">
            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-bold"><span className="text-lg">🌊</span>Min læseplads</div>
            {NAV_ITEMS.map(({ label, icon: Icon }, index) => (
              <div key={label} className={`rr-landing-nav-row ${index === 0 || index === 3 ? "is-active" : ""}`}><Icon />{label}</div>
            ))}
          </aside>
          <div className="min-w-0 flex-1">
            <div className="rr-landing-reader-tools">
              <button type="button" aria-label="Læs teksten"><Play className="fill-current" /></button>
              <span>1.0x</span><span>🌐 Dansk</span><span>👂</span><span>Aa</span><span><Mic /></span><span><BookOpen /></span>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:p-5">
              <div className="rr-landing-document rounded-xl p-4 shadow-sm sm:p-6" style={{ backgroundColor: softBlue ? colors.document : colors.documentAlt }}>
                <h3 className="rr-landing-document-title inline rounded-md px-2 py-1 font-display text-lg font-bold sm:text-2xl">Kapitel 1. Introduktion</h3>
                <p className="mt-4 text-sm sm:text-base" style={{ fontFamily: dyslexic ? "OpenDyslexic, Lexend, sans-serif" : "Lexend, sans-serif", lineHeight: 1.9, letterSpacing: dyslexic ? ".02em" : undefined }}>
                  {tokens.map((token, index) => {
                    if (/^\s+$/.test(token) || !bionic) return <span key={index}>{token}</span>;
                    const { bold, rest } = bionicSplit(token);
                    return <span key={index}><b>{bold}</b>{rest}</span>;
                  })}
                </p>
              </div>
              <div className="rr-landing-note">
                <b>Mine noter</b>
                <p>Vigtigt!</p>
                <p>Spørg om et eksempel</p>
                <p>Find mere information</p>
                <span aria-hidden="true">♡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rr-landing-control-card">
          <strong>Skrifttype</strong>
          <button type="button" onClick={() => setDyslexic((value) => !value)} aria-pressed={dyslexic} className={dyslexic ? "is-active" : ""}><Type />OpenDyslexic</button>
          <button type="button" onClick={() => setBionic((value) => !value)} aria-pressed={bionic} className={bionic ? "is-active" : ""}><AlignLeft />Bionic Reading</button>
        </div>
        <div className="rr-landing-control-card">
          <strong>Baggrund</strong>
          <button type="button" onClick={() => setSoftBlue(false)} aria-pressed={!softBlue} className={!softBlue ? "is-active" : ""}><span className="h-5 w-5 rounded-full bg-[#fffaf0]" />Creme</button>
          <button type="button" onClick={() => setSoftBlue(true)} aria-pressed={softBlue} className={softBlue ? "is-active" : ""}><span className="h-5 w-5 rounded-full bg-[#d9edff]" />Ocean</button>
        </div>
        <div className="rr-landing-control-card">
          <strong>Dine værktøjer</strong>
          <div className="flex gap-2 pt-2 text-xl" aria-label="Eksempel på værktøjer"><span>▶️</span><span>🩷</span><span>✨</span><span>🎙️</span><span>📝</span></div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default MiniReader;
