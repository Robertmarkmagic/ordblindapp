import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Camera, Check, Highlighter, Mic, NotebookText, PenLine, Play, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const TOOLS = [
  { id: "read", label: "Læs", icon: Play },
  { id: "mark", label: "Marker", icon: Highlighter },
  { id: "voice", label: "Tal", icon: Mic },
  { id: "write", label: "Skriv", icon: PenLine },
  { id: "notes", label: "Noter", icon: NotebookText },
  { id: "scan", label: "Scan", icon: Camera },
  { id: "dictionary", label: "Ordbog", icon: Search },
] as const;

const COLOR_CHOICES = [
  { id: "minimal", emoji: "🤍", label: "Hvid" },
  { id: "ocean", emoji: "🌊", label: "Ocean" },
  { id: "night", emoji: "☾", label: "Night Mode" },
] as const;

const CHILD_NOTEBOOKS = [
  { id: "unicorn", emoji: "🦄", label: "Glimmer-magi" },
  { id: "dino", emoji: "🦕", label: "Dino" },
] as const;

const APP_COLOR_CHOICES = [...COLOR_CHOICES, ...CHILD_NOTEBOOKS] as const;
const NOTEBOOK_CHOICES = [...COLOR_CHOICES, ...CHILD_NOTEBOOKS] as const;
const ADULT_STICKERS = [
  { value: "", label: "Ingen", icon: "×" },
  { value: "✦", label: "Stjerne", icon: "✦" },
  { value: "♡", label: "Hjerte", icon: "♡" },
  { value: "📖", label: "Bog", icon: "📖" },
  { value: "☕", label: "Kaffe", icon: "☕" },
  { value: "🍃", label: "Blad", icon: "🍃" },
] as const;
const TEEN_STICKERS = [
  { value: "", label: "Ingen", icon: "×" },
  { value: "🐚", label: "Musling", icon: "🐚" },
  { value: "🍋", label: "Citron", icon: "🍋" },
  { value: "🌺", label: "Blomst", icon: "🌺" },
  { value: "🍓", label: "Jordbær", icon: "🍓" },
  { value: "✨", label: "Glimmer", icon: "✨" },
] as const;
const CHILD_STICKERS = [
  { value: "", label: "Ingen", icon: "×" },
  { value: "🦕", label: "Dinosaur", icon: "🦕" },
  { value: "🦄", label: "Enhjørning", icon: "🦄" },
  { value: "🌈", label: "Regnbue", icon: "🌈" },
  { value: "🚀", label: "Rumraket", icon: "🚀" },
  { value: "🪐", label: "Planet", icon: "🪐" },
] as const;
const HIGHLIGHTS = ["#ffe868", "#63dce9", "#f58bd3", "#bd8cf2", "#82d78f", "#ff8179"];
export type PersonalisationPreview = {
  tools: string[];
  color: (typeof APP_COLOR_CHOICES)[number]["id"];
  notebookTheme: (typeof NOTEBOOK_CHOICES)[number]["id"];
  sticker: string;
  highlight: string;
  textColor: "#171717" | "#ffffff";
};

export const DEFAULT_PERSONALISATION: PersonalisationPreview = {
  tools: ["read", "mark", "voice", "write", "notes", "scan", "dictionary"],
  color: "ocean",
  notebookTheme: "minimal",
  sticker: "🍓",
  highlight: HIGHLIGHTS[0],
  textColor: "#171717",
};

export function PersonalisationShowcase({ onChange }: { onChange?: (value: PersonalisationPreview) => void }) {
  const { language } = useLanguage();
  const en = language === "en";
  const tr = (da: string, english: string) => en ? english : da;
  const [tools, setTools] = useState(() => new Set(DEFAULT_PERSONALISATION.tools));
  const [color, setColor] = useState<(typeof APP_COLOR_CHOICES)[number]["id"]>("ocean");
  const [notebookTheme, setNotebookTheme] = useState<(typeof NOTEBOOK_CHOICES)[number]["id"]>("minimal");
  const [sticker, setSticker] = useState("🍓");
  const [appMode, setAppMode] = useState<"adult" | "child">("adult");
  const [notebookMode, setNotebookMode] = useState<"adult" | "child">("adult");
  const [stickerMode, setStickerMode] = useState<"adult" | "teen" | "child">("teen");
  const [highlight, setHighlight] = useState(HIGHLIGHTS[0]);
  const selectedNote = useMemo(() => NOTEBOOK_CHOICES.find((item) => item.id === notebookTheme) ?? COLOR_CHOICES[1], [notebookTheme]);
  const visibleColors = appMode === "child" ? CHILD_NOTEBOOKS : COLOR_CHOICES;
  const visibleNotebooks = notebookMode === "child" ? CHILD_NOTEBOOKS : COLOR_CHOICES;
  const visibleStickers = stickerMode === "child" ? CHILD_STICKERS : stickerMode === "teen" ? TEEN_STICKERS : ADULT_STICKERS;

  useEffect(() => {
    onChange?.({ tools: [...tools], color, notebookTheme, sticker, highlight, textColor: color === "night" ? "#ffffff" : "#171717" });
  }, [color, highlight, notebookTheme, onChange, sticker, tools]);

  const toggleTool = (id: string) => {
    setTools((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectColor = (nextColor: (typeof APP_COLOR_CHOICES)[number]["id"]) => {
    setColor(nextColor);
  };

  const selectAppMode = (mode: "adult" | "child") => {
    setAppMode(mode);
    if (mode === "child" && color !== "unicorn" && color !== "dino") setColor("unicorn");
    if (mode === "adult" && (color === "unicorn" || color === "dino")) setColor("ocean");
  };

  const selectNotebookMode = (mode: "adult" | "child") => {
    setNotebookMode(mode);
    if (mode === "child" && notebookTheme !== "unicorn" && notebookTheme !== "dino") setNotebookTheme("unicorn");
    if (mode === "adult" && (notebookTheme === "unicorn" || notebookTheme === "dino")) setNotebookTheme("minimal");
  };

  const selectStickerMode = (mode: "adult" | "teen" | "child") => {
    setStickerMode(mode);
    setSticker("");
  };

  return (
    <div
      className={`rr-setup-showcase rr-setup-app-${color}`}
      style={{ "--rr-selected-text": color === "night" ? "#ffffff" : "#171717" } as CSSProperties}
    >
      <header className="rr-setup-heading">
        <h1>{tr("Gør det til dit eget", "Make it yours")}</h1>
        <p className="rr-setup-lead">{tr("Ikke alle læser bedst på samme måde.", "Not everyone reads best in the same way.")}</p>
        <p>{tr("Derfor bestemmer du selv, hvordan dit læse- og skriveværktøj skal se ud og fungere.", "You decide how your reading and writing tools should look and work.")}</p>
        <span className="rr-setup-handnote" aria-hidden="true">{tr("Samme", "Same")}<br />{tr("funktioner.", "tools.")}<br />{tr("Din stil.", "Your style.")} ♡</span>
      </header>

      <section className="rr-setup-toolbox" aria-labelledby="setup-tools-title">
        <h2 id="setup-tools-title">{tr("Vælg dine værktøjer", "Choose your tools")}</h2>
        <div className="rr-setup-tool-grid">
          {TOOLS.map(({ id, label, icon: Icon }) => {
            const active = tools.has(id);
            return (
              <button key={id} type="button" onClick={() => toggleTool(id)} aria-pressed={active} className="rr-setup-tool">
                <span><Icon className={id === "read" ? "fill-current" : ""} />{active && <Check className="rr-setup-check" />}</span>
                {en ? ({ read: "Read", mark: "Highlight", voice: "Speak", write: "Write", notes: "Notes", scan: "Scan", dictionary: "Dictionary" } as Record<string, string>)[id] : label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-color-title">
        <h2 id="setup-color-title">{tr("Vælg appens farve", "Choose the app colour")}</h2>
        <div className="rr-setup-mode-switch" role="group" aria-label={tr("Vælg voksen- eller børnefarver", "Choose adult or child colours")}>
          <button type="button" onClick={() => selectAppMode("adult")} aria-pressed={appMode === "adult"}>{tr("Voksen", "Adult")}</button>
          <button type="button" onClick={() => selectAppMode("child")} aria-pressed={appMode === "child"}>{tr("Barn", "Child")}</button>
        </div>
        <div className="rr-setup-color-grid">
          {visibleColors.map((item) => (
            <button key={item.id} type="button" onClick={() => selectColor(item.id)} aria-pressed={color === item.id} className={`rr-setup-color rr-setup-color-${item.id} ${color === item.id ? "is-active" : ""}`}>
              <span aria-hidden="true">{item.emoji}</span>{en ? ({ minimal: "White", ocean: "Ocean", night: "Night Mode", unicorn: "Glitter magic", dino: "Dino" } as Record<string, string>)[item.id] : item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-notepad-title">
        <h2 id="setup-notepad-title">{tr("Vælg notesbog", "Choose a notebook")}</h2>
        <div className="rr-setup-mode-switch" role="group" aria-label={tr("Vælg voksen- eller børneunivers", "Choose an adult or child style")}>
          <button type="button" onClick={() => selectNotebookMode("adult")} aria-pressed={notebookMode === "adult"}>{tr("Voksen", "Adult")}</button>
          <button type="button" onClick={() => selectNotebookMode("child")} aria-pressed={notebookMode === "child"}>{tr("Barn", "Child")}</button>
        </div>
        <div className="rr-setup-notes-grid">
          {visibleNotebooks.map((item) => (
            <button key={item.id} type="button" onClick={() => setNotebookTheme(item.id)} aria-pressed={notebookTheme === item.id} className={`rr-setup-note rr-setup-note-${item.id} ${notebookTheme === item.id ? "is-active" : ""}`}>
              <span aria-hidden="true">{item.emoji}</span><b>{en ? ({ minimal: "White", ocean: "Ocean", night: "Night Mode", unicorn: "Glitter magic", dino: "Dino" } as Record<string, string>)[item.id] : item.label}</b><small aria-hidden="true">{item.id === "unicorn" ? "✦" : item.id === "dino" ? "🌿" : "♡"}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-sticker-title">
        <h2 id="setup-sticker-title">{tr("Tilføj stickers", "Add stickers")}</h2>
        <div className="rr-setup-mode-switch" role="group" aria-label={tr("Vælg stickers til voksne, teenagere eller børn", "Choose stickers for adults, teenagers or children")}>
          <button type="button" onClick={() => selectStickerMode("adult")} aria-pressed={stickerMode === "adult"}>{tr("Voksen", "Adult")}</button>
          <button type="button" onClick={() => selectStickerMode("teen")} aria-pressed={stickerMode === "teen"}>{tr("Teenager", "Teen")}</button>
          <button type="button" onClick={() => selectStickerMode("child")} aria-pressed={stickerMode === "child"}>{tr("Barn", "Child")}</button>
        </div>
        <div className="rr-setup-stickers">
          {visibleStickers.map((item) => <button key={item.label} type="button" onClick={() => setSticker(item.value)} aria-pressed={sticker === item.value} aria-label={item.label} className={item.value ? "" : "is-none"}>{item.icon}<small>{en ? ({ Ingen: "None", Stjerne: "Star", Hjerte: "Heart", Bog: "Book", Kaffe: "Coffee", Blad: "Leaf", Musling: "Shell", Citron: "Lemon", Blomst: "Flower", Jordbær: "Strawberry", Glimmer: "Sparkle", Dinosaur: "Dinosaur", Enhjørning: "Unicorn", Regnbue: "Rainbow", Rumraket: "Rocket", Planet: "Planet" } as Record<string, string>)[item.label] : item.label}</small></button>)}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-highlight-title">
        <h2 id="setup-highlight-title">{tr("Highlighterfarver", "Highlighter colours")}</h2>
        <div className="rr-setup-highlights">
          {HIGHLIGHTS.map((item) => <button key={item} type="button" onClick={() => setHighlight(item)} aria-pressed={highlight === item} style={{ backgroundColor: item }} aria-label={`${tr("Vælg highlighterfarven", "Choose highlighter colour")} ${item}`} />)}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-example-title">
        <h2 id="setup-example-title">{tr("Se dine valg", "See your choices")}</h2>
        <div className={`rr-setup-reading-example rr-setup-reading-${selectedNote.id}`}>
          <article>
            <h3>{tr("Kapitel 1. Introduktion", "Chapter 1. Introduction")}</h3>
            <p>{tr("I dette kapitel ser vi på, hvordan ", "In this chapter, we explore how ")}<mark style={{ backgroundColor: highlight }}>{tr("teknologi", "technology")}</mark>{tr(" kan gøre hverdagen lettere for alle. Når vi tilpasser værktøjerne til den enkelte, bliver det muligt at lære, arbejde og deltage på ", " can make everyday life easier for everyone. When tools adapt to the individual, people can learn, work and participate on ")}<mark style={{ backgroundColor: highlight }}>{tr("egne præmisser", "their own terms")}</mark>.</p>
          </article>
          <aside>
            {sticker && <span className="rr-setup-note-sticker" aria-hidden="true">{sticker}</span>}
            <h3>{tr("Vigtige punkter:", "Key points:")}</h3>
            <p>• {tr("Læs færdig", "Finish reading")}<br />• {tr("Skriv noter", "Write notes")}<br />• {tr("Spørg AI", "Ask AI")}</p>
            <span className="rr-setup-note-heart" aria-hidden="true">♡</span>
          </aside>
        </div>
      </section>

    </div>
  );
}

export default PersonalisationShowcase;
