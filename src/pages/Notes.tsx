import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, FileText, Loader2, NotebookPen, Quote, Search, Sparkles } from "lucide-react";
import { backend, useAuth } from "@/lib/auth";
import { ReliefHeader } from "@/components/ReliefHeader";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SoftNotice } from "@/components/SoftNotice";
import { useLanguage } from "@/lib/i18n";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePremium } from "@/hooks/usePremium";
import {
  NOTE_COLORS,
  buildNoteCards,
  defaultNoteColor,
  filterNoteCards,
  loadNoteColors,
  saveNoteColor,
  type NoteCard,
  type NoteColor,
  type NoteDocument,
  type NoteRecord,
} from "@/lib/notes";

type SaveState = "idle" | "saving" | "saved";

const colorClasses: Record<NoteColor, string> = {
  strawberry: "rr-note-card-strawberry",
  sage: "rr-note-card-sage",
  cloud: "rr-note-card-cloud",
  lavender: "rr-note-card-lavender",
  cozy: "rr-note-card-cozy",
  minimal: "rr-note-card-minimal",
};

const colorLabels: Record<NoteColor, { da: string; en: string }> = {
  strawberry: { da: "Jordbær", en: "Strawberry" },
  sage: { da: "Salvie", en: "Sage" },
  cloud: { da: "Sky", en: "Cloud" },
  lavender: { da: "Lavendel", en: "Lavender" },
  cozy: { da: "Hyggelig", en: "Cozy" },
  minimal: { da: "Enkel", en: "Minimal" },
};

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const { premium } = usePremium();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [documents, setDocuments] = useState<NoteDocument[]>([]);
  const [dictionary, setDictionary] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<NoteCard | null>(null);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [noteColors, setNoteColors] = useState<Record<string, NoteColor>>(loadNoteColors);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef("");

  usePageTitle(t("notes.title", "My notes"));

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [noteRows, documentRows, wordRows] = await Promise.all([
        backend.entities.note.list("-updated_at"),
        backend.entities.document.list("-updated_at"),
        backend.entities.dictionary_word.list("-created_at", 500),
      ]);
      setNotes(noteRows as NoteRecord[]);
      setDocuments(documentRows as NoteDocument[]);
      setDictionary(new Set((wordRows || []).map((row: Record<string, unknown>) => String(row.word || "").toLowerCase()).filter(Boolean)));
    } catch (loadError) {
      console.error("Failed to load notes:", loadError);
      setError(t("notes.error", "We couldn't load your notes just now. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadNotes();
  }, [authLoading, user, loadNotes]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const cards = useMemo(
    () => buildNoteCards(notes, documents, t("notes.untitled", "Untitled reading")),
    [notes, documents, t],
  );
  const visibleCards = useMemo(() => filterNoteCards(cards, query), [cards, query]);

  const persist = useCallback(async (card: NoteCard, content: string) => {
    setSaveState("saving");
    try {
      const updated = await backend.entities.note.update(card.note.id, { content });
      setNotes((current) => current.map((note) => note.id === card.note.id ? { ...note, ...updated, content } : note));
      setActiveCard((current) => current?.note.id === card.note.id ? { ...current, note: { ...current.note, ...updated, content } } : current);
      setSaveState("saved");
    } catch (saveError) {
      console.error("Failed to save note:", saveError);
      setSaveState("idle");
    }
  }, []);

  const openNote = (card: NoteCard) => {
    setActiveCard(card);
    const content = card.note.content || "";
    setDraft(content);
    draftRef.current = content;
    setSaveState("idle");
  };

  const changeDraft = (content: string) => {
    setDraft(content);
    draftRef.current = content;
    setSaveState("idle");
    if (!activeCard) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(activeCard, content), 900);
  };

  const closeEditor = (open: boolean) => {
    if (open) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (activeCard && draftRef.current !== (activeCard.note.content || "")) {
        void persist(activeCard, draftRef.current);
      }
    }
    setActiveCard(null);
  };

  const setColor = (noteId: string, color: NoteColor) => {
    setNoteColors(saveNoteColor(noteId, color));
  };

  const keepWord = (word: string) => {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;
    setDictionary((current) => new Set(current).add(normalized));
    backend.entities.dictionary_word.create({ word: normalized, language: "auto" }).catch(() => undefined);
  };

  const activeLanguage = activeCard?.document?.language === "en" || activeCard?.document?.language === "da"
    ? activeCard.document.language
    : language;

  return (
    <div className="min-h-screen bg-background">
      <ReliefHeader />
      <main className="mx-auto max-w-6xl px-5 pb-32 pt-8 sm:px-8">
        <section className="rr-fade-up relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-7 shadow-paper sm:px-8 sm:py-9">
          <div className="rr-decoration pointer-events-none absolute right-7 top-6 text-3xl" aria-hidden="true">📝 ✨</div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            {t("notes.eyebrow", "Your ideas")}
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("notes.title", "My notes")}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("notes.intro", "Everything you wrote while reading, gathered in one calm place.")}
          </p>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("notes.search", "Search notes and readings")}
              aria-label={t("notes.search", "Search notes and readings")}
              className="h-12 rounded-full border-border bg-card pl-12 text-base shadow-paper"
            />
          </label>
          <span className="text-sm text-muted-foreground">
            {t("notes.count", "{count} notes", { count: visibleCards.length })}
          </span>
        </div>

        {error && <SoftNotice className="mt-6">{error}</SoftNotice>}

        {loading ? (
          <div className="mt-7 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {[150, 210, 180, 240].map((height) => <div key={height} className="rr-skeleton mb-4 break-inside-avoid rounded-3xl" style={{ height }} />)}
          </div>
        ) : notes.length === 0 ? (
          <section className="mt-8 flex flex-col items-center rounded-[2rem] border border-dashed border-border bg-card/70 px-6 py-14 text-center shadow-paper">
            <span className="grid h-20 w-20 place-items-center rounded-3xl bg-accent text-primary"><NotebookPen className="h-9 w-9" aria-hidden="true" /></span>
            <h2 className="mt-6 font-display text-2xl font-semibold">{t("notes.emptyTitle", "Your first note starts with a reading")}</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{t("notes.emptyText", "Open a reading, highlight a passage and write what you want to remember.")}</p>
            <Button onClick={() => navigate("/new")} className="mt-7 h-12 rounded-full px-7">
              <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
              {t("notes.startReading", "Start a reading")}
            </Button>
          </section>
        ) : visibleCards.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-border bg-card px-6 py-12 text-center shadow-paper">
            <Search className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-display text-xl font-semibold">{t("notes.noResults", "No notes match your search")}</h2>
            <button type="button" onClick={() => setQuery("")} className="mt-3 min-h-11 rounded-full px-4 text-sm font-semibold text-primary hover:bg-accent">
              {t("notes.clearSearch", "Clear search")}
            </button>
          </section>
        ) : (
          <section className="rr-settle mt-7 columns-1 gap-4 sm:columns-2 lg:columns-3" aria-label={t("notes.title", "My notes")}>
            {visibleCards.map((card) => {
              const color = noteColors[card.note.id] || defaultNoteColor(card.note.id);
              return (
                <article key={card.note.id} className={`mb-4 break-inside-avoid rounded-3xl border p-5 shadow-paper ${colorClasses[color]}`}>
                  <button type="button" onClick={() => openNote(card)} className="block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-display text-lg font-semibold leading-snug text-foreground">{card.title}</span>
                      <Sparkles className="rr-decoration h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    </span>
                    {card.note.anchor_text && (
                      <span className="mt-4 flex items-start gap-2 rounded-2xl bg-card/55 p-3 text-sm italic leading-relaxed text-muted-foreground">
                        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="line-clamp-3">{card.note.anchor_text}</span>
                      </span>
                    )}
                    <span className="mt-4 block whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/85">
                      {card.note.content?.trim() || t("notes.emptyNote", "Tap to write your note")}
                    </span>
                  </button>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3">
                    <Link to={`/read/${card.note.document_id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs font-semibold text-primary outline-none hover:bg-card/60 focus-visible:ring-2 focus-visible:ring-ring">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {t("notes.openReading", "Open reading")}
                    </Link>
                    <div className="flex items-center gap-1" aria-label={t("notes.color", "Note color")}>
                      {NOTE_COLORS.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setColor(card.note.id, choice)}
                          aria-label={colorLabels[choice][language]}
                          aria-pressed={color === choice}
                          className={`h-6 w-6 rounded-full border-2 outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${colorClasses[choice]} ${color === choice ? "scale-110 border-primary" : "border-card/80"}`}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <Dialog open={Boolean(activeCard)} onOpenChange={closeEditor}>
        <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden rounded-[2rem] border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-6 pb-5 pt-6 text-left sm:px-8">
            <div className="flex items-center justify-between gap-4 pr-8">
              <div>
                <DialogTitle className="font-display text-2xl">{activeCard?.title}</DialogTitle>
                <DialogDescription className="mt-1">{t("notes.editorHelp", "Write freely. Your note saves automatically.")}</DialogDescription>
              </div>
              <span className="min-w-16 text-right text-xs text-muted-foreground" aria-live="polite">
                {saveState === "saving" ? <><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />{t("notes.saving", "Saving")}</> : saveState === "saved" ? t("notes.saved", "Saved") : ""}
              </span>
            </div>
          </DialogHeader>
          <div className="min-h-[360px] flex-1 overflow-y-auto px-6 py-5 sm:px-8">
            <NoteEditor
              value={draft}
              onChange={changeDraft}
              lang={activeLanguage}
              dictionary={dictionary}
              onKeepWord={keepWord}
              coachEnabled={premium}
              placeholder={t("notes.placeholder", "Write what you want to remember...")}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
