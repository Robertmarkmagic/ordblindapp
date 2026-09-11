import { useMemo, useState, type CSSProperties } from "react";
import { Camera, Check, Highlighter, Mic, NotebookText, Play, Plus, Search, Sparkles } from "lucide-react";

const TOOLS = [
  { id: "read", label: "Læs", icon: Play },
  { id: "mark", label: "Marker", icon: Highlighter },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "voice", label: "Tale", icon: Mic },
  { id: "notes", label: "Noter", icon: NotebookText },
  { id: "scan", label: "Scan", icon: Camera },
  { id: "dictionary", label: "Ordbog", icon: Search },
] as const;

const COLOR_CHOICES = [
  { id: "minimal", emoji: "♥", label: "Minimal" },
  { id: "pinky", emoji: "🍓", label: "Pinky" },
  { id: "wood", emoji: "🌿", label: "Wood" },
  { id: "ocean", emoji: "🌊", label: "Ocean" },
  { id: "espresso", emoji: "☕", label: "Espresso" },
] as const;

const STICKERS = ["🐚", "🍋", "🌺", "🍓", "🪩", "🪐"];
const HIGHLIGHTS = ["#ffe868", "#63dce9", "#f58bd3", "#bd8cf2", "#82d78f", "#ff8179"];
const TEXT_COLORS = [
  { value: "#171717", label: "Sort" },
  { value: "#fff1ad", label: "Yellow" },
  { value: "#17345e", label: "Mørkeblå" },
  { value: "#6b3e2e", label: "Brun" },
  { value: "#b83f78", label: "Lyserød" },
  { value: "#ffffff", label: "Hvid" },
] as const;

export function PersonalisationShowcase() {
  const [tools, setTools] = useState(() => new Set(["read", "mark", "ai", "voice", "notes", "scan"]));
  const [color, setColor] = useState<(typeof COLOR_CHOICES)[number]["id"]>("ocean");
  const [notebookTheme, setNotebookTheme] = useState<(typeof COLOR_CHOICES)[number]["id"]>("pinky");
  const [sticker, setSticker] = useState("🍓");
  const [highlight, setHighlight] = useState(HIGHLIGHTS[0]);
  const [textColor, setTextColor] = useState<(typeof TEXT_COLORS)[number]["value"]>("#171717");
  const selectedNote = useMemo(() => COLOR_CHOICES.find((item) => item.id === notebookTheme) ?? COLOR_CHOICES[1], [notebookTheme]);

  const toggleTool = (id: string) => {
    setTools((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={`rr-setup-showcase rr-setup-app-${color}`}
      style={{ "--rr-selected-text": textColor } as CSSProperties}
    >
      <span className="rr-setup-cloud rr-setup-cloud-left" aria-hidden="true" />
      <span className="rr-setup-cloud rr-setup-cloud-right" aria-hidden="true" />

      <header className="rr-setup-heading">
        <h1>Gør det til dit eget</h1>
        <p className="rr-setup-lead">Ikke alle læser bedst på samme måde.</p>
        <p>Derfor bestemmer du selv, hvordan dit læse- og skriveværktøj skal se ud og fungere.</p>
        <span className="rr-setup-handnote" aria-hidden="true">Samme<br />funktioner.<br />Din stil. ♡</span>
      </header>

      <section className="rr-setup-toolbox" aria-labelledby="setup-tools-title">
        <h2 id="setup-tools-title">Vælg dine værktøjer</h2>
        <div className="rr-setup-tool-grid">
          {TOOLS.map(({ id, label, icon: Icon }) => {
            const active = tools.has(id);
            return (
              <button key={id} type="button" onClick={() => toggleTool(id)} aria-pressed={active} className="rr-setup-tool">
                <span><Icon className={id === "read" ? "fill-current" : ""} />{active && <Check className="rr-setup-check" />}</span>
                {label}
              </button>
            );
          })}
          <button type="button" className="rr-setup-tool" aria-label="Tilføj et værktøj"><span><Plus /></span>Tilføj</button>
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-color-title">
        <h2 id="setup-color-title">Vælg appens farve</h2>
        <div className="rr-setup-color-grid">
          {COLOR_CHOICES.map((item) => (
            <button key={item.id} type="button" onClick={() => setColor(item.id)} aria-pressed={color === item.id} className={`rr-setup-color rr-setup-color-${item.id} ${color === item.id ? "is-active" : ""}`}>
              <span aria-hidden="true">{item.emoji}</span>{item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-text-color-title">
        <h2 id="setup-text-color-title">Vælg tekstfarve</h2>
        <div className="rr-setup-text-colors">
          {TEXT_COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTextColor(item.value)}
              aria-pressed={textColor === item.value}
              className={textColor === item.value ? "is-active" : ""}
            >
              <span style={{ backgroundColor: item.value }} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-notepad-title">
        <h2 id="setup-notepad-title">Vælg notesbog</h2>
        <div className="rr-setup-notes-grid">
          {COLOR_CHOICES.map((item) => (
            <button key={item.id} type="button" onClick={() => setNotebookTheme(item.id)} aria-pressed={notebookTheme === item.id} className={`rr-setup-note rr-setup-note-${item.id} ${notebookTheme === item.id ? "is-active" : ""}`}>
              <span aria-hidden="true">{item.emoji}</span><b>{item.label}</b><small>♡</small>
            </button>
          ))}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-sticker-title">
        <h2 id="setup-sticker-title">Tilføj stickers</h2>
        <div className="rr-setup-stickers">
          {STICKERS.map((item) => <button key={item} type="button" onClick={() => setSticker(item)} aria-pressed={sticker === item}>{item}</button>)}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-highlight-title">
        <h2 id="setup-highlight-title">Highlighterfarver</h2>
        <div className="rr-setup-highlights">
          {HIGHLIGHTS.map((item) => <button key={item} type="button" onClick={() => setHighlight(item)} aria-pressed={highlight === item} style={{ backgroundColor: item }} aria-label={`Vælg highlighterfarven ${item}`} />)}
        </div>
      </section>

      <section className="rr-setup-section" aria-labelledby="setup-example-title">
        <h2 id="setup-example-title">Se dine valg</h2>
        <div className={`rr-setup-reading-example rr-setup-reading-${selectedNote.id}`}>
          <article>
            <h3>Kapitel 1. Introduktion</h3>
            <p>I dette kapitel ser vi på, hvordan <mark style={{ backgroundColor: highlight }}>teknologi</mark> kan gøre hverdagen lettere for alle. Når vi tilpasser værktøjerne til den enkelte, bliver det muligt at lære, arbejde og deltage på <mark style={{ backgroundColor: highlight }}>egne præmisser</mark>.</p>
          </article>
          <aside>
            <span className="rr-setup-note-sticker" aria-hidden="true">{sticker}</span>
            <h3>Vigtige punkter:</h3>
            <p>• Læs færdig<br />• Skriv noter<br />• Spørg AI</p>
            <span className="rr-setup-note-heart" aria-hidden="true">♡</span>
          </aside>
        </div>
      </section>

    </div>
  );
}

export default PersonalisationShowcase;
