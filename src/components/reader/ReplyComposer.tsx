import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Clipboard,
  Loader2,
  PenLine,
  Play,
  RotateCcw,
  Send,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SoftNotice } from "@/components/SoftNotice";
import { toast } from "@/components/ui/sonner";
import { useSpeech } from "@/hooks/useSpeech";
import { bcp47For } from "@/lib/reader-tokens";
import {
  generateReplyDraft,
  type ReplyLength,
  type ReplyMode,
  type ReplyTone,
} from "@/lib/reply-assistant";
import { queueIncomingWritingDraft } from "@/lib/writing-draft";

interface ReplyComposerProps {
  documentTitle: string;
  documentText: string;
  lang: "da" | "en";
}

const MODES: Array<{ value: ReplyMode; da: string; en: string }> = [
  { value: "compose", da: "Skriv svar", en: "Write reply" },
  { value: "friendly", da: "Gør venligere", en: "Make friendlier" },
  { value: "fix-only", da: "Ret kun fejl", en: "Fix errors only" },
];

const TONES: Array<{ value: ReplyTone; da: string; en: string }> = [
  { value: "natural", da: "Naturlig", en: "Natural" },
  { value: "warm", da: "Venlig", en: "Warm" },
  { value: "formal", da: "Formel", en: "Formal" },
];

const LENGTHS: Array<{ value: ReplyLength; da: string; en: string }> = [
  { value: "short", da: "Kort", en: "Short" },
  { value: "normal", da: "Normal", en: "Normal" },
  { value: "detailed", da: "Detaljeret", en: "Detailed" },
];

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  lang,
}: {
  label: string;
  options: Array<{ value: T; da: string; en: string }>;
  value: T;
  onChange: (value: T) => void;
  lang: "da" | "en";
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "border-primary bg-accent text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              {option[lang]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReplyComposer({ documentTitle, documentText, lang }: ReplyComposerProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<ReplyMode>("compose");
  const [tone, setTone] = useState<ReplyTone>("natural");
  const [length, setLength] = useState<ReplyLength>("normal");
  const [userText, setUserText] = useState("");
  const [draft, setDraft] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const {
    supported: speechSupported,
    speaking: speechSpeaking,
    speak: speakReply,
    stop: stopReplySpeech,
  } = useSpeech();

  useEffect(() => {
    requestRef.current += 1;
    setExpanded(false);
    setUserText("");
    setDraft("");
    setGeneratedDraft("");
    setError(null);
    setLoading(false);
    stopReplySpeech();
    return () => {
      requestRef.current += 1;
    };
  }, [documentTitle, documentText, stopReplySpeech]);

  const makeReply = async () => {
    if (loading) return;
    if (mode !== "compose" && !userText.trim()) {
      setError(
        lang === "da"
          ? "Indsæt først den tekst, du vil have hjælp til."
          : "First paste the text you want help with."
      );
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    stopReplySpeech();
    try {
      const result = await generateReplyDraft({
        documentTitle,
        documentText,
        userText,
        mode,
        tone,
        length,
        lang,
      });
      if (requestId !== requestRef.current) return;
      setDraft(result);
      setGeneratedDraft(result);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("Reply generation failed:", err);
      setError(
        lang === "da"
          ? "Svarforslaget kunne ikke laves lige nu. Din tekst er stadig sikker. Prøv igen om lidt."
          : "We couldn't create the reply just now. Your text is still safe. Try again shortly."
      );
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  const copyDraft = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(draft);
      toast(lang === "da" ? "Svarforslaget er kopieret." : "Reply copied.");
      return true;
    } catch {
      toast(lang === "da" ? "Teksten kunne ikke kopieres på denne enhed." : "The text could not be copied on this device.");
      return false;
    }
  };

  const openWritingStudio = async () => {
    if (!draft.trim()) return;
    const queued = queueIncomingWritingDraft({
      title: `${lang === "da" ? "Svar på" : "Reply to"} ${documentTitle}`.slice(0, 120),
      text: draft.trim(),
    });
    if (!queued) {
      const copied = await copyDraft();
      if (!copied) {
        setError(
          lang === "da"
            ? "Svarforslaget kunne ikke flyttes automatisk. Teksten er stadig her, så du kan markere og kopiere den."
            : "The reply could not be transferred automatically. It is still here, so you can select and copy it."
        );
        return;
      }
      toast(
        lang === "da"
          ? "Svaret er kopieret. Indsæt det i skriveværkstedet."
          : "The reply is copied. Paste it into the writing studio."
      );
    }
    navigate("/write");
  };

  const inputLabel = mode === "compose"
    ? (lang === "da" ? "Dine stikord eller din rå tekst" : "Your notes or rough text")
    : (lang === "da" ? "Din nuværende tekst" : "Your current text");
  const placeholder = mode === "compose"
    ? (lang === "da" ? "Valgfrit. Skriv fx hvad du vil sige, datoer eller beløb, som skal med." : "Optional. Add what you want to say, including any dates or amounts.")
    : (lang === "da" ? "Indsæt dit svar her." : "Paste your reply here.");

  return (
    <section className="rounded-3xl border border-primary/20 bg-card shadow-paper">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((current) => !current);
          stopReplySpeech();
        }}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-3xl px-4 text-left font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
            <Send className="h-4 w-4" />
          </span>
          {lang === "da" ? "Hjælp mig med et svar" : "Help me write a reply"}
        </span>
        {expanded ? <ChevronUp className="h-5 w-5 text-primary" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-primary" aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-border px-4 pb-5 pt-4">
          <ChoiceRow
            label={lang === "da" ? "Hvad vil du gøre?" : "What would you like to do?"}
            options={MODES}
            value={mode}
            onChange={(value) => {
              setMode(value);
              setError(null);
              setDraft("");
              setGeneratedDraft("");
            }}
            lang={lang}
          />

          {mode === "compose" && (
            <>
              <ChoiceRow
                label={lang === "da" ? "Tone" : "Tone"}
                options={TONES}
                value={tone}
                onChange={setTone}
                lang={lang}
              />
              <ChoiceRow
                label={lang === "da" ? "Længde" : "Length"}
                options={LENGTHS}
                value={length}
                onChange={setLength}
                lang={lang}
              />
            </>
          )}

          <div>
            <label htmlFor="reply-source-text" className="mb-2 block text-sm font-semibold text-foreground">
              {inputLabel}
            </label>
            <Textarea
              id="reply-source-text"
              value={userText}
              onChange={(event) => setUserText(event.target.value)}
              placeholder={placeholder}
              className="min-h-32 resize-y rounded-2xl bg-background text-base leading-relaxed"
            />
          </div>

          {error && <SoftNotice>{error}</SoftNotice>}

          <Button
            type="button"
            onClick={() => void makeReply()}
            disabled={loading}
            className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {loading
              ? (lang === "da" ? "Laver svarforslaget" : "Creating reply")
              : (lang === "da" ? "Lav svarforslag" : "Create reply")}
          </Button>

          {draft && (
            <div className="border-t border-border pt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="reply-result" className="text-sm font-semibold text-foreground">
                  {lang === "da" ? "Dit svarforslag" : "Your reply draft"}
                </label>
                {draft !== generatedDraft && (
                  <button
                    type="button"
                    onClick={() => setDraft(generatedDraft)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {lang === "da" ? "Fortryd ændringer" : "Undo edits"}
                  </button>
                )}
              </div>
              <Textarea
                id="reply-result"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-56 resize-y rounded-2xl bg-background text-base leading-relaxed"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === "da" ? "Du bestemmer. Intet sendes automatisk." : "You decide. Nothing is sent automatically."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {speechSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => speechSpeaking ? stopReplySpeech() : speakReply(draft, { lang: bcp47For(lang), rate: 0.92 })}
                    className="h-11 rounded-full"
                  >
                    {speechSpeaking ? <Square className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    {speechSpeaking ? "Stop" : (lang === "da" ? "Læs højt" : "Read aloud")}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => void copyDraft()} className="h-11 rounded-full">
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  {lang === "da" ? "Kopiér" : "Copy"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void openWritingStudio()}
                  className="col-span-2 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                  {lang === "da" ? "Åbn i skriveværkstedet" : "Open in writing studio"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ReplyComposer;
