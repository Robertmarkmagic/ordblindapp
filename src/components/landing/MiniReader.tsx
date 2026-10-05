import React, { type CSSProperties } from "react";
import { BookOpen, Camera, CheckCheck, FileText, Folder, Highlighter, Mic, NotebookText, PenLine, Play, Search, Settings, Sparkles, Type, UserCircle, Volume2 } from "lucide-react";
import type { PersonalisationPreview } from "@/components/landing/PersonalisationShowcase";
import { useLanguage } from "@/lib/i18n";

const SAMPLE = "I ReliefRead bestemmer du selv, hvordan teksten skal se ud. Når skrift, farver og afstand passer til dig, bliver det lettere at læse, forstå og deltage på dine egne præmisser.";

const APP_ICONS = { minimal: "♡", pinky: "🍓", wood: "🌿", ocean: "🌊", night: "☾", unicorn: "🦄", dino: "🦕" } as const;

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
  minimal: { shell: "#ffffff", panel: "#f7f7f7", workspace: "#ffffff", toolbar: "#ffffff", control: "#ffffff", document: "#ffffff", ink: "#171717", muted: "#595959", border: "#dedede", active: "#eeeeee", button: "#ffffff", heading: "#f1f1f1" },
  wood: { shell: "#f4f7ef", panel: "#d7e3cf", workspace: "#e5ecde", toolbar: "#edf3e8", control: "#f7f9f4", document: "#f0f5eb", ink: "#304a38", muted: "#58705f", border: "#aec5a2", active: "#b9d2ae", button: "#f7faf4", heading: "#d1e3c7" },
  night: { shell: "#050505", panel: "#111111", workspace: "#000000", toolbar: "#090909", control: "#111111", document: "#0b0b0b", ink: "#ffffff", muted: "#c8c8c8", border: "#353535", active: "#252525", button: "#151515", heading: "#242424" },
  unicorn: { shell: "#fff6fd", panel: "#f9dff1", workspace: "#e8f5ff", toolbar: "#fff3fb", control: "#fff9fd", document: "#fffafd", ink: "#513b72", muted: "#796a8f", border: "#e9bfdc", active: "#f4cfea", button: "#ffffff", heading: "#ffe2f4" },
  dino: { shell: "#f7fbf1", panel: "#dcefc9", workspace: "#edf5df", toolbar: "#f2f8ea", control: "#fbfdf8", document: "#fcfdf9", ink: "#244a2d", muted: "#58705f", border: "#b7cea7", active: "#c9e2b5", button: "#ffffff", heading: "#e0efcf" },
} as const;

const NOTE_SURFACES = {
  minimal: { background: "#efe7da", color: "#171717" },
  pinky: { background: "#f3a7c1", color: "#171717" },
  wood: { background: "#cbdab9", color: "#273d2e" },
  ocean: { background: "#c7e8f8", color: "#173b70" },
  night: { background: "#050505", color: "#ffffff" },
  unicorn: { background: "linear-gradient(145deg, #ffdff1, #d9eeff 52%, #fff1bd)", color: "#513b72" },
  dino: { background: "linear-gradient(145deg, #dcefc9, #b9dca8 55%, #f2df9d)", color: "#244a2d" },
} as const;

type PreviewStyle = CSSProperties & Record<`--rr-preview-${string}`, string>;

export function MiniReader({ settings }: { settings: PersonalisationPreview }) {
  const { language } = useLanguage();
  const en = language === "en";
  const tr = (da: string, english: string) => en ? english : da;
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
            <div className="flex items-center gap-2 text-sm font-bold"><UserCircle className="h-5 w-5" />{tr("Min profil", "My profile")}</div>
          </div>

          <div className="rr-landing-app-body">
            <aside className="rr-landing-reader-nav" aria-label={tr("Eksempel på appmenu", "Example app menu")}>
              <div className="rr-landing-space-name"><span aria-hidden="true">{APP_ICONS[settings.color]}</span>{tr("Min læseplads", "My reading space")}</div>
              {enabledNav.map(({ id, label, icon: Icon }, index) => (
                <div key={id} className={`rr-landing-nav-row ${index === 0 ? "is-active" : ""}`}><Icon />{en ? ({ read: "Read", write: "Write", notes: "Notes", dictionary: "Dictionary", scan: "Scan" } as Record<string, string>)[id] : label}</div>
              ))}
              <div className="rr-landing-nav-row"><Folder />{tr("Mine filer", "My files")}</div>
              <div className="rr-landing-nav-row"><Settings />{tr("Indstillinger", "Settings")}</div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="rr-landing-reader-tools" aria-label={tr("Dine valgte værktøjer", "Your selected tools")}>
                {enabledTools.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" aria-label={label}><Icon className={id === "read" ? "fill-current" : ""} /><span>{en ? ({ read: "Read", mark: "Highlight", voice: "Speak", write: "Write", notes: "Notes", dictionary: "Dictionary", scan: "Scan" } as Record<string, string>)[id] : label}</span></button>
                ))}
              </div>

              <div className="rr-landing-workspace">
                <div className="rr-landing-document">
                  <div className="rr-landing-document-topline"><span>{tr("Prøvetekst", "Sample text")}</span><span><Type />Aa</span></div>
                  <h3 className="rr-landing-document-title">{tr("Kapitel 1. Introduktion", "Chapter 1. Introduction")}</h3>
                  <p>{tr(SAMPLE.split("egne præmisser")[0], "In ReliefRead, you choose how text should look. When the font, colours and spacing suit you, it becomes easier to read, understand and participate on ")}<mark>{tr("egne præmisser", "your own terms")}</mark>.</p>
                  <div className="rr-landing-reading-actions">
                    <button type="button"><Volume2 />{tr("Læs højt", "Read aloud")}</button>
                    <button type="button"><Highlighter />{tr("Marker", "Highlight")}</button>
                  </div>
                </div>

                <aside className={`rr-landing-note rr-landing-note-${settings.notebookTheme}`} style={{ background: note.background, color: note.color }}>
                  {settings.sticker && <span className="rr-landing-note-sticker" aria-hidden="true">{settings.sticker}</span>}
                  <b>{tr("Mine noter", "My notes")}</b>
                  <textarea defaultValue={tr("Vigtigt!\nSpørg om et eksempel\nFind mere information", "Important!\nAsk for an example\nFind more information")} aria-label={tr("Eksempel på note", "Example note")} />
                  <span aria-hidden="true">♡</span>
                </aside>
              </div>

              <div className="rr-landing-feature-row">
                <div><Volume2 /><span><b>{tr("Oplæsning", "Read aloud")}</b><small>{tr("Læs ord, sætninger eller hele teksten højt", "Read words, sentences or the entire text aloud")}</small></span></div>
                <div><Mic /><span><b>{tr("Tale-til-tekst", "Speech to text")}</b><small>{tr("Indtal dine tanker direkte i skrivefeltet", "Dictate your thoughts directly into the writing field")}</small></span></div>
                <div><PenLine /><span><b>{tr("Skrivehjælp", "Writing support")}</b><small>{tr("Kontekstbaserede ord- og sætningsforslag", "Context-aware word and sentence suggestions")}</small></span></div>
                <div><CheckCheck /><span><b>{tr("Grammatik og komma", "Grammar and punctuation")}</b><small>{tr("Stavning, ordklasser, komma og tegnsætning", "Spelling, word classes, commas and punctuation")}</small></span></div>
                <div><Search /><span><b>{tr("Ordbog", "Dictionary")}</b><small>{tr("Betydning, bøjning, oversættelse og udtale", "Meaning, inflection, translation and pronunciation")}</small></span></div>
                <div><FileText /><span><b>{tr("PDF, scan og noter", "PDF, scan and notes")}</b><small>{tr("Arbejd med dokumenter, billeder og egne noter", "Work with documents, images and your own notes")}</small></span></div>
              </div>
            </div>
          </div>

          <button type="button" className="rr-landing-riley" aria-label={tr("Åbn Riley", "Open Riley")}><Sparkles /><span>Riley</span></button>
        </div>
      </div>
    </div>
  );
}

export default MiniReader;
