import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Highlighter,
  Mic,
  Minus,
  NotebookText,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Type,
  Volume2,
  X,
} from "lucide-react";
import { getWritingSuggestions, insertWritingSuggestion } from "@/lib/writing-tools";
import { useDictation } from "@/hooks/useDictation";

const CHECKS = ["Stavning", "Grammatik", "Komma", "Tegnsætning", "Ordforslag"];
const INITIAL_SAMPLE = "I dette afsnit kan du prøve, hvordan ReliefRead gør teksten roligere at læse.";
const HIGHLIGHT_COLORS = ["#ffe868", "#63dce9", "#f58bd3", "#bd8cf2", "#82d78f", "#ff8179"];
const TOOL_BUTTONS = [
  { id: "read", label: "Læs", icon: Play },
  { id: "mark", label: "Marker", icon: Highlighter },
  { id: "voice", label: "Tal", icon: Mic },
  { id: "font", label: "Tekst", icon: Type },
  { id: "words", label: "Ordbog", icon: BookOpen },
] as const;

const PHONETIC_SUGGESTIONS: Record<string, string[]> = {
  grene: ["gerne", "grene", "grenene", "gerning"],
  somer: ["sommer", "sommeren", "sommerferie", "sommerhus", "sommerdag"],
  tekst: ["teksten", "tekst", "tekstforslag", "tekstfelt", "tekster"],
  tydelig: ["tydelig", "tydeligt", "tydeligere", "tydelighed"],
};

type DictionaryEntry = {
  word: string;
  meaning: string;
  translation: string;
  inflection: string;
  sourceUrl?: string;
};

const DICTIONARY_ENTRIES: Record<string, DictionaryEntry> = {
  "tilgængelig": {
    word: "tilgængelig",
    meaning: "Noget, der er nemt at komme til, bruge eller forstå.",
    translation: "accessible",
    inflection: "tilgængelig, tilgængeligt, tilgængelige",
  },
  "forsvar": {
    word: "forsvar",
    meaning: "Beskyttelse mod et angreb, en fare eller kritik.",
    translation: "defence",
    inflection: "et forsvar, forsvaret, flere forsvar",
  },
  "sommer": {
    word: "sommer",
    meaning: "Årstiden mellem forår og efterår.",
    translation: "summer",
    inflection: "en sommer, sommeren, somre, somrene",
  },
  "tandlægen": {
    word: "tandlægen",
    meaning: "Den tandlæge, som undersøger og behandler tænder.",
    translation: "the dentist",
    inflection: "en tandlæge, tandlægen, tandlæger, tandlægerne",
  },
  "oversættelse": {
    word: "oversættelse",
    meaning: "En tekst eller tale, der er gjort om til et andet sprog.",
    translation: "translation",
    inflection: "en oversættelse, oversættelsen, oversættelser, oversættelserne",
  },
  "haj": {
    word: "haj",
    meaning: "En stor rovfisk med bruskskelet, som lever i havet.",
    translation: "shark",
    inflection: "en haj, hajen, hajer, hajerne",
  },
};

const DICTIONARY_ALIASES: Record<string, string> = {
  "tanlæen": "tandlægen",
  "tandlegen": "tandlægen",
  "åvessættelse": "oversættelse",
  "oversettelse": "oversættelse",
  "somer": "sommer",
};

const SPELLING_FIXES: Record<string, string> = {
  grene: "gerne",
  somer: "sommer",
  tanlæen: "tandlægen",
  tandlegen: "tandlægen",
  åvessættelse: "oversættelse",
  oversettelse: "oversættelse",
};

function firstUsefulDictionaryLine(extract: string) {
  const ignored = /^(dansk|substantiv|verbum|adjektiv|udtale|etymologi|bøjning|oversættelser|referencer|se også)$/i;
  return extract
    .split("\n")
    .map((line) => line.replace(/^[:#*\d.)\s-]+/, "").trim())
    .find((line) => line.length > 12 && !ignored.test(line) && !/^=/.test(line)) || "";
}

function wordAtCaret(text: string, caret: number) {
  const before = text.slice(0, caret);
  return before.match(/([\p{L}æøåÆØÅ]+)$/u)?.[1]?.toLocaleLowerCase() || "";
}

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
  const [activeTool, setActiveTool] = useState("read");
  const [lookup, setLookup] = useState("tilgængelig");
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry>(DICTIONARY_ENTRIES["tilgængelig"]);
  const [dictionaryMiss, setDictionaryMiss] = useState(false);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [caret, setCaret] = useState(draft.length);
  const [suggestionOpen, setSuggestionOpen] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [voiceText, setVoiceText] = useState("Skriv eller indsæt den tekst, du vil høre læst højt.");
  const [voiceSelection, setVoiceSelection] = useState(false);
  const [voiceReading, setVoiceReading] = useState(false);
  const [sampleText, setSampleText] = useState(INITIAL_SAMPLE);
  const [sampleSelection, setSampleSelection] = useState("");
  const [sampleReading, setSampleReading] = useState(false);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [note, setNote] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sampleRef = useRef<HTMLDivElement>(null);

  const dictation = useDictation({
    lang: "da-DK",
    onFinal: (spoken) => {
      const current = sampleRef.current?.innerText.trim() || sampleText.trim();
      const next = `${current}${current ? " " : ""}${spoken}`;
      if (sampleRef.current) sampleRef.current.innerText = next;
      setSampleText(next);
    },
  });

  const suggestion = useMemo(
    () => Object.entries(SPELLING_FIXES).reduce(
      (text, [wrong, right]) => text.replace(new RegExp(`\\b${wrong}\\b`, "gi"), right),
      draft,
    ),
    [draft],
  );

  const wordSuggestions = useMemo(() => {
    const prefix = wordAtCaret(draft, caret);
    const direct = PHONETIC_SUGGESTIONS[prefix];
    const generated = getWritingSuggestions(draft, caret, "da").words;
    const fallback = prefix.length >= 2
      ? Object.entries(PHONETIC_SUGGESTIONS)
          .filter(([key]) => key.startsWith(prefix) || prefix.startsWith(key.slice(0, 3)))
          .flatMap(([, words]) => words)
      : [];
    const corrected = suggestion !== draft ? [suggestion.match(/\bgerne\b/i)?.[0] || "gerne"] : [];
    const nextWords = getWritingSuggestions(draft, caret, "da").nextWords;
    return Array.from(new Set([...(direct || []), ...generated, ...fallback, ...corrected, ...nextWords])).slice(0, 7);
  }, [caret, draft, suggestion]);

  const writingResults = useMemo(() => {
    const trimmed = draft.trim();
    const lower = draft.toLocaleLowerCase("da-DK");
    const spellingChanges = Object.entries(SPELLING_FIXES)
      .filter(([wrong]) => new RegExp(`\\b${wrong}\\b`, "i").test(draft))
      .map(([wrong, right]) => `${wrong} → ${right}`);
    const grammarIssue = /\b(jeg|du|vi|de)\s+er\s+(gå|skrive|læse)\b/i.test(draft);
    const needsComma = /\b(fordi|men|når|hvis|som)\b/i.test(draft) && !/[,;]/.test(draft);
    const needsPunctuation = Boolean(trimmed) && !/[.!?]$/.test(trimmed);
    const suggestions = wordSuggestions.slice(0, 4).join(", ");

    return [
      { name: "Stavning", text: spellingChanges.length ? `Forslag: ${spellingChanges.join(", ")}` : "Ingen tydelige stavefejl fundet." },
      { name: "Grammatik", text: grammarIssue ? "Sætningen kan bøjes bedre. Prøv for eksempel ‘jeg går’, ‘jeg skriver’ eller ‘jeg læser’." : "Sætningen ser grammatisk tydelig ud." },
      { name: "Komma", text: needsComma ? "Sætningen kan mangle et komma ved ledsætningen." : "Ingen tydelig kommafejl fundet." },
      { name: "Tegnsætning", text: needsPunctuation ? "Forslag: Sæt punktum til sidst." : "Tegnsætningen ser tydelig ud." },
      { name: "Ordforslag", text: suggestions ? `Du kan fortsætte med: ${suggestions}` : lower ? "Skriv videre for at få relevante ordforslag." : "Begynd at skrive for at få ordforslag." },
    ];
  }, [draft, wordSuggestions]);

  const updateCaret = () => {
    const next = textareaRef.current?.selectionStart ?? draft.length;
    setCaret(next);
    setSelectedSuggestion(0);
    setSuggestionOpen(true);
  };

  const applyWordSuggestion = (word: string) => {
    const result = insertWritingSuggestion(draft, caret, word, true);
    setDraft(result.text.trimEnd());
    setCaret(result.caret);
    setSuggestionOpen(false);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.caret, result.caret);
    }, 0);
  };

  const handleSuggestionKeys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestionOpen || wordSuggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedSuggestion((current) => (current + 1) % wordSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedSuggestion((current) => (current - 1 + wordSuggestions.length) % wordSuggestions.length);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      applyWordSuggestion(wordSuggestions[selectedSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestionOpen(false);
    }
  };

  const toggleCheck = (name: string) => {
    setChecks((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const findDictionaryWord = async () => {
    const normalized = lookup.trim().toLocaleLowerCase("da-DK");
    if (!normalized) return;
    const key = normalized in DICTIONARY_ENTRIES ? normalized : DICTIONARY_ALIASES[normalized];
    if (key) {
      setDictionaryEntry(DICTIONARY_ENTRIES[key]);
      setDictionaryMiss(false);
      return;
    }

    setDictionaryLoading(true);
    setDictionaryMiss(false);
    try {
      const endpoint = new URL("https://da.wiktionary.org/w/api.php");
      endpoint.search = new URLSearchParams({
        action: "query",
        prop: "extracts",
        explaintext: "1",
        redirects: "1",
        titles: normalized,
        format: "json",
        origin: "*",
      }).toString();
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("dictionary-request-failed");
      const data = await response.json() as { query?: { pages?: Record<string, { missing?: string; title?: string; extract?: string }> } };
      const page = Object.values(data.query?.pages || {})[0];
      const meaning = firstUsefulDictionaryLine(page?.extract || "");
      if (!page || "missing" in page || !meaning) throw new Error("dictionary-word-not-found");
      setDictionaryEntry({
        word: page.title?.toLocaleLowerCase("da-DK") || normalized,
        meaning,
        translation: "Se hele opslaget for oversættelser",
        inflection: "Se hele opslaget for bøjning og ordklasse",
        sourceUrl: `https://da.wiktionary.org/wiki/${encodeURIComponent(page.title || normalized)}`,
      });
      setDictionaryMiss(false);
    } catch {
      setDictionaryMiss(true);
    } finally {
      setDictionaryLoading(false);
    }
  };

  const readVoiceText = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setVoiceReading(false);
      return;
    }
    const field = voiceTextareaRef.current;
    const start = field?.selectionStart ?? 0;
    const end = field?.selectionEnd ?? 0;
    const selectedText = start !== end ? voiceText.slice(start, end).trim() : "";
    const textToRead = selectedText || voiceText.trim();
    if (!textToRead) return;
    setVoiceReading(true);
    const started = speak(textToRead, () => setVoiceReading(false));
    if (!started) setVoiceReading(false);
  };

  const rememberSampleSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !sampleRef.current?.contains(selection.anchorNode)) {
      setSampleSelection("");
      return;
    }
    setSampleSelection(selection.toString().trim());
  };

  const readSample = (selectedOnly = false) => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setSampleReading(false);
      return;
    }
    const current = sampleRef.current?.innerText.trim() || sampleText.trim();
    const textToRead = selectedOnly ? sampleSelection : current;
    if (!textToRead) return;
    setSampleReading(true);
    const started = speak(textToRead, () => setSampleReading(false));
    if (!started) setSampleReading(false);
  };

  const applyHighlight = (color: string) => {
    setHighlightColor(color);
    sampleRef.current?.focus();
    document.execCommand("hiliteColor", false, color);
    setSampleText(sampleRef.current?.innerText || sampleText);
  };

  const resetSample = () => {
    if (sampleRef.current) sampleRef.current.innerText = INITIAL_SAMPLE;
    setSampleText(INITIAL_SAMPLE);
    setSampleSelection("");
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
          <div className="rr-function-writing-field">
            <textarea
              ref={textareaRef}
              id="function-draft"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setCaret(event.target.selectionStart);
                setSelectedSuggestion(0);
                setSuggestionOpen(true);
              }}
              onClick={updateCaret}
              onKeyDown={handleSuggestionKeys}
              onFocus={updateCaret}
              aria-controls="rr-writing-suggestions"
              aria-expanded={suggestionOpen && wordSuggestions.length > 0}
              aria-autocomplete="list"
            />
            {suggestionOpen && wordSuggestions.length > 0 && (
              <div id="rr-writing-suggestions" className="rr-writing-suggestions" role="listbox" aria-label="Skriveforslag">
                <div className="rr-writing-suggestions-head">
                  <span><Sparkles aria-hidden="true" />Skriveforslag</span>
                  <button type="button" onClick={() => setSuggestionOpen(false)} aria-label="Luk skriveforslag"><X /></button>
                </div>
                <div className="rr-writing-suggestion-list">
                  {wordSuggestions.map((word, index) => (
                    <div key={word} className={selectedSuggestion === index ? "is-selected" : ""} role="option" aria-selected={selectedSuggestion === index}>
                      <button type="button" className="rr-writing-suggestion-word" onMouseDown={(event) => event.preventDefault()} onClick={() => applyWordSuggestion(word)}>
                        <span>{word}</span><ChevronRight aria-hidden="true" />
                      </button>
                      <button type="button" className="rr-writing-suggestion-speak" onMouseDown={(event) => event.preventDefault()} onClick={() => speak(word)} aria-label={`Hør ${word}`}>
                        <Volume2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <p>Brug piletasterne og Enter, eller vælg et ord.</p>
              </div>
            )}
          </div>
          {suggestion !== draft && (
            <button type="button" className="rr-function-suggestion" onClick={() => setDraft(suggestion)}>
              <span><b>Ret hele sætningen:</b> {suggestion}</span><Check aria-hidden="true" />
            </button>
          )}
          <div className="rr-writing-results" aria-live="polite">
            {writingResults.filter((result) => checks.has(result.name)).map((result) => (
              <div key={result.name}>
                <b>{result.name}</b>
                <span>{result.text}</span>
              </div>
            ))}
            {checks.size === 0 && <p>Vælg mindst én type hjælp i boksen nedenfor.</p>}
          </div>
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
          <label htmlFor="function-voice-text">Skriv eller indsæt tekst</label>
          <textarea
            ref={voiceTextareaRef}
            id="function-voice-text"
            value={voiceText}
            onChange={(event) => setVoiceText(event.target.value)}
            onSelect={(event) => setVoiceSelection(event.currentTarget.selectionStart !== event.currentTarget.selectionEnd)}
          />
          <button
            type="button"
            onClick={readVoiceText}
            className="rr-function-mic"
            aria-label={voiceReading ? "Stop oplæsning" : voiceSelection ? "Læs den markerede tekst højt" : "Læs hele teksten højt"}
          >
            {voiceReading ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <p>{voiceSelection ? "Tryk for at læse din markering op." : "Marker en del, eller læs hele teksten op."}</p>
          <div className="rr-function-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        </article>

        <article className="rr-function-card rr-function-dictionary">
          <div className="rr-function-card-title"><BookOpen aria-hidden="true" /><h3>Hvad kan en ordbog hjælpe med?</h3></div>
          <form className="rr-dictionary-search" onSubmit={(event) => { event.preventDefault(); void findDictionaryWord(); }}>
            <label htmlFor="function-lookup">Skriv et ord</label>
            <div>
              <input id="function-lookup" value={lookup} onChange={(event) => setLookup(event.target.value)} spellCheck="false" />
              <button type="submit" aria-label="Slå ordet op"><Search aria-hidden="true" /></button>
            </div>
          </form>
          {dictionaryLoading ? (
            <div className="rr-dictionary-miss" role="status"><b>Slår ordet op...</b><span>Vi søger i den danske ordbog.</span></div>
          ) : dictionaryMiss ? (
            <div className="rr-dictionary-miss" role="status">
              <b>Vi kunne ikke finde ordet.</b>
              <span>Kontrollér stavningen, eller prøv en anden bøjning af ordet.</span>
            </div>
          ) : (
            <dl className="rr-dictionary-result" aria-live="polite">
              <div><dt>Betydning</dt><dd>{dictionaryEntry.meaning}</dd></div>
              <div><dt>Stavning</dt><dd>{dictionaryEntry.word}</dd></div>
              <div><dt>Engelsk</dt><dd>{dictionaryEntry.translation}</dd></div>
              <div><dt>Bøjning</dt><dd>{dictionaryEntry.inflection}</dd></div>
              {dictionaryEntry.sourceUrl && <div><dt>Mere information</dt><dd><a href={dictionaryEntry.sourceUrl} target="_blank" rel="noreferrer">Åbn hele ordbogsopslaget</a></dd></div>}
            </dl>
          )}
          <button type="button" disabled={dictionaryMiss || dictionaryLoading} onClick={() => speak(dictionaryEntry.word)}><Volume2 aria-hidden="true" /> Hør udtalen</button>
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
      </div>

      <div className="rr-function-toolbar" aria-label="Prøv værktøjslinjen">
        {TOOL_BUTTONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={activeTool === id} onClick={() => setActiveTool(id)}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
      </div>

      <div className="rr-function-tool-panel" aria-live="polite">
        {activeTool === "read" && (
          <div>
            <div><Volume2 aria-hidden="true" /><span><b>Læs teksten højt</b><small>Marker et stykke tekst, eller læs det hele.</small></span></div>
            <div className="rr-function-panel-actions">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => readSample(false)}>{sampleReading ? <Pause /> : <Play />} {sampleReading ? "Stop" : "Læs hele teksten"}</button>
              <button type="button" disabled={!sampleSelection} onMouseDown={(event) => event.preventDefault()} onClick={() => readSample(true)}><Volume2 /> Læs markeringen</button>
            </div>
          </div>
        )}

        {activeTool === "mark" && (
          <div>
            <div><Highlighter aria-hidden="true" /><span><b>Marker tekst</b><small>Vælg tekst i prøveteksten og tryk på en farve.</small></span></div>
            <div className="rr-function-highlight-colors" aria-label="Vælg markeringsfarve">
              {HIGHLIGHT_COLORS.map((color) => <button key={color} type="button" aria-pressed={highlightColor === color} aria-label={`Marker med farven ${color}`} style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => applyHighlight(color)} />)}
            </div>
          </div>
        )}

        {activeTool === "voice" && (
          <div>
            <div><Mic aria-hidden="true" /><span><b>Tal til prøveteksten</b><small>Det, du siger, bliver skrevet ind nederst i teksten.</small></span></div>
            <button type="button" className="rr-function-primary-action" onClick={dictation.listening ? dictation.stop : dictation.start}><Mic /> {dictation.listening ? "Stop diktering" : "Start diktering"}</button>
            {dictation.interim && <p className="rr-function-interim">Jeg hører: {dictation.interim}</p>}
            {dictation.error && <p className="rr-function-panel-error">Mikrofonen kunne ikke startes. Tillad mikrofonen i browseren, og prøv igen.</p>}
            {!dictation.supported && <p className="rr-function-panel-error">Diktering virker bedst i Chrome eller Edge.</p>}
          </div>
        )}

        {activeTool === "font" && (
          <div>
            <div><Type aria-hidden="true" /><span><b>Rediger teksten</b><small>Klik direkte i prøveteksten for at skrive. Her kan du også ændre visningen.</small></span></div>
            <div className="rr-function-inline-controls">
              <button type="button" onClick={() => setFontSize((value) => Math.max(16, value - 1))}><Minus /> Mindre</button>
              <b>{fontSize} px</b>
              <button type="button" onClick={() => setFontSize((value) => Math.min(30, value + 1))}><Plus /> Større</button>
              <button type="button" onClick={resetSample}><X /> Gendan tekst</button>
            </div>
          </div>
        )}

        {activeTool === "words" && (
          <form onSubmit={(event) => { event.preventDefault(); void findDictionaryWord(); }}>
            <div><BookOpen aria-hidden="true" /><span><b>Ordbog</b><small>Skriv et ord for at se betydning, stavning, oversættelse og bøjning.</small></span></div>
            <label htmlFor="function-toolbar-lookup">Slå et ord op</label>
            <div className="rr-function-panel-search"><input id="function-toolbar-lookup" value={lookup} onChange={(event) => setLookup(event.target.value)} /><button type="submit" aria-label="Slå ordet op"><Search /></button></div>
            {dictionaryLoading && <p className="rr-function-dictionary-compact">Slår ordet op...</p>}
            {!dictionaryLoading && !dictionaryMiss && <p className="rr-function-dictionary-compact"><b>{dictionaryEntry.word}</b><span>{dictionaryEntry.meaning}</span><small>{dictionaryEntry.translation}. {dictionaryEntry.inflection}</small></p>}
            {!dictionaryLoading && dictionaryMiss && <p className="rr-function-panel-error">Vi kunne ikke finde ordet. Kontrollér stavningen, og prøv igen.</p>}
          </form>
        )}
      </div>

      <div className="rr-function-paper" style={{ fontSize, lineHeight, letterSpacing: `${letterSpacing}em` }}>
        <div className="rr-function-paper-main">
          <span className="rr-function-paper-label">Prøvetekst</span>
          <div
            ref={sampleRef}
            className="rr-function-editable"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Redigerbar prøvetekst"
            onInput={(event) => setSampleText(event.currentTarget.innerText)}
            onMouseUp={rememberSampleSelection}
            onKeyUp={rememberSampleSelection}
          >
            {INITIAL_SAMPLE}
          </div>
          <small>Valgt værktøj: <b>{TOOL_BUTTONS.find((tool) => tool.id === activeTool)?.label}</b>. Klik i teksten for at redigere.</small>
        </div>
        <aside className="rr-function-note-preview">
          <NotebookText aria-hidden="true" />
          <label htmlFor="function-note"><b>Min note</b></label>
          <textarea id="function-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Skriv din note direkte her..." />
        </aside>
      </div>
    </section>
  );
}

export default FunctionPlayground;
