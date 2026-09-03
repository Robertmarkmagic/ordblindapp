import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileCheck2,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Save,
  Sparkles,
  SpellCheck2,
  Volume2,
} from "lucide-react";
import { overskill, useAuth } from "@/lib/auth";
import { ReliefHeader } from "@/components/ReliefHeader";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoftNotice } from "@/components/SoftNotice";
import { useLanguage } from "@/lib/i18n";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDictation } from "@/hooks/useDictation";
import {
  useWritingReview,
  type WritingChecks,
  type WritingIssueType,
  type WritingReview,
} from "@/hooks/useWritingReview";
import {
  getWritingSuggestions,
  insertWritingSuggestion,
  replaceFirstExact,
} from "@/lib/writing-tools";
import { bcp47For, detectLanguage } from "@/lib/reader-tokens";
import { firstWords, wordCount } from "@/lib/text-utils";
import { getMonthlyUsage, recordDocumentCreated } from "@/lib/usage";
import { canCreateDocument } from "@/lib/billing";
import { usePremium } from "@/hooks/usePremium";

const DRAFT_KEY = "reliefread-writing-draft-v1";

interface LocalDraft {
  title: string;
  text: string;
}

interface ReviewWithOriginal extends WritingReview {
  originalText: string;
}

function loadDraft(): LocalDraft {
  if (typeof window === "undefined") return { title: "", text: "" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null") as Partial<LocalDraft> | null;
    return {
      title: typeof parsed?.title === "string" ? parsed.title : "",
      text: typeof parsed?.text === "string" ? parsed.text : "",
    };
  } catch {
    return { title: "", text: "" };
  }
}

const CHECK_OPTIONS: Array<{ type: WritingIssueType; emoji: string; en: string; da: string }> = [
  { type: "spelling", emoji: "✓", en: "Spelling", da: "Stavning" },
  { type: "grammar", emoji: "✍️", en: "Grammar", da: "Grammatik" },
  { type: "comma", emoji: "[,]", en: "Commas", da: "Komma" },
  { type: "punctuation", emoji: "✨", en: "Punctuation", da: "Tegnsætning" },
];

function speak(text: string, language: "da" | "en", rate = 0.9, spell = false) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(spell ? text.split("").join(", ") : text);
    utterance.lang = bcp47For(language);
    utterance.rate = rate;
    const prefix = utterance.lang.slice(0, 2).toLowerCase();
    const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith(prefix));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  } catch {
    // Reading a suggestion aloud is best-effort and must never interrupt writing.
  }
}

export default function WritingStudio() {
  const initial = useMemo(loadDraft, []);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { premium } = usePremium();
  const { language } = useLanguage();
  const [title, setTitle] = useState(initial.title);
  const [text, setText] = useState(initial.text);
  const [checks, setChecks] = useState<WritingChecks>({
    spelling: true,
    grammar: true,
    comma: true,
    punctuation: true,
  });
  const [checkMode, setCheckMode] = useState<"live" | "finished">("finished");
  const [history, setHistory] = useState<string[]>([]);
  const [reviewResult, setReviewResult] = useState<ReviewWithOriginal | null>(null);
  const [resolvedIssues, setResolvedIssues] = useState<Set<number>>(new Set());
  const [dictionary, setDictionary] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [documentsCreated, setDocumentsCreated] = useState(0);
  const [usageLoading, setUsageLoading] = useState(true);
  const { review, loading: reviewing, error: reviewError } = useWritingReview(language);

  usePageTitle(language === "da" ? "Skriveværksted" : "Writing studio");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, text }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [text, title]);

  useEffect(() => {
    if (authLoading || !user) return;
    getMonthlyUsage()
      .then((usage) => setDocumentsCreated(usage.documentsCreated))
      .catch(() => setDocumentsCreated(0))
      .finally(() => setUsageLoading(false));
    overskill.entities.dictionary_word
      .list("-created_at", 500)
      .then((words: unknown) => {
        const next = new Set<string>();
        (Array.isArray(words) ? words : []).forEach((word: { word?: string }) => {
          if (word.word) next.add(String(word.word).toLocaleLowerCase());
        });
        setDictionary(next);
      })
      .catch(() => setDictionary(new Set()));
  }, [authLoading, user]);

  const commitText = useCallback(
    (next: string) => {
      if (next === text) return;
      setHistory((current) => [...current.slice(-19), text]);
      setText(next);
    },
    [text]
  );

  const appendDictation = useCallback((chunk: string) => {
    setText((current) => {
      const separator = current && !/\s$/.test(current) ? " " : "";
      setHistory((items) => [...items.slice(-19), current]);
      return `${current}${separator}${chunk} `;
    });
    setReviewResult(null);
  }, []);

  const dictation = useDictation({ lang: bcp47For(language), onFinal: appendDictation });

  const suggestions = useMemo(
    () => getWritingSuggestions(text, text.length, language),
    [language, text]
  );

  const addSuggestion = (suggestion: string, replacePrefix: boolean) => {
    const next = insertWritingSuggestion(text, text.length, suggestion, replacePrefix);
    commitText(next.text);
    setReviewResult(null);
  };

  const keepWord = useCallback((word: string) => {
    if (!word) return;
    setDictionary((current) => new Set(current).add(word));
    overskill.entities.dictionary_word
      .create({ word, language })
      .catch(() => undefined);
  }, [language]);

  const runReview = async () => {
    if (!text.trim() || reviewing) return;
    if (!Object.values(checks).some(Boolean)) {
      setNotice(language === "da" ? "Vælg mindst én type hjælp først." : "Choose at least one type of help first.");
      return;
    }
    setNotice(null);
    const result = await review(text, checks);
    if (!result) return;
    setReviewResult({
      correctedText: result.correctedText || text,
      issues: Array.isArray(result.issues) ? result.issues : [],
      counts: result.counts || { spelling: 0, grammar: 0, comma: 0, punctuation: 0 },
      originalText: text,
    });
    setResolvedIssues(new Set());
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (previous == null) return;
    setText(previous);
    setHistory((current) => current.slice(0, -1));
  };

  const applyOne = (index: number) => {
    const issue = reviewResult?.issues[index];
    if (!issue) return;
    const next = replaceFirstExact(text, issue.original, issue.suggestion);
    commitText(next);
    setResolvedIssues((current) => new Set(current).add(index));
  };

  const saveAsReading = async () => {
    if (authLoading || !user || !text.trim() || saving) return;
    if (usageLoading && !premium) {
      setNotice(language === "da" ? "Et øjeblik. Vi gør din konto klar." : "One moment. We are getting your account ready.");
      return;
    }
    if (!premium && !canCreateDocument({ plan: "free", documentsCreated })) {
      setNotice(
        language === "da"
          ? "Du har brugt månedens gratis tekster. Din kladde er stadig gemt på denne enhed."
          : "You have used this month's free texts. Your draft is still saved on this device."
      );
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const document = await overskill.entities.document.create({
        title: title.trim() || firstWords(text, 6) || (language === "da" ? "Min tekst" : "My text"),
        content_raw: text.trim(),
        language: detectLanguage(text),
        listened: false,
      });
      await recordDocumentCreated();
      window.localStorage.removeItem(DRAFT_KEY);
      navigate(`/read/${document.id}`);
    } catch {
      setNotice(
        language === "da"
          ? "Vi kunne ikke gemme lige nu. Din tekst er stadig sikker på denne enhed."
          : "We could not save just now. Your text is still safe on this device."
      );
      setSaving(false);
    }
  };

  const askRiley = () => {
    const prompt = text.trim()
      ? language === "da"
        ? `Hjælp mig med denne tekst. Bevar min tone og spørg, før du ændrer betydningen:\n\n${text.slice(0, 5000)}`
        : `Help me with this text. Keep my tone and ask before changing the meaning:\n\n${text.slice(0, 5000)}`
      : undefined;
    window.dispatchEvent(new CustomEvent("reliefread:open-riley", { detail: { prompt } }));
  };

  const issueLabel = (type: WritingIssueType) => {
    const option = CHECK_OPTIONS.find((item) => item.type === type);
    return option ? (language === "da" ? option.da : option.en) : type;
  };

  return (
    <div className="min-h-screen bg-background">
      <ReliefHeader />
      <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-7 lg:px-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {language === "da" ? "Mit læserum" : "My space"}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={undo}
              disabled={history.length === 0}
              className="h-11 rounded-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              {language === "da" ? "Fortryd" : "Undo"}
            </Button>
            <Button variant="outline" onClick={askRiley} className="h-11 rounded-full">
              <Sparkles className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
              Riley
            </Button>
            <Button
              onClick={() => void saveAsReading()}
              disabled={!text.trim() || saving || (usageLoading && !premium)}
              className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
              {language === "da" ? "Gem og læs" : "Save and read"}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            {language === "da" ? "Skriv som mig. Bare korrekt." : "Write like me. Just correct."}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            {language === "da" ? "Skriveværksted" : "Writing studio"}
          </h1>
        </div>

        {(notice || reviewError) && (
          <SoftNotice className="mb-5">
            {notice || (language === "da" ? "Riley kunne ikke tjekke teksten lige nu. Prøv igen om lidt." : "Riley could not check the text just now. Try again shortly.")}
          </SoftNotice>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 rounded-[2rem] border border-border bg-card p-4 shadow-paper sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[220px] flex-1">
                <label htmlFor="writing-title" className="mb-1.5 block text-sm font-semibold text-foreground">
                  {language === "da" ? "Titel" : "Title"}
                </label>
                <Input
                  id="writing-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={firstWords(text, 6) || (language === "da" ? "Min tekst" : "My text")}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <span className="pb-2 text-sm text-muted-foreground">
                {wordCount(text)} {language === "da" ? "ord" : wordCount(text) === 1 ? "word" : "words"}
              </span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {dictation.supported && (
                <Button
                  type="button"
                  variant={dictation.listening ? "default" : "outline"}
                  onClick={dictation.listening ? dictation.stop : dictation.start}
                  disabled={dictation.requesting}
                  aria-pressed={dictation.listening}
                  className="h-11 rounded-full"
                >
                  {dictation.listening ? <MicOff className="mr-2 h-4 w-4" aria-hidden="true" /> : <Mic className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {dictation.requesting
                    ? language === "da" ? "Tillad mikrofon" : "Allow microphone"
                    : dictation.listening
                      ? language === "da" ? "Stop diktat" : "Stop dictation"
                      : language === "da" ? "Tal i stedet" : "Dictate"}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => void runReview()}
                disabled={!text.trim() || reviewing}
                className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {reviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                {reviewing
                  ? language === "da" ? "Tjekker roligt…" : "Checking gently…"
                  : language === "da" ? "Tjek min tekst" : "Check my text"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {language === "da" ? "Intet ændres uden dit valg" : "Nothing changes without your choice"}
              </span>
            </div>

            {dictation.listening && (
              <div className="mb-3 flex items-start gap-3 rounded-2xl border border-primary/25 bg-accent/60 px-4 py-3" aria-live="polite">
                <Mic className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-primary" aria-hidden="true" />
                <p className="text-sm text-foreground">
                  {dictation.interim || (language === "da" ? "Jeg lytter. Tal naturligt." : "I'm listening. Speak naturally.")}
                </p>
              </div>
            )}

            {dictation.error && (
              <SoftNotice className="mb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{language === "da" ? "Mikrofonen kunne ikke startes. Tjek browserens mikrofontilladelse." : dictation.error}</span>
                  <Button type="button" variant="outline" onClick={dictation.retry} className="h-9 rounded-full">
                    {language === "da" ? "Prøv igen" : "Try again"}
                  </Button>
                </div>
              </SoftNotice>
            )}

            <div className="h-[520px] sm:h-[600px]">
              <NoteEditor
                value={text}
                onChange={(next) => {
                  setText(next);
                  setReviewResult(null);
                }}
                lang={language}
                dictionary={dictionary}
                onKeepWord={keepWord}
                coachEnabled={checkMode === "live" && checks.spelling}
                showToolbar={false}
                placeholder={
                  language === "da"
                    ? "Skriv en mail, besked, opgave eller noget helt andet…"
                    : "Write an email, message, assignment or anything else…"
                }
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {language === "da" ? "Kladde gemt på denne enhed" : "Draft saved on this device"}
            </p>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-5">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-paper">
              <div className="flex items-center gap-2">
                <SpellCheck2 className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {language === "da" ? "Hvad skal tjekkes?" : "What should be checked?"}
                </h2>
              </div>
              <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-background px-3">
                {CHECK_OPTIONS.map((option) => (
                  <label key={option.type} className="flex min-h-14 items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span aria-hidden="true">{option.emoji}</span>
                      {language === "da" ? option.da : option.en}
                    </span>
                    <Switch
                      checked={checks[option.type]}
                      onCheckedChange={(active) => setChecks((current) => ({ ...current, [option.type]: active }))}
                      aria-label={language === "da" ? option.da : option.en}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setCheckMode("finished")}
                  aria-pressed={checkMode === "finished"}
                  className={`min-h-12 rounded-xl px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${checkMode === "finished" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {language === "da" ? "Når jeg er færdig" : "When finished"}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckMode("live")}
                  aria-pressed={checkMode === "live"}
                  className={`min-h-12 rounded-xl px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${checkMode === "live" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {language === "da" ? "Mens jeg skriver" : "While writing"}
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {checkMode === "live"
                  ? language === "da" ? "Fonetiske staveforslag vises efter en kort pause." : "Phonetic spelling suggestions appear after a short pause."
                  : language === "da" ? "Tryk på Tjek min tekst, når du er klar." : "Press Check my text when you are ready."}
              </p>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-paper">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {language === "da" ? "Ordforslag" : "Word suggestions"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {suggestions.prefix
                  ? `${language === "da" ? "Du skriver" : "You are writing"}: ${suggestions.prefix}…`
                  : language === "da" ? "Forslag følger din tekst." : "Suggestions follow your text."}
              </p>

              {suggestions.words.length > 0 && (
                <div className="mt-4 space-y-2">
                  {suggestions.words.map((word) => (
                    <div key={word} className="rounded-2xl border border-border bg-background p-3">
                      <button
                        type="button"
                        onClick={() => addSuggestion(word, true)}
                        className="flex w-full items-center justify-between gap-2 text-left text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {word}
                        <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
                      </button>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => speak(word, language)} className="rounded-full bg-accent px-2.5 py-1.5 text-xs font-medium text-foreground">
                          <Volume2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                          {language === "da" ? "Normal" : "Normal"}
                        </button>
                        <button type="button" onClick={() => speak(word, language, 0.55)} className="rounded-full bg-accent px-2.5 py-1.5 text-xs font-medium text-foreground">
                          {language === "da" ? "Langsomt" : "Slowly"}
                        </button>
                        <button type="button" onClick={() => speak(word, language, 0.72, true)} className="rounded-full bg-accent px-2.5 py-1.5 text-xs font-medium text-foreground">
                          {language === "da" ? "Stav ordet" : "Spell it"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {language === "da" ? "Næste ord" : "Next word"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.nextWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => addSuggestion(word, false)}
                    className="min-h-10 rounded-full border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {reviewResult && (
          <section className="rr-fade-up mt-6 rounded-[2rem] border border-primary/20 bg-card p-5 shadow-paper sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  {language === "da" ? "Dit tjek er klar" : "Your review is ready"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {reviewResult.issues.length
                    ? language === "da" ? "Vælg selv, hvad der skal ændres" : "Choose what should change"
                    : language === "da" ? "Din tekst ser fin ud" : "Your text looks good"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => commitText(reviewResult.originalText)}
                  className="h-11 rounded-full"
                >
                  {language === "da" ? "Gendan original" : "Restore original"}
                </Button>
                <Button
                  onClick={() => commitText(reviewResult.correctedText)}
                  disabled={reviewResult.correctedText === text}
                  className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  {language === "da" ? "Ret alle" : "Apply all"}
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {CHECK_OPTIONS.map((option) => (
                <span key={option.type} className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-foreground">
                  {reviewResult.counts[option.type] || 0} {language === "da" ? option.da.toLocaleLowerCase() : option.en.toLocaleLowerCase()}
                </span>
              ))}
            </div>

            <Tabs defaultValue="corrected" className="mt-5">
              <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-2xl bg-muted p-1">
                <TabsTrigger value="original" className="rounded-xl">
                  {language === "da" ? "Original" : "Original"}
                </TabsTrigger>
                <TabsTrigger value="corrected" className="rounded-xl">
                  {language === "da" ? "Rettet" : "Corrected"}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="original" className="mt-3 whitespace-pre-wrap rounded-2xl border border-border bg-background p-4 text-base leading-relaxed text-foreground">
                {reviewResult.originalText}
              </TabsContent>
              <TabsContent value="corrected" className="mt-3 whitespace-pre-wrap rounded-2xl border border-primary/25 bg-accent/35 p-4 text-base leading-relaxed text-foreground">
                {reviewResult.correctedText}
              </TabsContent>
            </Tabs>

            {reviewResult.issues.length > 0 && (
              <div className="mt-6">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {language === "da" ? "Gennemgå én ad gangen" : "Review one at a time"}
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {reviewResult.issues.map((issue, index) => {
                    const resolved = resolvedIssues.has(index);
                    return (
                      <article key={`${issue.type}-${index}`} className={`rounded-2xl border p-4 ${resolved ? "border-primary/20 bg-accent/35 opacity-70" : "border-border bg-background"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-foreground">
                            {issueLabel(issue.type)}
                          </span>
                          {resolved && <span className="text-xs font-semibold text-primary">{language === "da" ? "Brugt" : "Applied"}</span>}
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground line-through">{issue.original}</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{issue.suggestion}</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{issue.explanation}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={() => applyOne(index)} disabled={resolved} className="rounded-full">
                            {language === "da" ? "Brug forslag" : "Use suggestion"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => speak(`${issue.original}. ${issue.suggestion}`, language, 0.75)} className="rounded-full">
                            <Volume2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            {language === "da" ? "Hør forskellen" : "Hear the difference"}
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
