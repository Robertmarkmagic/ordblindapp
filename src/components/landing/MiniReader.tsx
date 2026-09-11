import React, { type CSSProperties } from "react";
import { BookOpen, Camera, Folder, Highlighter, Mic, NotebookText, PenLine, Play, Search, Settings, Sparkles, Type, UserCircle, Volume2 } from "lucide-react";
import type { PersonalisationPreview } from "@/components/landing/PersonalisationShowcase";

const SAMPLE = "I ReliefRead bestemmer du selv, hvordan teksten skal se ud. Når skrift, farver og afstand passer til dig, bliver det lettere at læse, forstå og deltage på dine egne præmisser.";

const APP_ICONS = { minimal: "♡", pinky: "🍓", wood: "🌿", ocean: "🌊", night: "☾" } as const;

const TOOL_ITEMS = [
  { id: "read", label: "Læs", icon: Play },
  { id: "mark", label: "Marker", icon: Highlighter },
  { id: "voice", label: "Tal", icon: Mic },
  { id: "write", label: "Skriv", icon: PenLine },
  { id: "notes", label: "Noter", icon: NotebookText },
  { id: "dictionary", label: "Ordbog", icon: Search },
  { id: "scan", label: "Scan", icon: Camera },
] as const;

const NAV_ITEMS = [
  { id: "read", label: "Læs", icon: BookOpen },
  { id: "write", label: "Skriv", icon: PenLine },
  { id: "notes", label: "Noter", icon: NotebookText },
  { id: "dictionary", label: "Ordbog", icon: Search },
  { id: "scan", label: "Scan", icon: Camera },
] as const;

const THEME_SURFACES = {
  pinky: { shell: "#fff5f8", panel: "#f9d9e3", workspace: "#fde8ef", toolbar: "#fff0f5", control: "#fff8fa", document: "#ffeef3", ink: "#303746", muted: "#596171", border: "#eebdcb", active: "#efb8ca", button: "#fff8fa", heading: "#e9c5d0" },
  ocean: { shell: "#edf8ff", panel: "#cce8f8", workspace: "#dceffa", toolbar: "#e7f5fd", control: "#f3faff", document: "#e8f5ff", ink: "#173b70", muted: "#416388", border: "#9ecce7", active: "#9dcef0", button: "#f5fbff", heading: "#cbe3ff" },
  minimal: { shell: "#f8f1e6", panel: "#efe7da", workspace: "#f5efe5", toolbar: "#fbf7f0", control: "#fffaf3", document: "#fffaf3", ink: "#171717", muted: "#59534b", border: "#d8cec0", active: "#e7dccd", button: "#fffaf3", heading: "#eee5d8" },
  wood: { shell: "#f4f7ef", panel: "#d7e3cf", workspace: "#e5ecde", toolbar: "#edf3e8", control: "#f7f9f4", document: "#f0f5eb", ink: "#304a38", muted: "#58705f", border: "#aec5a2", active: "#b9d2ae", button: "#f7faf4", heading: "#d1e3c7" },
  night: { shell: "#16283d", panel: "#1d3651", workspace: "#0f2237", toolbar: "#192f47", control: "#1a3048", document: "#243e59", ink: "#fff0aa", muted: "#d8d2ac", border: "#456b8f", active: "#315c82", button: "#223e5a", heading: "#31577b" },
} as const;

const NOTE_SURFACES = {
  minimal: { background: "#efe7da", color: "#171717" },
  pinky: { background: "#f3a7c1", color: "#171717" },
  wood: { background: "#cbdab9", color: "#273d2e" },
  ocean: { background: "#244a76", color: "#fff1ad" },
  night: { background: "#304d6d", color: "#fff1ad" },
} as const;

type PreviewStyle = CSSProperties & Record<`--rr-preview-${string}`, string>;

export function MiniReader({ settings }: { settings: PersonalisationPreview }) {
  const colors = THEME_SURFACES[settings.color];
  const note = NOTE_SURFACES[settings.notebookTheme];
  const enabledTools = TOOL_ITEMS.filter((item) => settings.tools.includes(item.id));
  const enabledNav = NAV_ITEMS.filter((item) => settings.tools.includes(item.id));
  const previewStyle = {
    "--rr-preview-shell": colors.shell,
    "--rr-preview-panel": colors.panel,
    "--rr-preview-workspace": colors.workspace,
    "--rr-preview-toolbar": colors.toolbar,
    "--rr-preview-control": colors.control,
    "--rr-preview-document": colors.document,
    "--rr-preview-note": note.background,
    "--rr-preview-note-ink": note.color,
    "--rr-preview-ink": colors.ink,
    "--rr-preview-muted": colors.muted,
    "--rr-preview-border": colors.border,
    "--rr-preview-active": colors.active,
    "--rr-preview-button": colors.button,
    "--rr-preview-heading": colors.heading,
    "--rr-preview-title": settings.textColor,
    "--rr-preview-highlight": settings.highlight,
  } as PreviewStyle;

  return (
    <div className="rr-landing-demo rr-landing-demo-app" style={previewStyle}>
      <div className="rr-landing-themed-preview" data-preview-theme={settings.color}>
        <div className="rr-landing-reader-window">
          <div className="rr-landing-windowbar">
            <div className="rr-landing-brand"><span aria-hidden="true">{APP_ICONS[settings.color]}</span><b>ReliefRead</b></div>
            <div className="flex items-center gap-2 text-sm font-bold"><UserCircle className="h-5 w-5" />Min profil</div>
          </div>

          <div className="rr-landing-app-body">
            <aside className="rr-landing-reader-nav" aria-label="Eksempel på appmenu">
              <div className="rr-landing-space-name"><span aria-hidden="true">{APP_ICONS[settings.color]}</span>Min læseplads</div>
              {enabledNav.map(({ id, label, icon: Icon }, index) => (
                <div key={id} className={`rr-landing-nav-row ${index === 0 ? "is-active" : ""}`}><Icon />{label}</div>
              ))}
              <div className="rr-landing-nav-row"><Folder />Mine filer</div>
              <div className="rr-landing-nav-row"><Settings />Indstillinger</div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="rr-landing-reader-tools" aria-label="Dine valgte værktøjer">
                {enabledTools.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" aria-label={label}><Icon className={id === "read" ? "fill-current" : ""} /><span>{label}</span></button>
                ))}
              </div>

              <div className="rr-landing-workspace">
                <div className="rr-landing-document">
                  <div className="rr-landing-document-topline"><span>Prøvetekst</span><span><Type />Aa</span></div>
                  <h3 className="rr-landing-document-title">Kapitel 1. Introduktion</h3>
                  <p>{SAMPLE.split("egne præmisser")[0]}<mark>egne præmisser</mark>.</p>
                  <div className="rr-landing-reading-actions">
                    <button type="button"><Volume2 />Læs højt</button>
                    <button type="button"><Highlighter />Marker</button>
                  </div>
                </div>

                <aside className="rr-landing-note" style={{ backgroundColor: note.background, color: note.color }}>
                  <span className="rr-landing-note-sticker" aria-hidden="true">{settings.sticker}</span>
                  <b>Mine noter</b>
                  <textarea defaultValue={"Vigtigt!\nSpørg om et eksempel\nFind mere information"} aria-label="Eksempel på note" />
                  <span aria-hidden="true">♡</span>
                </aside>
              </div>

              <div className="rr-landing-feature-row">
                <div><PenLine /><span><b>Skrivehjælp</b><small>Stavning, grammatik, komma og ordforslag</small></span></div>
                <div><Search /><span><b>Ordbog</b><small>Betydning, bøjning, oversættelse og udtale</small></span></div>
                <div><Camera /><span><b>Scan tekst</b><small>Tag et billede og få teksten gjort læsbar</small></span></div>
              </div>
            </div>
          </div>

          <button type="button" className="rr-landing-riley" aria-label="Åbn Riley"><Sparkles /><span>Riley</span></button>
        </div>
      </div>
    </div>
  );
}

export default MiniReader;
