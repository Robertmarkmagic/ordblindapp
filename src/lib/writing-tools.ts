export type WritingLanguage = "da" | "en";

const WORDS: Record<WritingLanguage, string[]> = {
  da: [
    "aftale", "arbejde", "besked", "bestilt", "betale", "betaling", "bliver", "dag", "desværre",
    "eftermiddag", "eller", "fordi", "forstå", "fredag", "gerne", "godt", "hjælp", "hjemme", "ikke",
    "i morgen", "komme", "kontakt", "lavet", "mail", "mandag", "med", "møde", "næste",
    "onsdag", "ord", "sammen", "skrive", "spørgsmål", "svar", "tak", "tandlæge", "tandlægen",
    "tandlægetid", "tekst", "tid", "tilbage", "torsdag", "venlig", "venligst", "ville",
  ],
  en: [
    "appointment", "because", "contact", "could", "dentist", "email", "friday", "help", "message",
    "monday", "next", "please", "question", "reply", "schedule", "thank", "thursday", "today",
    "tomorrow", "understand", "wednesday", "would", "write",
  ],
};

const NEXT_WORDS: Record<WritingLanguage, Record<string, string[]>> = {
  da: {
    jeg: ["kan", "skal", "vil", "har"],
    kan: ["godt", "ikke", "desværre", "vi"],
    skal: ["til", "have", "bruge", "møde"],
    til: ["dig", "møde", "tandlægen", "torsdag"],
    det: ["kan", "er", "bliver", "lyder"],
    vi: ["kan", "skal", "har", "ses"],
    tak: ["for", "fordi", "skal", "og"],
  },
  en: {
    i: ["can", "will", "would", "have"],
    can: ["help", "meet", "send", "confirm"],
    will: ["be", "send", "call", "reply"],
    to: ["the", "you", "meet", "confirm"],
    we: ["can", "will", "have", "should"],
    thank: ["you", "you for", "you very much"],
  },
};

export interface WritingSuggestions {
  prefix: string;
  words: string[];
  nextWords: string[];
}

function wordBeforePrefix(text: string, prefixStart: number) {
  return text
    .slice(0, prefixStart)
    .trimEnd()
    .match(/([\p{L}]+)$/u)?.[1]
    ?.toLocaleLowerCase() || "";
}

export function getWritingSuggestions(
  text: string,
  caret: number,
  language: WritingLanguage
): WritingSuggestions {
  const safeCaret = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, safeCaret);
  const match = before.match(/([\p{L}æøåÆØÅ]+)$/u);
  const prefix = match?.[1] || "";
  const normalized = prefix.toLocaleLowerCase();
  const prefixStart = safeCaret - prefix.length;
  const previous = wordBeforePrefix(text, prefixStart);

  const words = normalized.length >= 2
    ? WORDS[language]
        .filter((word) => word.toLocaleLowerCase().startsWith(normalized) && word.toLocaleLowerCase() !== normalized)
        .slice(0, 5)
    : [];

  const lastCompleteWord = prefix ? previous : wordBeforePrefix(text, safeCaret);
  const nextWords = (NEXT_WORDS[language][lastCompleteWord] || (language === "da"
    ? ["og", "men", "fordi", "derfor"]
    : ["and", "but", "because", "therefore"])).slice(0, 4);

  return { prefix, words, nextWords };
}

export function insertWritingSuggestion(
  text: string,
  caret: number,
  suggestion: string,
  replacePrefix: boolean
) {
  const safeCaret = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, safeCaret);
  const prefix = replacePrefix ? before.match(/([\p{L}æøåÆØÅ]+)$/u)?.[1] || "" : "";
  const start = safeCaret - prefix.length;
  const leadingSpace = !replacePrefix && start > 0 && !/\s$/.test(text.slice(0, start)) ? " " : "";
  const inserted = `${leadingSpace}${suggestion} `;
  return {
    text: text.slice(0, start) + inserted + text.slice(safeCaret),
    caret: start + inserted.length,
  };
}

export function replaceFirstExact(text: string, original: string, suggestion: string) {
  const at = text.indexOf(original);
  if (at < 0) return text;
  return text.slice(0, at) + suggestion + text.slice(at + original.length);
}
