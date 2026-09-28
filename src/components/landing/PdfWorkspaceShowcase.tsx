import { useMemo, useRef, useState } from "react";
import { BookOpen, FileText, Highlighter, Loader2, Mic, MicOff, Play, Upload, Volume2 } from "lucide-react";
import { extractTextFromFile } from "@/lib/import-text";
import { getWritingSuggestions, insertWritingSuggestion } from "@/lib/writing-tools";
import { useDictation } from "@/hooks/useDictation";

const SAMPLE_TEXT = `Opgave: Forklar, hvorfor rent drikkevand er vigtigt.

Rent drikkevand er afgørende for menneskers sundhed. Vand bruges både som drikkevand, til madlavning og til personlig hygiejne. Når vand bliver forurenet, kan bakterier og andre skadelige stoffer sprede sygdomme.

Skriv et kort svar med dine egne ord. Brug gerne fagordene sundhed, bakterier og forurening.`;

function speak(text: string, onEnd: () => void) {
  if (!("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "da-DK";
  utterance.rate = 0.88;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function PdfWorkspaceShowcase() {
  const [documentText, setDocumentText] = useState(SAMPLE_TEXT);
  const [fileName, setFileName] = useState("Opgave om drikkevand.pdf");
  const [answer, setAnswer] = useState("Rent drikkevand er vigtigt, fordi");
  const [answerCaret, setAnswerCaret] = useState(answer.length);
  const [selection, setSelection] = useState("");
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const dictation = useDictation({
    lang: "da-DK",
    onFinal: (spoken) => {
      setAnswer((current) => {
        const position = answerRef.current?.selectionStart ?? current.length;
        const needsSpace = position > 0 && !/\s$/.test(current.slice(0, position));
        const addition = `${needsSpace ? " " : ""}${spoken}`;
        const next = `${current.slice(0, position)}${addition}${current.slice(position)}`;
        const nextCaret = position + addition.length;
        setAnswerCaret(nextCaret);
        window.setTimeout(() => {
          answerRef.current?.focus();
          answerRef.current?.setSelectionRange(nextCaret, nextCaret);
        }, 0);
        return next;
      });
    },
  });

  const suggestions = useMemo(() => {
    const result = getWritingSuggestions(answer, answerCaret, "da");
    return Array.from(new Set([...result.words, ...result.nextWords, "sundhed", "bakterier", "forurening"]))
      .filter(Boolean)
      .slice(0, 6);
  }, [answer, answerCaret]);

  const readDocument = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const text = selection || documentText;
    setReading(true);
    if (!speak(text, () => setReading(false))) setReading(false);
  };

  const rememberSelection = () => {
    const field = documentRef.current;
    if (!field) return;
    setSelection(field.value.slice(field.selectionStart, field.selectionEnd).trim());
  };

  const addSuggestion = (word: string) => {
    const result = insertWritingSuggestion(answer, answerCaret, word, true);
    setAnswer(result.text);
    setAnswerCaret(result.caret);
    window.setTimeout(() => {
      answerRef.current?.focus();
      answerRef.current?.setSelectionRange(result.caret, result.caret);
    }, 0);
  };

  const openPdf = async (file: File | undefined) => {
    if (!file) return;
    setNotice("");
    setLoading(true);
    try {
      const result = await extractTextFromFile(file);
      if (result.kind !== "pdf") {
        setNotice("Vælg en PDF-fil for at prøve PDF-arbejdsområdet.");
      } else if (result.scanned) {
        setNotice("PDF’en består af scannede billeder. OCR-læsning bliver tilføjet som næste del.");
      } else if (!result.text.trim()) {
        setNotice("Vi kunne ikke finde læsbar tekst i denne PDF.");
      } else {
        setDocumentText(result.text);
        setFileName(file.name);
        setSelection("");
        setNotice("PDF’en er klar. Markér en passage, eller få hele teksten læst højt.");
      }
    } catch {
      setNotice("PDF’en kunne ikke åbnes lige nu. Prøv en anden PDF med markerbar tekst.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rr-pdf-showcase">
      <div className="rr-pdf-heading">
        <span>PDF-arbejdsområde</span>
        <h2>Arbejd uden besvær i PDF-filer</h2>
        <p>
          Åbn digitale undervisningsmaterialer direkte i ReliefRead. Eleven kan markere en passage,
          få den læst højt og skrive svar med kontekstbaserede ordforslag, så spørgsmål og svar bliver samlet ét sted.
        </p>
      </div>

      <div className="rr-pdf-workspace">
        <div className="rr-pdf-document">
          <div className="rr-pdf-toolbar">
            <span><FileText aria-hidden="true" /><b>{fileName}</b></span>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}>
                {loading ? <Loader2 className="rr-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                {loading ? "Åbner..." : "Vælg PDF"}
              </button>
              <button type="button" onClick={readDocument}>
                {reading ? <Volume2 aria-hidden="true" /> : <Play aria-hidden="true" />}
                {reading ? "Stop" : selection ? "Læs markering" : "Læs teksten"}
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={(event) => void openPdf(event.target.files?.[0])}
          />
          <div className="rr-pdf-page">
            <div className="rr-pdf-page-label"><BookOpen aria-hidden="true" /> Marker den tekst, du vil høre</div>
            <textarea
              ref={documentRef}
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              onSelect={rememberSelection}
              aria-label="Tekst fra PDF"
            />
          </div>
          {notice && <p className="rr-pdf-notice" role="status">{notice}</p>}
        </div>

        <aside className="rr-pdf-answer">
          <div className="rr-pdf-answer-title"><Highlighter aria-hidden="true" /><span><b>Dit svar</b><small>Skriv direkte ved siden af opgaven</small></span></div>
          <label htmlFor="pdf-answer">Svar med dine egne ord</label>
          <textarea
            ref={answerRef}
            id="pdf-answer"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setAnswerCaret(event.currentTarget.selectionStart);
            }}
            onSelect={(event) => setAnswerCaret(event.currentTarget.selectionStart)}
          />
          <div className="rr-pdf-dictation">
            <button
              type="button"
              onClick={dictation.listening ? dictation.stop : dictation.start}
              disabled={dictation.requesting || !dictation.supported}
              aria-pressed={dictation.listening}
            >
              {dictation.listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
              {dictation.requesting ? "Forbinder mikrofon..." : dictation.listening ? "Stop indtaling" : "Indtal dit svar"}
            </button>
            <span>{dictation.listening ? "Jeg lytter. Tal i dit eget tempo." : "Din tale sættes direkte ind ved markøren."}</span>
          </div>
          {dictation.interim && <p className="rr-pdf-interim" aria-live="polite">Hører: {dictation.interim}</p>}
          {dictation.error && (
            <p className="rr-pdf-dictation-error" role="alert">
              Mikrofonen kunne ikke startes. Giv ReliefRead adgang til mikrofonen i browserens adressefelt, og prøv igen.
            </p>
          )}
          {!dictation.supported && <p className="rr-pdf-dictation-error">Tale-til-tekst kræver en browser med talegenkendelse, for eksempel Chrome eller Edge.</p>}
          <div className="rr-pdf-suggestions">
            <b>Ordforslag</b>
            <div>
              {suggestions.map((word) => <button key={word} type="button" onClick={() => addSuggestion(word)}>{word}</button>)}
            </div>
          </div>
          <button type="button" className="rr-pdf-read-answer" onClick={() => speak(answer, () => undefined)}>
            <Volume2 aria-hidden="true" /> Læs mit svar højt
          </button>
        </aside>
      </div>

      <div className="rr-speech-feature">
        <div>
          <span>Tale-til-tekst i ReliefRead</span>
          <h3>Indtal tankerne. Se dem som tekst. Lyt og ret.</h3>
          <p>
            Eleven kan formulere sine idéer med stemmen og få dem sat direkte ind i skrivefeltet.
            Ordforslag hjælper videre, og oplæsning gør det lettere at opdage fejl og uklare sætninger.
          </p>
        </div>
        <ol aria-label="Sådan bruges tale-til-tekst">
          <li><Mic aria-hidden="true" /><span><b>1. Indtal</b><small>Tal i dit eget tempo</small></span></li>
          <li><Highlighter aria-hidden="true" /><span><b>2. Skriv videre</b><small>Brug relevante ordforslag</small></span></li>
          <li><Volume2 aria-hidden="true" /><span><b>3. Lyt og ret</b><small>Hør om teksten lyder rigtig</small></span></li>
        </ol>
      </div>

      <p className="rr-pdf-footnote">PDF’er med markerbar tekst virker nu. OCR til papirark og scannede PDF’er er næste trin.</p>
    </div>
  );
}
