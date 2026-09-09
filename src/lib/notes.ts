export type NoteColor = "strawberry" | "sage" | "cloud" | "lavender" | "cozy" | "minimal";

export interface NoteRecord {
  id: string;
  document_id: string;
  content?: string;
  anchor_text?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NoteDocument {
  id: string;
  title?: string;
  language?: string;
}

export interface NoteCard {
  note: NoteRecord;
  document?: NoteDocument;
  title: string;
}

export const NOTE_COLORS: NoteColor[] = [
  "strawberry",
  "sage",
  "cloud",
  "lavender",
  "cozy",
  "minimal",
];

const NOTE_COLOR_STORAGE_KEY = "reliefread-note-colors-v1";

export function buildNoteCards(
  notes: NoteRecord[],
  documents: NoteDocument[],
  fallbackTitle: string,
): NoteCard[] {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  return notes.map((note) => {
    const document = documentsById.get(note.document_id);
    return {
      note,
      document,
      title: document?.title?.trim() || fallbackTitle,
    };
  });
}

export function filterNoteCards(cards: NoteCard[], query: string): NoteCard[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return cards;
  return cards.filter(({ note, title }) =>
    [title, note.content || "", note.anchor_text || ""]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized),
  );
}

function readStoredColors(): Record<string, NoteColor> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(NOTE_COLOR_STORAGE_KEY) || "{}");
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, color]) => Boolean(id) && NOTE_COLORS.includes(color as NoteColor),
      ),
    ) as Record<string, NoteColor>;
  } catch {
    return {};
  }
}

export function loadNoteColors(): Record<string, NoteColor> {
  return readStoredColors();
}

export function saveNoteColor(noteId: string, color: NoteColor): Record<string, NoteColor> {
  const next = { ...readStoredColors(), [noteId]: color };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(NOTE_COLOR_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function defaultNoteColor(noteId: string): NoteColor {
  const score = Array.from(noteId).reduce((total, character) => total + character.charCodeAt(0), 0);
  return NOTE_COLORS[score % NOTE_COLORS.length];
}
