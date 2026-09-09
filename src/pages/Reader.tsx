import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, BookMarked, Share2, ClipboardList, Play, Languages, Mic, MoreVertical, UserCircle } from "lucide-react";
import { backend, useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { SoftNotice } from "@/components/SoftNotice";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { AudioBar } from "@/components/reader/AudioBar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NotesPanel } from "@/components/notes/NotesPanel";
import type { DocumentRecord } from "@/components/DocumentCard";
import { formatShortDate, estimateReadingMinutes } from "@/lib/text-utils";
import {
  fontFamilyFor,
  tintColorFor,
  DEFAULT_READING_SETTINGS,
  loadReadingSettings,
  type ReadingSettings,
  type FontChoice,
  type TintChoice,
} from "@/lib/reading-settings";
import { buildReaderModel, detectLanguage } from "@/lib/reader-tokens";
import { useReadAloud } from "@/hooks/useReadAloud";
import { defaultVoiceForLang, type ReaderVoice } from "@/lib/reader-voices";
import { SelectionPopover, type LookupAction } from "@/components/reader/SelectionPopover";
import { LookupCard } from "@/components/reader/LookupCard";
import { LookupHistory } from "@/components/reader/LookupHistory";
import { lookupText, listLookups, type LookupKind, type LookupRow, type Lang } from "@/lib/lookups";
import { selectionWordRange } from "@/lib/dom-selection";
import { ShareDialog } from "@/components/share/ShareDialog";
import { DEFAULT_SHARE_SNAPSHOT, type ShareSnapshot } from "@/lib/share";
import { usePremium } from "@/hooks/usePremium";
import { getMonthlyUsage } from "@/lib/usage";
import { isFreshTtsExhausted } from "@/lib/billing";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ReaderAdjust } from "@/components/reader/ReaderAdjust";
import { useLanguage } from "@/lib/i18n";
import { ReaderFocusControls } from "@/components/reader/ReaderFocusControls";
import { ReadingVersionControls } from "@/components/reader/ReadingVersionControls";
import { createReadingVersion, type ReadingVersion } from "@/lib/reading-versions";
import { HIGHLIGHT_COLORS } from "@/lib/app-preferences";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { DocumentInsightsSheet } from "@/components/reader/DocumentInsightsSheet";
import { insightsAsText, type DocumentInsights } from "@/lib/document-insights";
import { ReaderPersonalisationStudio, ReaderThemeChooser } from "@/components/reader/ReaderPersonalisationStudio";
import { ReaderWorkspaceSidebar } from "@/components/reader/ReaderWorkspaceSidebar";

/**
 * Reader — the calm reading sanctuary with the listening experience, now with
 * the writing side: a 65/35 split (document left, "My Notes" right) on desktop,
 * and a floating-pencil full-screen sheet on mobile. Words render as
 * individually-indexed spans; the audio bar drives a single `currentWordIndex`
 * that both highlights the current word (soft #FEF08A) and seeks when a word is
 * clicked. Selecting text in the document anchors a note to that passage.
 */
export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { premium } = usePremium();
  const { t, language } = useLanguage();
  const { preferences, setPreferences } = useAppPreferences();
  const [ttsSecondsUsed, setTtsSecondsUsed] = useState(0);

  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_READING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HD voice is opt-in; undefined means the free browser voice.
  const [hdVoiceId, setHdVoiceId] = useState<string | undefined>(undefined);
  const [markedListened, setMarkedListened] = useState(false);

  // Session-only reading overrides — reader can flip Bionic / font / tint for
  // THIS text without changing their saved defaults (dark mode is independent).
  const [bionic, setBionic] = useState(false);
  const [fontOverride, setFontOverride] = useState<FontChoice | null>(null);
  const [tintOverride, setTintOverride] = useState<TintChoice | null>(null);
  const [focusControlsOpen, setFocusControlsOpen] = useState(false);
  const [readingVersion, setReadingVersion] = useState<ReadingVersion>("original");
  const [versionLoading, setVersionLoading] = useState<ReadingVersion | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [readingVersions, setReadingVersions] = useState<Partial<Record<ReadingVersion, string>>>({});
  const versionRequestRef = useRef(0);
  const [insightsOpen, setInsightsOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    getMonthlyUsage().then((u) => active && setTtsSecondsUsed(u.ttsSecondsUsed));
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    let active = true;
    setLoading(true);
    Promise.all([backend.entities.document.get(id), loadReadingSettings()])
      .then(([d, s]) => {
        if (!active) return;
        if (!d) {
          setNotFound(true);
        } else {
          setDoc(d as DocumentRecord);
          setSettings(s);
        }
      })
      .catch((err) => {
        console.error("Failed to load reading:", err);
        if (active) setError(t("reader.openError", "We couldn't open this reading just now. Try again in a moment."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user, id, t]);

  useEffect(() => {
    versionRequestRef.current += 1;
    setReadingVersion("original");
    setReadingVersions({});
    setVersionLoading(null);
    setVersionError(null);
  }, [doc?.id]);

  const displayedText = readingVersion === "original"
    ? doc?.content_raw || ""
    : readingVersions[readingVersion] || doc?.content_raw || "";

  // The audio and visual word model always use the version currently on screen.
  const model = useMemo(() => buildReaderModel(displayedText), [displayedText]);
  const lang = useMemo<"en" | "da">(() => {
    const stored = doc?.language;
    if (stored === "en" || stored === "da") return stored;
    return detectLanguage(doc?.content_raw || "");
  }, [doc?.language, doc?.content_raw]);

  const handleFallback = useCallback(() => {
    toast("Using standard voice for now.", {
      description: "The natural voice was unavailable — your reading continues.",
    });
    setHdVoiceId(undefined);
  }, []);

  // The browser voice produced no audible sound (silent device / stuck engine).
  // Point the reader at the built-in "No sound?" checker rather than failing
  // silently — the audio pipeline works (the test tone plays), so this guides
  // them to the fix.
  const handleNoAudio = useCallback(() => {
    toast("We couldn't play the reading on this device.", {
      description: 'Tap "No sound?" under the play button to run a quick check.',
    });
  }, []);

  // The free browser voice spoke a word then FROZE — the classic on-device
  // Danish stall (the OS voice fires one boundary and never continues). For
  // Danish specifically we help rather than fail: Premium readers are slipped
  // onto a natural Danish voice that reads it smoothly; free readers get a warm
  // heads-up with a path to the natural voice.
  const handleStall = useCallback(() => {
    if (lang === "da") {
      if (premium && !isFreshTtsExhausted("premium", ttsSecondsUsed)) {
        const daVoice = defaultVoiceForLang("da");
        toast("Switching to a natural Danish voice.", {
          description: "Your device's standard voice couldn't read Danish smoothly — press play to continue.",
        });
        setHdVoiceId(daVoice.id);
        return;
      }
      toast("Your device's standard voice can't read Danish smoothly.", {
        description: "It reads one word then stops. Premium adds a warm natural Danish voice that handles it — or paste English text to use the standard voice.",
        action: { label: "See Premium", onClick: () => navigate("/pricing") },
      });
      return;
    }
    // Non-Danish stall — rare; point at the sound checker.
    toast("The reading stopped unexpectedly.", {
      description: 'Tap "No sound?" under the play button to run a quick check.',
    });
  }, [lang, premium, ttsSecondsUsed, navigate]);

  const {
    status,
    engine,
    currentWordIndex,
    speed,
    setSpeed,
    toggle,
    stop,
    skipBack,
    seekToWord,
    playRange,
  } = useReadAloud({
    documentId: doc?.id || "",
    model,
    lang,
    hdVoiceId,
    hdRequested: Boolean(hdVoiceId),
    onFallback: handleFallback,
    onNoAudio: handleNoAudio,
    onStall: handleStall,
  });

  const following = status === "playing" || status === "paused";

  const handleReadingVersion = useCallback(async (next: ReadingVersion) => {
    if (!doc?.content_raw || next === readingVersion) return;
    stop();
    setVersionError(null);
    if (next === "original" || readingVersions[next]) {
      setReadingVersion(next);
      return;
    }
    setVersionLoading(next);
    const requestId = ++versionRequestRef.current;
    try {
      const transformed = await createReadingVersion({
        text: doc.content_raw,
        mode: next,
        lang,
      });
      if (requestId !== versionRequestRef.current) return;
      setReadingVersions((current) => ({ ...current, [next]: transformed }));
      setReadingVersion(next);
    } catch (err) {
      if (requestId !== versionRequestRef.current) return;
      console.error("Reading version failed:", err);
      setVersionError(
        language === "da"
          ? "Den lettere version kunne ikke laves lige nu. Originalen er stadig sikker. Prøv igen om lidt."
          : "We couldn't create the easier version just now. Your original is still safe. Try again shortly."
      );
    } finally {
      if (requestId === versionRequestRef.current) setVersionLoading(null);
    }
  }, [doc?.content_raw, readingVersion, readingVersions, stop, lang, language]);

  const openInsights = useCallback(() => {
    stop();
    setInsightsOpen(true);
  }, [stop]);

  const askRileyAboutDocument = useCallback((insights: DocumentInsights) => {
    if (!doc?.content_raw) return;
    const overview = insightsAsText(insights, lang);
    const prompt = language === "da"
      ? "Hvad vil du gerne vide om dokumentet?"
      : "What would you like to know about the document?";
    const context = `${language === "da" ? "Overblik" : "Overview"}:\n${overview}\n\n${language === "da" ? "Originaltekst" : "Original text"}:\n${doc.content_raw.slice(0, 30000)}`;
    setInsightsOpen(false);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("reliefread:open-riley", { detail: { prompt, context } }));
    }, 0);
  }, [doc?.content_raw, lang, language]);

  // Gently mark the document as listened once playback begins (best-effort).
  useEffect(() => {
    if (status !== "playing" || markedListened || !doc?.id) return;
    setMarkedListened(true);
    backend.entities.document
      .update(doc.id, { listened: true })
      .catch((err: unknown) => console.warn("[reader] mark listened failed:", err));
  }, [status, markedListened, doc?.id]);

  const handleVoice = useCallback(
    (voice: ReaderVoice | null) => {
      stop();
      if (!voice) {
        setHdVoiceId(undefined);
        return;
      }
      if (!premium) {
        toast("Natural voices are a Premium feature.", {
          description: "Your standard voice keeps working — Premium adds warm AI narration.",
          action: { label: "See Premium", onClick: () => navigate("/pricing") },
        });
        return;
      }
      if (isFreshTtsExhausted("premium", ttsSecondsUsed)) {
        toast("You've used this month's AI voice minutes.", {
          description: "Your saved audio still plays in full quality, and everything resets on the 1st.",
        });
        setHdVoiceId(undefined);
        return;
      }
      setHdVoiceId(voice.id);
    },
    [stop, premium, ttsSecondsUsed, navigate]
  );

  const font = fontOverride ?? settings.default_font;
  const tint = tintOverride ?? settings.default_background_tint;
  const fontFamily = fontFamilyFor(font);
  const tintColor = tintColorFor(tint);

  // --- Notes / anchoring ---
  const articleRef = useRef<HTMLElement | null>(null);
  const [anchorText, setAnchorText] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false); // mobile sheet

  // Capture a selection inside the document as the note anchor.
  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (
      text &&
      articleRef.current &&
      sel &&
      sel.anchorNode &&
      articleRef.current.contains(sel.anchorNode)
    ) {
      setAnchorText(text.length > 240 ? text.slice(0, 240) + "…" : text);
    }
  }, []);

  // Scroll the document to the anchored passage (best-effort word search).
  const scrollToAnchor = useCallback(() => {
    if (!anchorText || !articleRef.current) return;
    const firstWord = anchorText.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/)[0]?.toLowerCase();
    if (!firstWord) return;
    const spans = articleRef.current.querySelectorAll<HTMLElement>(".rr-word");
    for (const span of Array.from(spans)) {
      if ((span.textContent || "").toLowerCase().includes(firstWord)) {
        span.scrollIntoView({ behavior: "smooth", block: "center" });
        span.classList.add("rr-word-active");
        setTimeout(() => span.classList.remove("rr-word-active"), 1200);
        break;
      }
    }
    setNotesOpen(false);
  }, [anchorText]);

  // --- Tap-to-understand: explain / translate / read selection ---
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupKind, setLookupKind] = useState<LookupKind>("explain");
  const [lookupSource, setLookupSource] = useState("");
  const [lookupResult, setLookupResult] = useState("");
  const [lookupResultLang, setLookupResultLang] = useState<Lang>("en");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<LookupRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Share formatted view — snapshot the CURRENT reader formatting.
  const [shareOpen, setShareOpen] = useState(false);
  const shareSnapshot: ShareSnapshot = useMemo(
    () => ({
      ...DEFAULT_SHARE_SNAPSHOT,
      font,
      tint,
      speed: settings.default_playback_speed,
      bionic,
    }),
    [font, tint, settings.default_playback_speed, bionic]
  );

  const refreshHistory = useCallback(async () => {
    if (!doc?.id || !user?.id) return;
    setHistoryLoading(true);
    try {
      setHistoryItems(await listLookups(doc.id, user.id));
    } finally {
      setHistoryLoading(false);
    }
  }, [doc?.id, user?.id]);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
    void refreshHistory();
  }, [refreshHistory]);

  // Fired from the selection popover. For "read", the selection is still live
  // here (the popover clears it AFTER calling us), so map it to a word range now
  // and play only that fragment. For explain/translate, open the calm card.
  const handleAction = useCallback(
    async (action: LookupAction, text: string) => {
      if (action === "read") {
        const range = selectionWordRange(articleRef.current);
        if (range) playRange(range.start, range.end);
        return;
      }
      const kind: LookupKind = action;
      setLookupKind(kind);
      setLookupSource(text);
      setLookupResult("");
      setLookupError(null);
      setLookupResultLang(lang);
      setLookupOpen(true);
      setLookupLoading(true);
      try {
        const res = await lookupText({
          documentId: doc?.id || "",
          text,
          kind,
          docLang: lang,
          userId: user?.id || "",
        });
        setLookupResult(res.resultText);
        setLookupResultLang(res.targetLang);
        void refreshHistory();
      } catch (err) {
        console.error("Lookup failed:", err);
        setLookupError("We couldn't look that up just now. Try again in a moment.");
      } finally {
        setLookupLoading(false);
      }
    },
    [doc?.id, lang, user?.id, playRange, refreshHistory]
  );

  usePageTitle(doc?.title || t("reader.reading", "Reading"));

  return (
    <div className="rr-personal-space">
      <ReaderThemeChooser value={preferences.aesthetic} onChange={(aesthetic) => setPreferences({ ...preferences, aesthetic })} />
      <main className="mx-auto max-w-6xl px-3 pb-40 sm:px-6">
        <section className="rr-reader-shell">
          <div className="rr-reader-windowbar">
            <div className="flex items-center gap-2" aria-hidden="true"><span className="h-3.5 w-3.5 rounded-full bg-pink-300" /><span className="h-3.5 w-3.5 rounded-full bg-amber-300" /><span className="h-3.5 w-3.5 rounded-full bg-emerald-400" /></div>
            <button type="button" onClick={() => navigate("/settings")} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50">
              <UserCircle className="h-6 w-6" aria-hidden="true" />Min profil
            </button>
          </div>
          <div className="flex">
            <ReaderWorkspaceSidebar onDictionary={openHistory} />
            <div className="rr-reader-main flex-1">
              <div className="rr-reading-toolbar">
                <button onClick={() => toggle()} className="rr-reading-tool !h-12 !w-12 rounded-full bg-blue-100" aria-label="Læs teksten"><Play className="h-5 w-5 fill-current" /></button>
                <button className="rr-reading-tool px-3" onClick={() => setSpeed(speed === 1 ? 1.25 : 1)}>{speed.toFixed(1)}x</button>
                <span className="rr-reading-tool px-3"><Languages className="h-4 w-4" />{lang === "da" ? "Dansk" : "English"}</span>
                <ReaderAdjust font={font} setFont={setFontOverride} tint={tint} setTint={setTintOverride} bionic={bionic} setBionic={setBionic} />
                <ReaderFocusControls open={focusControlsOpen} onOpenChange={setFocusControlsOpen} preferences={preferences} onChange={setPreferences} />
                <button onClick={() => setNotesOpen(true)} className="rr-reading-tool" aria-label="Åbn noter"><Mic className="h-5 w-5" /></button>
                <button onClick={() => setShareOpen(true)} className="rr-reading-tool" aria-label={t("reader.shareAria", "Share this formatted reading")}><Share2 className="h-5 w-5" /></button>
                <button onClick={openHistory} className="rr-reading-tool" aria-label={t("reader.lookedUpAria", "Open your looked-up words")}><BookMarked className="h-5 w-5" /></button>
                <button onClick={() => navigate("/dashboard")} className="rr-reading-tool ml-auto" aria-label="Tilbage til mine filer"><MoreVertical className="h-5 w-5" /></button>
              </div>

              <div className="grid min-h-[28rem] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:p-6">
                <div className="min-w-0 rr-reader-document">
            {loading ? (
              <div className="space-y-4">
                <div className="rr-skeleton h-8 w-2/3 rounded-lg" />
                <div className="rr-skeleton h-4 w-32 rounded" />
                <div className="mt-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rr-skeleton h-4 w-full rounded" />
                  ))}
                </div>
              </div>
            ) : notFound ? (
              <SoftNotice>
                {t("reader.notFound", "We couldn't find that reading. It may have been removed.")}{" "}
                <button className="underline" onClick={() => navigate("/dashboard")}>
                  {t("reader.backShort", "Back to your space")}
                </button>
                .
              </SoftNotice>
            ) : error ? (
              <SoftNotice>{error}</SoftNotice>
            ) : doc ? (
              <article ref={articleRef} onMouseUp={captureSelection} className="rr-fade-up">
                <button onClick={() => navigate("/dashboard")} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-blue-700"><ArrowLeft className="h-4 w-4" />Mine filer</button>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-blue-800">
                  {doc.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {doc.created_at ? formatShortDate(doc.created_at) : ""}
                  {doc.content_raw ? ` · ${t("reader.minutes", `${estimateReadingMinutes(doc.content_raw)} min read`, { minutes: estimateReadingMinutes(doc.content_raw) })}` : ""}
                  {` · ${lang === "da" ? "Dansk" : "English"}`}
                </p>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={openInsights}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-accent/65 px-4 text-left font-semibold text-foreground shadow-paper outline-none transition hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
                        <ClipboardList className="h-4 w-4" />
                      </span>
                      {language === "da" ? "Fortæl mig det vigtigste" : "Tell me what matters most"}
                    </span>
                    <span className="text-xl text-primary" aria-hidden="true">→</span>
                  </button>
                  <ReadingVersionControls
                    value={readingVersion}
                    loading={versionLoading}
                    onChange={handleReadingVersion}
                  />
                </div>
                {versionError && <div className="mt-3"><SoftNotice>{versionError}</SoftNotice></div>}

                <div className="mt-5">
                  {model.words.length > 0 ? (
                    <ReaderContent
                      model={model}
                      currentWordIndex={currentWordIndex}
                      following={following}
                      bionic={bionic}
                      fontFamily={fontFamily}
                      tintColor={tintColor}
                      onWordClick={seekToWord}
                      fontSize={preferences.readerFontSize}
                      lineHeight={preferences.readerLineHeight}
                      letterSpacing={preferences.readerLetterSpacing}
                      wordSpacing={preferences.readerWordSpacing}
                      fontWeight={preferences.readerFontWeight}
                      textColor={preferences.readerTextColor}
                      highlightMode={preferences.highlightMode}
                      focusScope={preferences.focusScope}
                      highlightColor={HIGHLIGHT_COLORS.find((color) => color.value === preferences.highlightColor)?.hex}
                    />
                  ) : (
                    <div
                      className="rounded-3xl border border-border p-8 text-lg italic opacity-70 shadow-paper"
                      style={{ backgroundColor: tintColor, color: "#1E293B" }}
                    >
                      {t("reader.empty", "This reading is empty.")}
                    </div>
                  )}
                </div>
              </article>
            ) : null}
                </div>

                {doc && (
                  <aside className="hidden lg:block">
                    <div className="rr-reader-notes h-full min-h-[24rem]">
                <NotesPanel
                  documentId={doc.id}
                  lang={lang}
                  anchorText={anchorText}
                  onAnchorClick={scrollToAnchor}
                  onClearAnchor={() => setAnchorText(null)}
                />
                    </div>
                  </aside>
                )}
              </div>
            </div>
          </div>
        </section>

        <ReaderPersonalisationStudio
          preferences={preferences}
          onPreferences={setPreferences}
          font={font}
          onFont={setFontOverride}
          tint={tint}
          onTint={setTintOverride}
          bionic={bionic}
          onBionic={setBionic}
        />
      </main>

      {/* Persistent audio bar — only once a document with words is loaded. */}
      {!loading && !notFound && !error && model.words.length > 0 && (
        <AudioBar
          status={status}
          engine={engine}
          lang={lang}
          speed={speed}
          onSpeed={setSpeed}
          onToggle={() => toggle()}
          onStop={stop}
          onSkipBack={skipBack}
          hdVoiceId={hdVoiceId}
          onVoice={handleVoice}
        />
      )}

      {/* Mobile: floating pencil opens notes as a full-screen sheet. */}
      {!loading && !notFound && !error && doc && (
        <>
          <button
            onClick={() => setNotesOpen(true)}
            className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-sage text-sage-foreground shadow-lg outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
            aria-label={t("reader.openNotes", "Open my notes")}
          >
            <Pencil className="h-6 w-6" aria-hidden="true" />
          </button>
          <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
            <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-5">
              <SheetTitle className="sr-only">{t("reader.myNotes", "My Notes")}</SheetTitle>
              <div className="h-full pt-2">
                <NotesPanel
                  documentId={doc.id}
                  lang={lang}
                  anchorText={anchorText}
                  onAnchorClick={scrollToAnchor}
                  onClearAnchor={() => setAnchorText(null)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Tap-to-understand: auto-positioning selection popover + result card + history */}
      {!loading && !notFound && !error && doc && (
        <>
          <SelectionPopover containerRef={articleRef} onAction={handleAction} />
          <LookupCard
            open={lookupOpen}
            loading={lookupLoading}
            error={lookupError}
            kind={lookupKind}
            sourceText={lookupSource}
            resultText={lookupResult}
            resultLang={lookupResultLang}
            fontFamily={fontFamily}
            onClose={() => setLookupOpen(false)}
          />
          <LookupHistory
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            items={historyItems}
            loading={historyLoading}
            fontFamily={fontFamily}
          />
        </>
      )}

      {doc && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          documentId={doc.id}
          title={doc.title || t("reader.sharedReading", "Shared reading")}
          contentRaw={doc.content_raw || ""}
          language={lang}
          snapshot={shareSnapshot}
          sharerPremium={premium}
        />
      )}

      {doc && (
        <DocumentInsightsSheet
          open={insightsOpen}
          onOpenChange={setInsightsOpen}
          documentId={doc.id}
          title={doc.title || t("reader.reading", "Reading")}
          text={doc.content_raw || ""}
          lang={lang}
          fontFamily={fontFamily}
          onAskRiley={askRileyAboutDocument}
        />
      )}
    </div>
  );
}
