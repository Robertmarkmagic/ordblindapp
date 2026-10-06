import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
import { CommaGuide } from "@/components/landing/CommaGuide";
import { useLanguage } from "@/lib/i18n";
import { findDanishCommaSuggestions } from "@/lib/grammar-learning";

const CHECKS = ["Stavning", "Grammatik", "Komma", "Tegnsætning", "Ordforslag"];
const INITIAL_SAMPLE = "I dette afsnit kan du prøve, hvordan ReliefRead gør teksten roligere at læse.";
const INITIAL_SAMPLE_EN = "In this section, you can try how ReliefRead makes text calmer and easier to read.";
const HIGHLIGHT_COLORS = ["#ffe868", "#63dce9", "#f58bd3", "#bd8cf2", "#82d78f", "#ff8179"];
const READING_MODES = ["Læs hele teksten", "Læs ord", "Læs sætning", "Læs bogstavnavn", "Læs bogstavlyd"] as const;
const SUBJECT_TERMS: Record<string, string[]> = {
  Generel: ["besked", "forklaring", "eksempel", "vigtigt", "sammenhæng"],
  Dansk: ["navneord", "udsagnsord", "tillægsord", "grundled", "udsagnsled"],
  Matematik: ["brøk", "procent", "ligning", "geometri", "resultat"],
  Naturfag: ["fotosyntese", "energi", "molekyle", "økosystem", "fordampning"],
  Historie: ["kildekritik", "demokrati", "industrialisering", "revolution", "tidslinje"],
};
const SUBJECT_TERMS_EN: Record<string, string[]> = {
  General: ["message", "explanation", "example", "important", "context"],
  English: ["noun", "verb", "adjective", "subject", "predicate"],
  Mathematics: ["fraction", "percent", "equation", "geometry", "result"],
  Science: ["photosynthesis", "energy", "molecule", "ecosystem", "evaporation"],
  History: ["source criticism", "democracy", "industrialisation", "revolution", "timeline"],
};
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
  liek: "like",
  grene: "gerne",
  somer: "sommer",
  tanlæen: "tandlægen",
  tandlegen: "tandlægen",
  åvessættelse: "oversættelse",
  oversettelse: "oversættelse",
};

const WORD_CLASS_LABELS = {
  noun: "Navneord",
  verb: "Udsagnsord",
  adjective: "Tillægsord",
  pronoun: "Stedord",
  other: "Andre ord",
} as const;

type WordClass = keyof typeof WORD_CLASS_LABELS;

function findWordClass(word: string): WordClass {
  const normalized = word.toLocaleLowerCase("da-DK");
  if (["jeg", "du", "han", "hun", "den", "det", "vi", "i", "de", "mig", "dig", "os", "dem"].includes(normalized)) return "pronoun";
  if (["er", "var", "har", "havde", "vil", "skal", "kan", "må", "bliver", "blev", "går", "gik", "skriver", "skrev", "læser", "læste", "skrive", "læse", "forstå"].includes(normalized) || /(ede|te|er)$/.test(normalized)) return "verb";
  if (["tydelig", "tydeligt", "rolig", "roligt", "svær", "svært", "let", "nem", "god", "glad", "grøn", "blå", "stor", "lille"].includes(normalized) || /(lig|isk|fuld|løst)$/.test(normalized)) return "adjective";
  if (["en", "et", "den", "det", "de", "og", "eller", "men", "fordi", "som", "når", "hvis", "på", "i", "til", "fra", "med", "af"].includes(normalized)) return "other";
  return "noun";
}

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

function speak(text: string, onEnd?: () => void, rate = 0.9, lang = "da-DK") {
  if (!("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function FunctionPlayground() {
  const { language } = useLanguage();
  const en = language === "en";
  const tr = (da: string, english: string) => en ? english : da;
  const subjectTerms = en ? SUBJECT_TERMS_EN : SUBJECT_TERMS;
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
  const [readingMode, setReadingMode] = useState<(typeof READING_MODES)[number]>("Læs hele teksten");
  const [readingSpeed, setReadingSpeed] = useState(0.9);
  const [subject, setSubject] = useState("Generel");
  const [personalTerm, setPersonalTerm] = useState("");
  const [personalTerms, setPersonalTerms] = useState<string[]>([]);
  const [sampleText, setSampleText] = useState(INITIAL_SAMPLE);
  const [sampleSelection, setSampleSelection] = useState("");
  const [sampleReading, setSampleReading] = useState(false);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [note, setNote] = useState("");
  const commaLearningSuggestions = useMemo(() => findDanishCommaSuggestions(draft), [draft]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sampleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextSample = en ? INITIAL_SAMPLE_EN : INITIAL_SAMPLE;
    setSampleText(nextSample);
    if (sampleRef.current) sampleRef.current.innerText = nextSample;
    setVoiceText(en ? "Write or paste the text you want to hear read aloud." : "Skriv eller indsæt den tekst, du vil høre læst højt.");
    setDraft(en ? "I would liek to write a clear text" : "Jeg vil grene skrive en tydelig tekst");
    setLookup(en ? "accessible" : "tilgængelig");
    setSubject(en ? "General" : "Generel");
    setDictionaryEntry(en ? { word: "accessible", meaning: "Easy to reach, use or understand.", translation: "tilgængelig", inflection: "accessible, more accessible, most accessible" } : DICTIONARY_ENTRIES["tilgængelig"]);
  }, [en]);

  const dictation = useDictation({
    lang: en ? "en-US" : "da-DK",
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
    const relevantTerms = [...(subjectTerms[subject] || []), ...personalTerms].filter((term) => !prefix || term.startsWith(prefix) || prefix.length < 2);
    return Array.from(new Set([...(direct || []), ...generated, ...relevantTerms, ...fallback, ...corrected, ...nextWords])).slice(0, 9);
  }, [caret, draft, personalTerms, subject, subjectTerms, suggestion]);

  const sentenceSuggestions = useMemo(() => {
    const corrected = suggestion.trim().replace(/[.!?]+$/, "");
    if (!corrected) return [];
    if (en) return [
      `${corrected}.`,
      `${corrected}, so the message is easier to understand.`,
      `${corrected}. The most important thing is that the text is clear.`,
    ];
    const lower = corrected.toLocaleLowerCase("da-DK");
    if (/\bfordi$/.test(lower)) {
      return [`${corrected} det gør teksten lettere at forstå.`, `${corrected} jeg gerne vil forklare det tydeligt.`];
    }
    if (/\bjeg vil$/.test(lower)) {
      return [`${corrected} gerne skrive en tydelig besked.`, `${corrected} gerne have hjælp til min tekst.`];
    }
    if (/\bkan du$/.test(lower)) {
      return [`${corrected} hjælpe mig med at formulere det?`, `${corrected} gøre teksten lettere at læse?`];
    }
    return [
      `${corrected}.`,
      `${corrected}, så budskabet bliver lettere at forstå.`,
      `${corrected}. Det vigtigste er, at teksten er tydelig.`,
    ];
  }, [en, suggestion]);

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

    if (en) return [
      { name: "Stavning", text: spellingChanges.length ? `Suggestions: ${spellingChanges.join(", ")}` : "No obvious spelling errors found." },
      { name: "Grammatik", text: grammarIssue ? "The sentence may need a different verb form." : "The sentence appears grammatically clear." },
      { name: "Komma", text: needsComma ? "The sentence may need a comma." : "No obvious comma error found." },
      { name: "Tegnsætning", text: needsPunctuation ? "Suggestion: Add punctuation at the end." : "The punctuation appears clear." },
      { name: "Ordforslag", text: suggestions ? `You can continue with: ${suggestions}` : lower ? "Keep writing to receive relevant suggestions." : "Start writing to receive suggestions." },
    ];
    return [
      { name: "Stavning", text: spellingChanges.length ? `Forslag: ${spellingChanges.join(", ")}` : "Ingen tydelige stavefejl fundet." },
      { name: "Grammatik", text: grammarIssue ? "Sætningen kan bøjes bedre. Prøv for eksempel ‘jeg går’, ‘jeg skriver’ eller ‘jeg læser’." : "Sætningen ser grammatisk tydelig ud." },
      { name: "Komma", text: needsComma ? "Sætningen kan mangle et komma ved ledsætningen." : "Ingen tydelig kommafejl fundet." },
      { name: "Tegnsætning", text: needsPunctuation ? "Forslag: Sæt punktum til sidst." : "Tegnsætningen ser tydelig ud." },
      { name: "Ordforslag", text: suggestions ? `Du kan fortsætte med: ${suggestions}` : lower ? "Skriv videre for at få relevante ordforslag." : "Begynd at skrive for at få ordforslag." },
    ];
  }, [draft, en, wordSuggestions]);

  const grammarAnalysis = useMemo(() => {
    const words = draft.match(/[\p{L}æøåÆØÅ]+/gu) || [];
    const tokens = words.map((word) => ({ word, wordClass: findWordClass(word) }));
    const subject = tokens.find((token) => token.wordClass === "pronoun" || token.wordClass === "noun")?.word || (en ? "Not found" : "Ikke fundet");
    const predicate = tokens.find((token) => token.wordClass === "verb")?.word || (en ? "Not found" : "Ikke fundet");
    return { tokens, subject, predicate };
  }, [draft, en]);

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
      const endpoint = new URL(`https://${en ? "en" : "da"}.wiktionary.org/w/api.php`);
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
        translation: tr("Se hele opslaget for oversættelser", "See the full entry for translations"),
        inflection: tr("Se hele opslaget for bøjning og ordklasse", "See the full entry for inflection and word class"),
        sourceUrl: `https://${en ? "en" : "da"}.wiktionary.org/wiki/${encodeURIComponent(page.title || normalized)}`,
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
    const before = voiceText.slice(0, start);
    const after = voiceText.slice(end || start);
    const word = selectedText || `${before.match(/[\p{L}æøåÆØÅ]+$/u)?.[0] || ""}${after.match(/^[\p{L}æøåÆØÅ]+/u)?.[0] || ""}`;
    const sentenceStart = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?")) + 1;
    const remaining = voiceText.slice(start);
    const nextStop = remaining.search(/[.!?]/);
    const sentenceEnd = nextStop >= 0 ? start + nextStop + 1 : voiceText.length;
    const sentence = voiceText.slice(sentenceStart, sentenceEnd).trim();
    const letter = selectedText.slice(0, 1) || voiceText.slice(start, start + 1);
    const textToRead = readingMode === "Læs ord"
      ? word
      : readingMode === "Læs sætning"
        ? sentence
        : readingMode === "Læs bogstavnavn"
          ? letter.toLocaleUpperCase("da-DK")
          : readingMode === "Læs bogstavlyd"
            ? letter.toLocaleLowerCase("da-DK")
            : selectedText || voiceText.trim();
    if (!textToRead) return;
    setVoiceReading(true);
    const started = speak(textToRead, () => setVoiceReading(false), readingSpeed, en ? "en-US" : "da-DK");
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
    const started = speak(textToRead, () => setSampleReading(false), 0.9, en ? "en-US" : "da-DK");
    if (!started) setSampleReading(false);
  };

  const applyHighlight = (color: string) => {
    setHighlightColor(color);
    sampleRef.current?.focus();
    document.execCommand("hiliteColor", false, color);
    setSampleText(sampleRef.current?.innerText || sampleText);
  };

  const resetSample = () => {
    const initial = en ? INITIAL_SAMPLE_EN : INITIAL_SAMPLE;
    if (sampleRef.current) sampleRef.current.innerText = initial;
    setSampleText(initial);
    setSampleSelection("");
  };

  return (
    <section className="rr-function-lab" aria-labelledby="function-lab-title">
      <div className="rr-function-lab-heading">
        <p>{tr("Prøv det med det samme", "Try it right now")}</p>
        <h2 id="function-lab-title">{tr("Funktioner, der arbejder sammen", "Tools that work together")}</h2>
        <span>{tr("Alt det vigtigste samlet på én rolig arbejdsflade.", "All the essential tools in one calm workspace.")}</span>
      </div>

      <div className="rr-function-grid">
        <article className="rr-function-card rr-function-writing">
          <div className="rr-function-card-title"><Sparkles aria-hidden="true" /><h3>{tr("Skrivehjælp", "Writing support")}</h3></div>
          <label htmlFor="function-draft">{tr("Skriv en sætning", "Write a sentence")}</label>
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
              <div id="rr-writing-suggestions" className="rr-writing-suggestions" role="listbox" aria-label={tr("Skriveforslag", "Writing suggestions")}>
                <div className="rr-writing-suggestions-head">
                  <span><Sparkles aria-hidden="true" />{tr("Skriveforslag", "Writing suggestions")}</span>
                  <button type="button" onClick={() => setSuggestionOpen(false)} aria-label={tr("Luk skriveforslag", "Close writing suggestions")}><X /></button>
                </div>
                <div className="rr-writing-suggestion-list">
                  {wordSuggestions.map((word, index) => (
                    <div key={word} className={selectedSuggestion === index ? "is-selected" : ""} role="option" aria-selected={selectedSuggestion === index}>
                      <button type="button" className="rr-writing-suggestion-word" onMouseDown={(event) => event.preventDefault()} onClick={() => applyWordSuggestion(word)}>
                        <span>{word}</span><ChevronRight aria-hidden="true" />
                      </button>
                      <button type="button" className="rr-writing-suggestion-speak" onMouseDown={(event) => event.preventDefault()} onClick={() => speak(word, undefined, 0.9, en ? "en-US" : "da-DK")} aria-label={`${tr("Hør", "Hear")} ${word}`}>
                        <Volume2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <p>{tr("Brug piletasterne og Enter, eller vælg et ord.", "Use the arrow keys and Enter, or choose a word.")}</p>
              </div>
            )}
          </div>
          {suggestion !== draft && (
            <button type="button" className="rr-function-suggestion" onClick={() => setDraft(suggestion)}>
              <span><b>{tr("Ret hele sætningen:", "Correct the whole sentence:")}</b> {suggestion}</span><Check aria-hidden="true" />
            </button>
          )}
          {sentenceSuggestions.length > 0 && (
          <div className="rr-sentence-suggestions">
              <b>{tr("Fuldend sætningen", "Complete the sentence")}</b>
              <div>
                {sentenceSuggestions.map((sentence) => (
                  <button key={sentence} type="button" onClick={() => { setDraft(sentence); setCaret(sentence.length); setSuggestionOpen(false); }}>
                    {sentence}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="rr-subject-words">
            <div>
              <label htmlFor="function-subject">{tr("Fagord", "Subject terms")}</label>
              <select id="function-subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
                {Object.keys(subjectTerms).map((name) => <option key={name}>{name}</option>)}
              </select>
            </div>
            <form onSubmit={(event) => {
              event.preventDefault();
              const value = personalTerm.trim().toLocaleLowerCase("da-DK");
              if (value && !personalTerms.includes(value)) setPersonalTerms((current) => [...current, value]);
              setPersonalTerm("");
            }}>
              <label htmlFor="function-personal-term">{tr("Min personlige fagordsliste", "My personal subject word list")}</label>
              <div><input id="function-personal-term" value={personalTerm} onChange={(event) => setPersonalTerm(event.target.value)} placeholder={tr("Tilføj et fagord", "Add a subject term")} /><button type="submit">{tr("Tilføj", "Add")}</button></div>
            </form>
            <p>{[...(subjectTerms[subject] || []), ...personalTerms].join(" · ")}</p>
          </div>
          <div className="rr-writing-results" aria-live="polite">
            {writingResults.filter((result) => checks.has(result.name)).map((result) => (
              <div key={result.name}>
                <b>{en ? ({ Stavning: "Spelling", Grammatik: "Grammar", Komma: "Commas", Tegnsætning: "Punctuation", Ordforslag: "Word suggestions" } as Record<string, string>)[result.name] : result.name}</b>
                <span>{result.text}</span>
              </div>
            ))}
            {checks.size === 0 && <p>{tr("Vælg mindst én type hjælp i boksen nedenfor.", "Choose at least one type of support below.")}</p>}
          </div>
          {checks.has("Grammatik") && grammarAnalysis.tokens.length > 0 && (
            <div className="rr-grammar-visual" aria-live="polite">
              <div className="rr-grammar-visual-head">
                <span><Sparkles aria-hidden="true" /><b>{tr("Visuel grammatikanalyse", "Visual grammar analysis")}</b></span>
                <small>{tr("Ordklasserne ændrer sig, når du skriver.", "Word classes update as you type.")}</small>
              </div>
              <div className="rr-grammar-tokens" aria-label={tr("Ordklasser i din tekst", "Word classes in your text")}>
                {grammarAnalysis.tokens.map((token, index) => (
                  <span key={`${token.word}-${index}`} data-word-class={token.wordClass}>
                    <b>{token.word}</b><small>{en ? ({ noun: "Noun", verb: "Verb", adjective: "Adjective", pronoun: "Pronoun", other: "Other" } as Record<string, string>)[token.wordClass] : WORD_CLASS_LABELS[token.wordClass]}</small>
                    {token.word === grammarAnalysis.subject && <em>× {tr("Grundled", "Subject")}</em>}
                    {token.word === grammarAnalysis.predicate && <em>○ {tr("Udsagnsled", "Verb")}</em>}
                  </span>
                ))}
              </div>
              <div className="rr-grammar-sentence-parts">
                <span><b>{tr("Grundled", "Subject")}</b>{grammarAnalysis.subject}</span>
                <span><b>{tr("Udsagnsled", "Verb")}</b>{grammarAnalysis.predicate}</span>
              </div>
              <p>{tr("Analysen er en enkel prøvevisning. Den fulde skrivehjælp vurderer også sætningen i sammenhæng.", "This is a simple preview. The full writing support also evaluates the sentence in context.")}</p>
              {checks.has("Komma") && (
                <div className="rr-grammar-comma-demo">
                  <b>{tr("Kommahjælp direkte i teksten", "Comma guidance in your text")}</b>
                  {commaLearningSuggestions.length ? commaLearningSuggestions.map((item) => (
                    <button key={item.index} type="button" onClick={() => { setDraft(item.corrected); setCaret(item.corrected.length); }}>
                      <span>{item.corrected}</span><small>{item.rule}</small><em>{tr("Brug forslaget", "Use suggestion")}</em>
                    </button>
                  )) : <p>{tr("Skriv en længere sætning med ‘men’, ‘fordi’, ‘når’ eller ‘hvis’, så viser ReliefRead, hvor et komma kan mangle.", "Write a longer sentence with a conjunction to see comma guidance.")}</p>}
                </div>
              )}
              <CommaGuide sentence={draft} />
            </div>
          )}
        </article>

        <article className="rr-function-card rr-function-check-card">
          <div className="rr-function-card-title"><Check aria-hidden="true" /><h3>{tr("Vælg din hjælp", "Choose your support")}</h3></div>
          <div className="rr-function-checks">
            {CHECKS.map((name) => (
              <button key={name} type="button" aria-pressed={checks.has(name)} onClick={() => toggleCheck(name)}>
                <span>{checks.has(name) && <Check aria-hidden="true" />}</span>{en ? ({ Stavning: "Spelling", Grammatik: "Grammar", Komma: "Commas", Tegnsætning: "Punctuation", Ordforslag: "Word suggestions" } as Record<string, string>)[name] : name}
              </button>
            ))}
          </div>
        </article>

        <article className="rr-function-card rr-function-voice">
          <div className="rr-function-card-title"><Volume2 aria-hidden="true" /><h3>{tr("Få teksten læst højt", "Have text read aloud")}</h3></div>
          <label htmlFor="function-voice-text">{tr("Skriv eller indsæt tekst", "Write or paste text")}</label>
          <textarea
            ref={voiceTextareaRef}
            id="function-voice-text"
            value={voiceText}
            onChange={(event) => setVoiceText(event.target.value)}
            onSelect={(event) => setVoiceSelection(event.currentTarget.selectionStart !== event.currentTarget.selectionEnd)}
          />
          <div className="rr-reading-presets" aria-label={tr("Tilpas oplæsningen", "Adjust read-aloud settings")}>
            <label>{tr("Teksttype", "Text type")}
              <select value={readingSpeed} onChange={(event) => setReadingSpeed(Number(event.target.value))}>
                <option value="1.15">{tr("Skønlitteratur. Hurtigere", "Fiction. Faster")}</option>
                <option value="0.8">{tr("Fagtekst. Langsommere", "Academic text. Slower")}</option>
                <option value="0.9">{tr("Almindelig tekst", "General text")}</option>
              </select>
            </label>
            <label>{tr("Hvad skal læses?", "What should be read?")}
              <select value={readingMode} onChange={(event) => setReadingMode(event.target.value as (typeof READING_MODES)[number])}>
                {READING_MODES.map((mode) => <option key={mode} value={mode}>{en ? ({ "Læs hele teksten": "Read all text", "Læs ord": "Read word", "Læs sætning": "Read sentence", "Læs bogstavnavn": "Read letter name", "Læs bogstavlyd": "Read letter sound" } as Record<string, string>)[mode] : mode}</option>)}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={readVoiceText}
            className="rr-function-mic"
            aria-label={voiceReading ? tr("Stop oplæsning", "Stop reading") : voiceSelection ? tr("Læs den markerede tekst højt", "Read the selected text aloud") : tr("Læs hele teksten højt", "Read all text aloud")}
          >
            {voiceReading ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <p>
            {en ? ({ "Læs hele teksten": "Read all text", "Læs ord": "Read word", "Læs sætning": "Read sentence", "Læs bogstavnavn": "Read letter name", "Læs bogstavlyd": "Read letter sound" } as Record<string, string>)[readingMode] : readingMode} {tr("ved", "at")} {readingSpeed.toFixed(2).replace(".", ",")}×. {voiceSelection
              ? tr("Tryk for at læse din markering op.", "Press to read your selection aloud.")
              : tr("Placér markøren i teksten, eller markér det, du vil høre.", "Place the cursor in the text or select what you want to hear.")}
          </p>
          <div className="rr-function-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        </article>

        <article className="rr-function-card rr-function-dictionary">
          <div className="rr-function-card-title"><BookOpen aria-hidden="true" /><h3>{tr("Hvad kan en ordbog hjælpe med?", "What can a dictionary help with?")}</h3></div>
          <form className="rr-dictionary-search" onSubmit={(event) => { event.preventDefault(); void findDictionaryWord(); }}>
            <label htmlFor="function-lookup">{tr("Skriv et ord", "Enter a word")}</label>
            <div>
              <input id="function-lookup" value={lookup} onChange={(event) => setLookup(event.target.value)} spellCheck="false" />
              <button type="submit" aria-label={tr("Slå ordet op", "Look up the word")}><Search aria-hidden="true" /></button>
            </div>
          </form>
          {dictionaryLoading ? (
            <div className="rr-dictionary-miss" role="status"><b>{tr("Slår ordet op...", "Looking up the word...")}</b><span>{tr("Vi søger i den danske ordbog.", "Searching the English dictionary.")}</span></div>
          ) : dictionaryMiss ? (
            <div className="rr-dictionary-miss" role="status">
              <b>{tr("Vi kunne ikke finde ordet.", "We could not find the word.")}</b>
              <span>{tr("Kontrollér stavningen, eller prøv en anden bøjning af ordet.", "Check the spelling or try another form of the word.")}</span>
            </div>
          ) : (
            <dl className="rr-dictionary-result" aria-live="polite">
              <div><dt>{tr("Betydning", "Meaning")}</dt><dd>{dictionaryEntry.meaning}</dd></div>
              <div><dt>{tr("Stavning", "Spelling")}</dt><dd>{dictionaryEntry.word}</dd></div>
              <div><dt>{tr("Engelsk", "Danish")}</dt><dd>{dictionaryEntry.translation}</dd></div>
              <div><dt>{tr("Bøjning", "Inflection")}</dt><dd>{dictionaryEntry.inflection}</dd></div>
              {dictionaryEntry.sourceUrl && <div><dt>{tr("Mere information", "More information")}</dt><dd><a href={dictionaryEntry.sourceUrl} target="_blank" rel="noreferrer">{tr("Åbn hele ordbogsopslaget", "Open the full dictionary entry")}</a></dd></div>}
            </dl>
          )}
          <button type="button" disabled={dictionaryMiss || dictionaryLoading} onClick={() => speak(dictionaryEntry.word, undefined, 0.9, en ? "en-US" : "da-DK")}><Volume2 aria-hidden="true" /> {tr("Hør udtalen", "Hear pronunciation")}</button>
        </article>

        <article className="rr-function-card rr-function-reading">
          <div className="rr-function-card-title"><Type aria-hidden="true" /><h3>{tr("Tekststørrelse og afstand", "Text size and spacing")}</h3></div>
          <div className="rr-function-stepper">
            <button type="button" onClick={() => setFontSize((value) => Math.max(16, value - 1))} aria-label={tr("Gør teksten mindre", "Make text smaller")}><Minus /></button>
            <span>A <b>{fontSize}</b> A</span>
            <button type="button" onClick={() => setFontSize((value) => Math.min(30, value + 1))} aria-label={tr("Gør teksten større", "Make text larger")}><Plus /></button>
          </div>
          <label>{tr("Linjeafstand", "Line spacing")} <input type="range" min="1.4" max="2.5" step="0.1" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} /></label>
          <label>{tr("Bogstavafstand", "Letter spacing")} <input type="range" min="0" max="0.12" step="0.01" value={letterSpacing} onChange={(event) => setLetterSpacing(Number(event.target.value))} /></label>
        </article>
      </div>

      <div className="rr-function-toolbar" aria-label={tr("Prøv værktøjslinjen", "Try the toolbar")}>
        {TOOL_BUTTONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={activeTool === id} onClick={() => setActiveTool(id)}>
            <Icon aria-hidden="true" /><span>{en ? ({ read: "Read", mark: "Highlight", voice: "Speak", font: "Text", words: "Dictionary" } as Record<string, string>)[id] : label}</span>
          </button>
        ))}
      </div>

      <div className="rr-function-tool-panel" aria-live="polite">
        {activeTool === "read" && (
          <div>
            <div><Volume2 aria-hidden="true" /><span><b>{tr("Læs teksten højt", "Read text aloud")}</b><small>{tr("Marker et stykke tekst, eller læs det hele.", "Select part of the text or read it all.")}</small></span></div>
            <div className="rr-function-panel-actions">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => readSample(false)}>{sampleReading ? <Pause /> : <Play />} {sampleReading ? tr("Stop", "Stop") : tr("Læs hele teksten", "Read all text")}</button>
              <button type="button" disabled={!sampleSelection} onMouseDown={(event) => event.preventDefault()} onClick={() => readSample(true)}><Volume2 /> {tr("Læs markeringen", "Read selection")}</button>
            </div>
          </div>
        )}

        {activeTool === "mark" && (
          <div>
            <div><Highlighter aria-hidden="true" /><span><b>{tr("Marker tekst", "Highlight text")}</b><small>{tr("Vælg tekst i prøveteksten og tryk på en farve.", "Select text in the sample and choose a colour.")}</small></span></div>
            <div className="rr-function-highlight-colors" aria-label={tr("Vælg markeringsfarve", "Choose highlight colour")}>
              {HIGHLIGHT_COLORS.map((color) => <button key={color} type="button" aria-pressed={highlightColor === color} aria-label={`${tr("Marker med farven", "Highlight with colour")} ${color}`} style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => applyHighlight(color)} />)}
            </div>
          </div>
        )}

        {activeTool === "voice" && (
          <div>
            <div><Mic aria-hidden="true" /><span><b>{tr("Tal til prøveteksten", "Speak into the sample text")}</b><small>{tr("Det, du siger, bliver skrevet ind nederst i teksten.", "What you say is added to the end of the text.")}</small></span></div>
            <button type="button" className="rr-function-primary-action" onClick={dictation.listening ? dictation.stop : dictation.start}><Mic /> {dictation.listening ? tr("Stop diktering", "Stop dictation") : tr("Start diktering", "Start dictation")}</button>
            {dictation.interim && <p className="rr-function-interim">{tr("Jeg hører:", "I hear:")} {dictation.interim}</p>}
            {dictation.error && <p className="rr-function-panel-error">{tr("Mikrofonen kunne ikke startes. Tillad mikrofonen i browseren, og prøv igen.", "The microphone could not start. Allow it in your browser and try again.")}</p>}
            {!dictation.supported && <p className="rr-function-panel-error">{tr("Diktering virker bedst i Chrome eller Edge.", "Dictation works best in Chrome or Edge.")}</p>}
          </div>
        )}

        {activeTool === "font" && (
          <div>
            <div><Type aria-hidden="true" /><span><b>{tr("Rediger teksten", "Edit the text")}</b><small>{tr("Klik direkte i prøveteksten for at skrive. Her kan du også ændre visningen.", "Click directly in the sample to write. You can also adjust the display.")}</small></span></div>
            <div className="rr-function-inline-controls">
              <button type="button" onClick={() => setFontSize((value) => Math.max(16, value - 1))}><Minus /> {tr("Mindre", "Smaller")}</button>
              <b>{fontSize} px</b>
              <button type="button" onClick={() => setFontSize((value) => Math.min(30, value + 1))}><Plus /> {tr("Større", "Larger")}</button>
              <button type="button" onClick={resetSample}><X /> {tr("Gendan tekst", "Reset text")}</button>
            </div>
          </div>
        )}

        {activeTool === "words" && (
          <form onSubmit={(event) => { event.preventDefault(); void findDictionaryWord(); }}>
            <div><BookOpen aria-hidden="true" /><span><b>{tr("Ordbog", "Dictionary")}</b><small>{tr("Skriv et ord for at se betydning, stavning, oversættelse og bøjning.", "Enter a word to see its meaning, spelling, translation and inflection.")}</small></span></div>
            <label htmlFor="function-toolbar-lookup">{tr("Slå et ord op", "Look up a word")}</label>
            <div className="rr-function-panel-search"><input id="function-toolbar-lookup" value={lookup} onChange={(event) => setLookup(event.target.value)} /><button type="submit" aria-label={tr("Slå ordet op", "Look up the word")}><Search /></button></div>
            {dictionaryLoading && <p className="rr-function-dictionary-compact">{tr("Slår ordet op...", "Looking up the word...")}</p>}
            {!dictionaryLoading && !dictionaryMiss && <p className="rr-function-dictionary-compact"><b>{dictionaryEntry.word}</b><span>{dictionaryEntry.meaning}</span><small>{dictionaryEntry.translation}. {dictionaryEntry.inflection}</small></p>}
            {!dictionaryLoading && dictionaryMiss && <p className="rr-function-panel-error">{tr("Vi kunne ikke finde ordet. Kontrollér stavningen, og prøv igen.", "We could not find the word. Check the spelling and try again.")}</p>}
          </form>
        )}
      </div>

      <div className="rr-function-paper" style={{ fontSize, lineHeight, letterSpacing: `${letterSpacing}em` }}>
        <div className="rr-function-paper-main">
          <span className="rr-function-paper-label">{tr("Prøvetekst", "Sample text")}</span>
          <div
            ref={sampleRef}
            className="rr-function-editable"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={tr("Redigerbar prøvetekst", "Editable sample text")}
            onInput={(event) => setSampleText(event.currentTarget.innerText)}
            onMouseUp={rememberSampleSelection}
            onKeyUp={rememberSampleSelection}
          >
            {en ? INITIAL_SAMPLE_EN : INITIAL_SAMPLE}
          </div>
          <small>{tr("Valgt værktøj:", "Selected tool:")} <b>{en ? ({ read: "Read", mark: "Highlight", voice: "Speak", font: "Text", words: "Dictionary" } as Record<string, string>)[activeTool] : TOOL_BUTTONS.find((tool) => tool.id === activeTool)?.label}</b>. {tr("Klik i teksten for at redigere.", "Click the text to edit it.")}</small>
        </div>
        <aside className="rr-function-note-preview">
          <NotebookText aria-hidden="true" />
          <label htmlFor="function-note"><b>{tr("Min note", "My note")}</b></label>
          <textarea id="function-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={tr("Skriv din note direkte her...", "Write your note here...")} />
        </aside>
      </div>
    </section>
  );
}

export default FunctionPlayground;
