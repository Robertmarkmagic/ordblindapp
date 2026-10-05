import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileText, Highlighter, Loader2, Mic, MicOff, Play, Upload, Volume2 } from "lucide-react";
import { extractTextFromFile } from "@/lib/import-text";
import { getWritingSuggestions, insertWritingSuggestion } from "@/lib/writing-tools";
import { useDictation } from "@/hooks/useDictation";
import { useLanguage } from "@/lib/i18n";

const SAMPLE_TEXT = `Opgave: Forklar, hvorfor rent drikkevand er vigtigt.

Rent drikkevand er afgørende for menneskers sundhed. Vand bruges både som drikkevand, til madlavning og til personlig hygiejne. Når vand bliver forurenet, kan bakterier og andre skadelige stoffer sprede sygdomme.

Skriv et kort svar med dine egne ord. Brug gerne fagordene sundhed, bakterier og forurening.`;

const SAMPLE_TEXT_EN = `Task: Explain why clean drinking water is important.

Clean drinking water is essential for human health. Water is used for drinking, cooking and personal hygiene. When water becomes polluted, bacteria and other harmful substances can spread disease.

Write a short answer in your own words. You may use the subject terms health, bacteria and pollution.`;

function speak(text: string, onEnd: () => void, lang = "da-DK") {
  if (!("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.88;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function PdfWorkspaceShowcase() {
  const { language } = useLanguage();
  const en = language === "en";
  const tr = (da: string, english: string) => en ? english : da;
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

  useEffect(() => {
    setDocumentText(en ? SAMPLE_TEXT_EN : SAMPLE_TEXT);
    setFileName(en ? "Drinking water assignment.pdf" : "Opgave om drikkevand.pdf");
    setAnswer(en ? "Clean drinking water is important because" : "Rent drikkevand er vigtigt, fordi");
    setNotice("");
  }, [en]);

  const dictation = useDictation({
    lang: en ? "en-US" : "da-DK",
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
    const result = getWritingSuggestions(answer, answerCaret, en ? "en" : "da");
    return Array.from(new Set([...result.words, ...result.nextWords, ...(en ? ["health", "bacteria", "pollution"] : ["sundhed", "bakterier", "forurening"])]))
      .filter(Boolean)
      .slice(0, 6);
  }, [answer, answerCaret, en]);

  const readDocument = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const text = selection || documentText;
    setReading(true);
    if (!speak(text, () => setReading(false), en ? "en-US" : "da-DK")) setReading(false);
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
        setNotice(tr("Vælg en PDF-fil for at prøve PDF-arbejdsområdet.", "Choose a PDF file to try the PDF workspace."));
      } else if (result.scanned) {
        setNotice(tr("PDF’en består af scannede billeder. OCR-læsning bliver tilføjet som næste del.", "This PDF contains scanned images. OCR reading will be added in the next step."));
      } else if (!result.text.trim()) {
        setNotice(tr("Vi kunne ikke finde læsbar tekst i denne PDF.", "We could not find readable text in this PDF."));
      } else {
        setDocumentText(result.text);
        setFileName(file.name);
        setSelection("");
        setNotice(tr("PDF’en er klar. Markér en passage, eller få hele teksten læst højt.", "The PDF is ready. Select a passage or have the entire text read aloud."));
      }
    } catch {
      setNotice(tr("PDF’en kunne ikke åbnes lige nu. Prøv en anden PDF med markerbar tekst.", "The PDF could not be opened right now. Try another PDF with selectable text."));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rr-pdf-showcase">
      <div className="rr-pdf-heading">
        <span>{tr("PDF-arbejdsområde", "PDF workspace")}</span>
        <h2>{tr("Arbejd uden besvær i PDF-filer", "Work easily with PDF files")}</h2>
        <p>
          {tr("Åbn digitale undervisningsmaterialer direkte i ReliefRead. Eleven kan markere en passage, få den læst højt og skrive svar med kontekstbaserede ordforslag, så spørgsmål og svar bliver samlet ét sted.", "Open digital learning materials directly in ReliefRead. Students can select a passage, hear it read aloud and write answers with context-aware word suggestions, keeping questions and answers together.")}
        </p>
      </div>

      <div className="rr-pdf-workspace">
        <div className="rr-pdf-document">
          <div className="rr-pdf-toolbar">
            <span><FileText aria-hidden="true" /><b>{fileName}</b></span>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}>
                {loading ? <Loader2 className="rr-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                {loading ? tr("Åbner...", "Opening...") : tr("Vælg PDF", "Choose PDF")}
              </button>
              <button type="button" onClick={readDocument}>
                {reading ? <Volume2 aria-hidden="true" /> : <Play aria-hidden="true" />}
                {reading ? tr("Stop", "Stop") : selection ? tr("Læs markering", "Read selection") : tr("Læs teksten", "Read text")}
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
            <div className="rr-pdf-page-label"><BookOpen aria-hidden="true" /> {tr("Marker den tekst, du vil høre", "Select the text you want to hear")}</div>
            <textarea
              ref={documentRef}
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              onSelect={rememberSelection}
              aria-label={tr("Tekst fra PDF", "Text from PDF")}
            />
          </div>
          {notice && <p className="rr-pdf-notice" role="status">{notice}</p>}
        </div>

        <aside className="rr-pdf-answer">
          <div className="rr-pdf-answer-title"><Highlighter aria-hidden="true" /><span><b>{tr("Dit svar", "Your answer")}</b><small>{tr("Skriv direkte ved siden af opgaven", "Write directly next to the task")}</small></span></div>
          <label htmlFor="pdf-answer">{tr("Svar med dine egne ord", "Answer in your own words")}</label>
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
              {dictation.requesting ? tr("Forbinder mikrofon...", "Connecting microphone...") : dictation.listening ? tr("Stop indtaling", "Stop dictation") : tr("Indtal dit svar", "Dictate your answer")}
            </button>
            <span>{dictation.listening ? tr("Jeg lytter. Tal i dit eget tempo.", "Listening. Speak at your own pace.") : tr("Din tale sættes direkte ind ved markøren.", "Your speech is inserted directly at the cursor.")}</span>
          </div>
          {dictation.interim && <p className="rr-pdf-interim" aria-live="polite">{tr("Hører:", "Hearing:")} {dictation.interim}</p>}
          {dictation.error && (
            <p className="rr-pdf-dictation-error" role="alert">
              {tr("Mikrofonen kunne ikke startes. Giv ReliefRead adgang til mikrofonen i browserens adressefelt, og prøv igen.", "The microphone could not start. Allow ReliefRead to use it in your browser and try again.")}
            </p>
          )}
          {!dictation.supported && <p className="rr-pdf-dictation-error">{tr("Tale-til-tekst kræver en browser med talegenkendelse, for eksempel Chrome eller Edge.", "Speech to text requires a browser with speech recognition, such as Chrome or Edge.")}</p>}
          <div className="rr-pdf-suggestions">
            <b>{tr("Ordforslag", "Word suggestions")}</b>
            <div>
              {suggestions.map((word) => <button key={word} type="button" onClick={() => addSuggestion(word)}>{word}</button>)}
            </div>
          </div>
          <button type="button" className="rr-pdf-read-answer" onClick={() => speak(answer, () => undefined, en ? "en-US" : "da-DK")}>
            <Volume2 aria-hidden="true" /> {tr("Læs mit svar højt", "Read my answer aloud")}
          </button>
        </aside>
      </div>

      <div className="rr-speech-feature">
        <div>
          <span>{tr("Tale-til-tekst i ReliefRead", "Speech to text in ReliefRead")}</span>
          <h3>{tr("Indtal tankerne. Se dem som tekst. Lyt og ret.", "Speak your thoughts. See them as text. Listen and edit.")}</h3>
          <p>
            {tr("Eleven kan formulere sine idéer med stemmen og få dem sat direkte ind i skrivefeltet. Ordforslag hjælper videre, og oplæsning gør det lettere at opdage fejl og uklare sætninger.", "Students can express ideas with their voice and insert them directly into the writing field. Word suggestions help them continue, while read-aloud support makes errors and unclear sentences easier to spot.")}
          </p>
        </div>
        <ol aria-label={tr("Sådan bruges tale-til-tekst", "How to use speech to text")}>
          <li><Mic aria-hidden="true" /><span><b>{tr("1. Indtal", "1. Dictate")}</b><small>{tr("Tal i dit eget tempo", "Speak at your own pace")}</small></span></li>
          <li><Highlighter aria-hidden="true" /><span><b>{tr("2. Skriv videre", "2. Keep writing")}</b><small>{tr("Brug relevante ordforslag", "Use relevant word suggestions")}</small></span></li>
          <li><Volume2 aria-hidden="true" /><span><b>{tr("3. Lyt og ret", "3. Listen and edit")}</b><small>{tr("Hør om teksten lyder rigtig", "Hear whether the text sounds right")}</small></span></li>
        </ol>
      </div>

      <p className="rr-pdf-footnote">{tr("PDF’er med markerbar tekst virker nu. OCR til papirark og scannede PDF’er er næste trin.", "PDFs with selectable text work now. OCR for paper documents and scanned PDFs is the next step.")}</p>
    </div>
  );
}
