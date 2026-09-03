import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Quote, X } from "lucide-react";
import { overskill } from "@/lib/auth";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { usePremium } from "@/hooks/usePremium";

interface NotesPanelProps {
  documentId: string;
  lang: "en" | "da";
  /** Text the user had selected in the document, or null. */
  anchorText: string | null;
  /** Click the anchor chip to scroll the document to that passage. */
  onAnchorClick: () => void;
  onClearAnchor: () => void;
}

type SaveState = "idle" | "saving" | "saved";

/**
 * NotesPanel — the writing side of the workspace. One note per document (kept
 * simple and calm). Autosaves 2s after you stop typing with a quiet "Saved"
 * whisper — never a popup. Shows the anchored passage as a quoted chip.
 */
export function NotesPanel({ documentId, lang, anchorText, onAnchorClick, onClearAnchor }: NotesPanelProps) {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<SaveState>("idle");
  const [dictionary, setDictionary] = useState<Set<string>>(new Set());

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const { premium } = usePremium();

  // Load the note (first for this document) + the personal dictionary.
  useEffect(() => {
    if (!documentId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      overskill.entities.note.filter({ document_id: documentId }),
      overskill.entities.dictionary_word.list("-created_at", 500),
    ])
      .then(([notes, words]) => {
        if (!active) return;
        const existing = Array.isArray(notes) && notes.length ? notes[0] : null;
        if (existing) {
          setNoteId(existing.id);
          setContent(existing.content || "");
        }
        const set = new Set<string>();
        (Array.isArray(words) ? words : []).forEach((w: any) => {
          if (w?.word) set.add(String(w.word).toLowerCase());
        });
        setDictionary(set);
      })
      .catch((err) => console.warn("[notes] load failed:", err))
      .finally(() => {
        if (active) {
          loadedRef.current = true;
          setLoading(false);
        }
      });
    return () => {
      active = false;
      loadedRef.current = false;
    };
  }, [documentId]);

  const persist = useCallback(
    async (text: string) => {
      setSave("saving");
      try {
        if (noteId) {
          await overskill.entities.note.update(noteId, { content: text, anchor_text: anchorText || "" });
        } else {
          const created = await overskill.entities.note.create({
            document_id: documentId,
            content: text,
            anchor_text: anchorText || "",
          });
          setNoteId(created.id);
        }
        setSave("saved");
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSave("idle"), 2500);
      } catch (err) {
        console.warn("[notes] save failed:", err);
        setSave("idle");
      }
    },
    [noteId, documentId, anchorText]
  );

  // Autosave 2s after the last keystroke.
  const handleChange = useCallback(
    (next: string) => {
      setContent(next);
      if (!loadedRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 2000);
    },
    [persist]
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const handleKeepWord = useCallback((word: string) => {
    if (!word) return;
    setDictionary((prev) => new Set(prev).add(word));
    overskill.entities.dictionary_word
      .create({ word, language: "auto" })
      .catch((err: unknown) => console.warn("[notes] keep word failed:", err));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">My Notes</h2>
        <span
          className={`text-xs transition-opacity duration-500 ${
            save === "saved" ? "opacity-100 text-sage" : save === "saving" ? "opacity-70 text-muted-foreground" : "opacity-0"
          }`}
          aria-live="polite"
        >
          {save === "saving" ? "Saving…" : "Saved"}
        </span>
      </div>

      {anchorText && (
        <button
          type="button"
          onClick={onAnchorClick}
          className="mb-3 flex w-full items-start gap-2 rounded-xl border border-sage/25 bg-accent/50 p-2.5 pr-2 text-left outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          title="Jump to this passage in the document"
        >
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
          <span className="line-clamp-2 flex-1 text-sm italic text-muted-foreground">"{anchorText}"</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClearAnchor();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onClearAnchor();
              }
            }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Remove anchor"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>
      )}

      {loading ? (
        <div className="flex-1 space-y-2">
          <div className="rr-skeleton h-4 w-1/2 rounded" />
          <div className="rr-skeleton h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <NoteEditor
            value={content}
            onChange={handleChange}
            lang={lang}
            dictionary={dictionary}
            onKeepWord={handleKeepWord}
            coachEnabled={premium}
          />
        </div>
      )}
    </div>
  );
}

export default NotesPanel;
