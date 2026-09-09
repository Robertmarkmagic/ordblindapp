import React, { useMemo, useState } from "react";
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
  pinky: { shell: "#fff0f4", panel: "#ffe0e9", ink: "#304a38" },
  ocean: { shell: "#eff9ff", panel: "#d9effc", ink: "#173b70" },
  minimal: { shell: "#ffffff", panel: "#f2f3f5", ink: "#25334a" },
  wood: { shell: "#f3f6ed", panel: "#dfe9d8", ink: "#304a38" },
  night: { shell: "#172941", panel: "#243c5b", ink: "#f5f8ff" },
} as const;

export function MiniReader() {
  const [theme, setTheme] = useState<keyof typeof THEME_SURFACES>("ocean");
  const [dyslexic, setDyslexic] = useState(false);
  const [bionic, setBionic] = useState(false);
  const [softBlue, setSoftBlue] = useState(true);
  const tokens = useMemo(() => SAMPLE.split(/(\s+)/), []);
  const colors = THEME_SURFACES[theme];

  return (
    <div className="rr-landing-demo" style={{ color: colors.ink }}>
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

      <div className="rr-landing-reader-window mt-4" style={{ backgroundColor: colors.shell }}>
        <div className="rr-landing-windowbar">
          <div className="flex gap-1.5" aria-hidden="true"><span className="bg-pink-300" /><span className="bg-amber-300" /><span className="bg-emerald-400" /></div>
          <div className="flex items-center gap-2 text-xs font-bold"><UserCircle className="h-5 w-5" />Min profil</div>
        </div>
        <div className="flex">
          <aside className="rr-landing-reader-nav" style={{ backgroundColor: colors.panel }} aria-label="Eksempel på appmenu">
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
              <div className="rounded-xl border border-white/70 p-4 shadow-sm sm:p-6" style={{ backgroundColor: softBlue ? "#eaf6ff" : "#fffaf0" }}>
                <h3 className="inline rounded-md bg-blue-100 px-2 py-1 font-display text-lg font-bold text-blue-800 sm:text-2xl">Kapitel 1. Introduktion</h3>
                <p className="mt-4 text-sm sm:text-base" style={{ fontFamily: dyslexic ? "OpenDyslexic, Lexend, sans-serif" : "Lexend, sans-serif", lineHeight: 1.9, letterSpacing: dyslexic ? ".02em" : undefined, color: "#1e3a66" }}>
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
  );
}

export default MiniReader;
