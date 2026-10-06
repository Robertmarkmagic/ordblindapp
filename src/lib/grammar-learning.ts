export type GrammarLanguage = "da" | "en";
export type GrammarRole = "subject" | "verb" | "noun" | "adjective" | "other" | "unknown";

export interface GrammarToken {
  word: string;
  role: GrammarRole;
  start: number;
  end: number;
  sentenceRole?: "subject" | "predicate";
}

export interface CommaSuggestion {
  original: string;
  corrected: string;
  rule: string;
  /** Character position at which the comma is inserted. */
  index: number;
  optional: boolean;
}

const words = (text: string) => new Set(text.split(" "));
const LEXICON = {
  da: {
    pronouns: words("jeg du han hun den det vi i de man"),
    verbs: words("er var har havde vil ville skal skulle kan kunne må måtte bliver blev går gik skriver skrev læser læste spiser spiste kommer kom siger sagde gør gjorde ser så ved vidste lærer lærte leger legede arbejder arbejdede hjælper hjalp bor boede løber løb sover sov regner regnede"),
    nouns: words("mor far barn barnet børn børnene hund hunden kat katten bog bogen bøger lærer læreren skole skolen tekst teksten brev brevet pige pigen dreng drengen"),
    adjectives: words("god gode glad glade tydelig tydeligt rolig roligt svær svært let nem stor store lille grøn grønt blå"),
    other: words("en et og eller men fordi som når hvis selvom at på til fra med af for ikke også nu min din sin vores deres meget gerne"),
    boundaries: words("og eller men fordi når hvis selvom at som"),
    prepositions: words("på til fra med af for i under over bag foran"),
  },
  en: {
    pronouns: words("i you he she it we they"),
    verbs: words("am is are was were have has had will would shall should can could may might must do does did read reads write writes wrote eat eats ate come comes came say says said see sees saw go goes went know knows knew learn learns learned work works worked help helps helped live lives lived run runs ran sleep sleeps slept"),
    nouns: words("mother father child children dog dogs cat cats book books teacher teachers school text letter girl boy"),
    adjectives: words("good happy clear calm difficult easy big small green blue"),
    other: words("a an the and or but because when if although that on to from with of for not also now my your our their very"),
    boundaries: words("and or but because when if although that"),
    prepositions: words("on to from with of for in under over behind before"),
  },
};

function roleFor(word: string, language: GrammarLanguage): GrammarRole {
  const normalized = word.toLocaleLowerCase(language);
  const lexicon = LEXICON[language];
  if (lexicon.pronouns.has(normalized)) return "subject";
  if (lexicon.verbs.has(normalized)) return "verb";
  if (lexicon.nouns.has(normalized)) return "noun";
  if (lexicon.adjectives.has(normalized)) return "adjective";
  if (lexicon.other.has(normalized) || lexicon.prepositions.has(normalized)) return "other";
  // Endings such as -er also occur in nouns. Leave unfamiliar words unclassified.
  return "unknown";
}

/** Use recognised words, with the interface language as a fallback for short drafts. */
export function detectGrammarLanguage(text: string, fallback: GrammarLanguage): GrammarLanguage {
  const tokens = text.match(/\p{L}+/gu) || [];
  const score = (language: GrammarLanguage) => tokens.filter((word) => roleFor(word, language) !== "unknown").length;
  const da = score("da");
  const en = score("en");
  return da === en ? fallback : da > en ? "da" : "en";
}

/** A small learning guide for simple clauses, not a complete grammatical parser. */
export function analyseGrammar(text: string, language: GrammarLanguage): GrammarToken[] {
  const tokens: GrammarToken[] = Array.from(text.matchAll(/\p{L}+(?:['’]\p{L}+)*/gu), (match) => ({
    word: match[0],
    role: roleFor(match[0], language),
    start: match.index!,
    end: match.index! + match[0].length,
  }));
  const lexicon = LEXICON[language];
  let clause: GrammarToken[] = [];
  const markClause = () => {
    const verbIndex = clause.findIndex((token) => token.role === "verb");
    if (verbIndex < 0) return;
    const candidates = clause.filter((token, index) => {
      if (token.role !== "subject" && token.role !== "noun") return false;
      // The Danish word "I" may be either a pronoun or a preposition.
      if (language === "da" && token.word.toLowerCase() === "i" && clause[index + 1]?.role === "noun") return false;
      if (index > 0 && lexicon.prepositions.has(clause[index - 1].word.toLowerCase())) return false;
      return true;
    });
    const verb = clause[verbIndex];
    const before = candidates.filter((token) => token.start < verb.start);
    // Questions/inversion: "Læser du?" / "Can you read?".
    const subject = before[before.length - 1] || candidates.find((token) => token.start > verb.start && token.role === "subject");
    if (!subject) return;
    subject.sentenceRole = "subject";
    verb.sentenceRole = "predicate";
  };
  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];
    const gap = text.slice(previous?.end ?? 0, token.start);
    if (/[.!?;:\n,]/.test(gap) || lexicon.boundaries.has(token.word.toLowerCase())) {
      markClause();
      clause = [];
    }
    if (!lexicon.boundaries.has(token.word.toLowerCase())) clause.push(token);
  });
  markClause();
  return tokens;
}

export function analyseDanishGrammar(text: string): GrammarToken[] {
  return analyseGrammar(text, "da");
}

function hasClause(text: string): boolean {
  const tokens = analyseDanishGrammar(text);
  return tokens.some((token) => token.sentenceRole === "subject") &&
    tokens.some((token) => token.sentenceRole === "predicate");
}

/** Conservative Danish hints. Optional start commas require an explicit opt-in. */
export function findDanishCommaSuggestions(
  text: string,
  { startComma = false }: { startComma?: boolean } = {},
): CommaSuggestion[] {
  const suggestions: CommaSuggestion[] = [];
  const expression = /[^\S\r\n]+(men|og|eller|fordi|når|hvis|selvom|at)[^\S\r\n]+/gi;
  for (const match of text.matchAll(expression)) {
    const index = match.index!;
    const before = text.slice(0, index);
    const conjunction = match[1].toLowerCase();
    if (/[,;:.!?]\s*$/.test(before)) continue;
    const optional = !["men", "og", "eller"].includes(conjunction);
    if (optional && !startComma) continue;
    const clauseBoundary = /[.!?;:\n,]|\s+(?:men|og|eller|fordi|når|hvis|selvom|at|som)\s+/i;
    const left = before.split(clauseBoundary).pop() || "";
    const right = text.slice(index + match[0].length).split(clauseBoundary)[0];
    if (!hasClause(left) || !hasClause(right)) continue;
    // Multiword conjunctions need a fuller parser to locate the start correctly.
    if (optional && /\b(lige|netop|kun|også|især|først|selv|som|for|så|hver gang)\s*$/i.test(left)) continue;
    // Never infer a main-clause comma from verbs buried in subordinate clauses.
    if (!optional && /\b(fordi|når|hvis|selvom|at|som)\b/i.test(left + " " + right)) continue;
    suggestions.push({
      original: text,
      corrected: `${before},${text.slice(index)}`,
      rule: optional
        ? "Valgfrit startkomma før ledsætningen. Brug samme kommapraksis i hele teksten."
        : `Komma før ‘${conjunction}’, når ordet forbinder to helsætninger med hvert sit grundled og udsagnsled.`,
      index,
      optional,
    });
  }
  return suggestions;
}

/** Apply only to the exact text analysed, so an old hint cannot overwrite edits. */
export function applyCommaSuggestion(text: string, suggestion: CommaSuggestion): string {
  return text === suggestion.original ? suggestion.corrected : text;
}
