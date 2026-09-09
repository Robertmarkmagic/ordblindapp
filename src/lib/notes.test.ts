import { describe, expect, it } from "vitest";
import { buildNoteCards, defaultNoteColor, filterNoteCards } from "@/lib/notes";

describe("notes helpers", () => {
  const notes = [
    { id: "note-a", document_id: "doc-a", content: "Husk mødet på tirsdag", anchor_text: "Mødet starter klokken ni" },
    { id: "note-b", document_id: "doc-b", content: "Forklar dette ord", anchor_text: "kompliceret" },
  ];
  const documents = [
    { id: "doc-a", title: "Brev fra skolen", language: "da" },
    { id: "doc-b", title: "Arbejdsnoter", language: "da" },
  ];

  it("joins notes with their documents", () => {
    const cards = buildNoteCards(notes, documents, "Uden titel");
    expect(cards.map((card) => card.title)).toEqual(["Brev fra skolen", "Arbejdsnoter"]);
  });

  it("searches note text, anchor and document title", () => {
    const cards = buildNoteCards(notes, documents, "Uden titel");
    expect(filterNoteCards(cards, "skolen")).toHaveLength(1);
    expect(filterNoteCards(cards, "kompliceret")[0].note.id).toBe("note-b");
    expect(filterNoteCards(cards, "TIRSDAG")[0].note.id).toBe("note-a");
  });

  it("returns a stable color for a note", () => {
    expect(defaultNoteColor("same-note")).toBe(defaultNoteColor("same-note"));
  });
});
