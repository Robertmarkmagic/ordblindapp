import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Highlighter,
  Mic,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Type,
  Volume2,
} from "lucide-react";

const CHECKS = ["Stavning", "Grammatik", "Komma", "Tegnsætning", "Ordforslag"];
const SAMPLE_WORDS = ["I", "dette", "afsnit", "kan", "du", "prøve", "hvordan", "ReliefRead", "gør", "teksten", "roligere", "at", "læse."];
const TOOL_BUTTONS = [
  { id: "read", label: "Læs", icon: Play },
  { id: "mark", label: "Marker", icon: Highlighter },
  { id: "ai", label: "Riley", icon: Sparkles },
  { id: "voice", label: "Tal", icon: Mic },
  { id: "font", label: "Tekst", icon: Type },
  { id: "words", label: "Ordbog", icon: BookOpen },
] as const;

function speak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "da-DK";
  utterance.rate = 0.9;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function FunctionPlayground() {
  const [checks, setChecks] = useState(() => new Set(CHECKS));
  const [draft, setDraft] = useState("Jeg vil grene skrive en tydelig tekst");
  const [fontSize, setFontSize] = useState(19);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [letterSpacing, setLetterSpacing] = useState(0.02);
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState("read");
  const [lookup, setLookup] = useState("tilgængelig");

  const suggestion = useMemo(
    () => draft.replace(/\bgrene\b/gi, "gerne").replace(/\bvil gerne skrive\b/i, "vil gerne skrive"),
    [draft],
  );

  const toggleCheck = (name: string) => {
    setChecks((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const readSample = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setActiveWord(null);
      return;
    }
    let index = 0;
    setActiveWord(0);
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= SAMPLE_WORDS.length) {
        window.clearInterval(timer);
        setActiveWord(null);
      } else {
        setActiveWord(index);
      }
    }, 420);
    const started = speak(SAMPLE_WORDS.join(" "), () => {
      window.clearInterval(timer);
      setActiveWord(null);
    });
    if (!started) {
      window.clearInterval(timer);
      setActiveWord(null);
    }
  };

  return (
    <section className="rr-function-lab" aria-labelledby="function-lab-title">
      <div className="rr-function-lab-heading">
        <p>Prøv det med det samme</p>
        <h2 id="function-lab-title">Funktioner, der arbejder sammen</h2>
        <span>Alt det vigtigste samlet på én rolig arbejdsflade.</span>
      </div>

      <div className="rr-function-grid">
        <article className="rr-function-card rr-function-writing">
          <div className="rr-function-card-title"><Sparkles aria-hidden="true" /><h3>Skrivehjælp</h3></div>
          <label htmlFor="function-draft">Skriv en sætning</label>
          <textarea id="function-draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
          {suggestion !== draft && (
            <button type="button" className="rr-function-suggestion" onClick={() => setDraft(suggestion)}>
              <span><b>Forslag:</b> {suggestion}</span><Check aria-hidden="true" />
            </button>
          )}
        </article>

        <article className="rr-function-card rr-function-check-card">
          <div className="rr-function-card-title"><Check aria-hidden="true" /><h3>Vælg din hjælp</h3></div>
          <div className="rr-function-checks">
            {CHECKS.map((name) => (
              <button key={name} type="button" aria-pressed={checks.has(name)} onClick={() => toggleCheck(name)}>
                <span>{checks.has(name) && <Check aria-hidden="true" />}</span>{name}
              </button>
            ))}
          </div>
        </article>

        <article className="rr-function-card rr-function-voice">
          <div className="rr-function-card-title"><Volume2 aria-hidden="true" /><h3>Få teksten læst højt</h3></div>
          <button type="button" onClick={readSample} className="rr-function-mic" aria-label="Læs prøveteksten højt">
            {activeWord === null ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <p>Tryk og hør teksten med roligt tempo.</p>
          <div className="rr-function-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        </article>

        <article className="rr-function-card rr-function-reading">
          <div className="rr-function-card-title"><Type aria-hidden="true" /><h3>Tekststørrelse og afstand</h3></div>
          <div className="rr-function-stepper">
            <button type="button" onClick={() => setFontSize((value) => Math.max(16, value - 1))} aria-label="Gør teksten mindre"><Minus /></button>
            <span>A <b>{fontSize}</b> A</span>
            <button type="button" onClick={() => setFontSize((value) => Math.min(30, value + 1))} aria-label="Gør teksten større"><Plus /></button>
          </div>
          <label>Linjeafstand <input type="range" min="1.4" max="2.5" step="0.1" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} /></label>
          <label>Bogstavafstand <input type="range" min="0" max="0.12" step="0.01" value={letterSpacing} onChange={(event) => setLetterSpacing(Number(event.target.value))} /></label>
        </article>

        <article className="rr-function-card rr-function-dictionary">
          <div className="rr-function-card-title"><BookOpen aria-hidden="true" /><h3>Personlig ordbog</h3></div>
          <label htmlFor="function-lookup">Søg eller tilføj et ord</label>
          <div><input id="function-lookup" value={lookup} onChange={(event) => setLookup(event.target.value)} /><Search aria-hidden="true" /></div>
          <p><b>{lookup || "Dit ord"}</b><br />Et ord, du selv kan gemme og få læst højt.</p>
          <button type="button" onClick={() => speak(lookup)}><Volume2 aria-hidden="true" /> Hør ordet</button>
        </article>
      </div>

      <div className="rr-function-toolbar" aria-label="Prøv værktøjslinjen">
        {TOOL_BUTTONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={activeTool === id} onClick={() => setActiveTool(id)}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
      </div>

      <div className="rr-function-paper" style={{ fontSize, lineHeight, letterSpacing: `${letterSpacing}em` }}>
        <span className="rr-function-paper-label">Prøvetekst</span>
        <p>
          {SAMPLE_WORDS.map((word, index) => (
            <span key={`${word}-${index}`} className={activeWord === index ? "is-reading" : ""}>{word} </span>
          ))}
        </p>
        <small>Valgt værktøj: <b>{TOOL_BUTTONS.find((tool) => tool.id === activeTool)?.label}</b></small>
      </div>
    </section>
  );
}

export default FunctionPlayground;
