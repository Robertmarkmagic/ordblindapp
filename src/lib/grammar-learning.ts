export type GrammarRole = "subject" | "verb" | "noun" | "adjective" | "other";

export interface GrammarToken {
  word: string;
  role: GrammarRole;
  sentenceRole?: "subject" | "predicate";
}

export interface CommaSuggestion {
  original: string;
  corrected: string;
  rule: string;
  index: number;
}

const PRONOUNS = new Set(["jeg", "du", "han", "hun", "den", "det", "vi", "i", "de", "man"]);
const VERBS = new Set(["er", "var", "har", "havde", "vil", "ville", "skal", "skulle", "kan", "kunne", "må", "bliver", "blev", "går", "gik", "skriver", "skrev", "læser", "læste", "spiser", "spiste", "kommer", "kom", "siger", "sagde", "gør", "gjorde"]);
const ADJECTIVES = new Set(["god", "gode", "glad", "tydelig", "tydeligt", "rolig", "roligt", "svær", "svært", "let", "nem", "stor", "lille", "grøn", "blå"]);

function roleFor(word: string): GrammarRole {
  const normalized = word.toLocaleLowerCase("da-DK");
  if (PRONOUNS.has(normalized)) return "subject";
  if (VERBS.has(normalized) || /(ede|te|er)$/.test(normalized)) return "verb";
  if (ADJECTIVES.has(normalized) || /(lig|isk|fuld|løs)$/.test(normalized)) return "adjective";
  if (/^(en|et|og|eller|men|fordi|som|når|hvis|at|på|til|fra|med|af)$/i.test(normalized)) return "other";
  return "noun";
}

export function analyseDanishGrammar(text: string): GrammarToken[] {
  const words = text.match(/[\p{L}æøåÆØÅ]+/gu) || [];
  let subjectFound = false;
  let predicateFound = false;
  return words.map((word) => {
    const role = roleFor(word);
    let sentenceRole: GrammarToken["sentenceRole"];
    if (!subjectFound && (role === "subject" || role === "noun")) {
      subjectFound = true;
      sentenceRole = "subject";
    } else if (subjectFound && !predicateFound && role === "verb") {
      predicateFound = true;
      sentenceRole = "predicate";
    }
    return { word, role, sentenceRole };
  });
}

export function findDanishCommaSuggestions(text: string): CommaSuggestion[] {
  const suggestions: CommaSuggestion[] = [];
  const rules = [
    { expression: /\s+(men)\s+/gi, label: "Komma før ‘men’, når ordet forbinder to sætninger." },
    { expression: /\s+(fordi|når|hvis|selvom)\s+/gi, label: "Ledsætningen kan afgrænses med komma. ReliefRead viser stedet, så du kan tage stilling." },
  ];
  for (const { expression, label } of rules) {
    for (const match of text.matchAll(expression)) {
      const index = match.index ?? -1;
      if (index < 0 || text[index - 1] === ",") continue;
      const conjunction = match[1];
      suggestions.push({
        original: text,
        corrected: `${text.slice(0, index)}, ${conjunction}${text.slice(index + match[0].length - 1)}`,
        rule: label,
        index,
      });
    }
  }
  return suggestions.filter((item, index, all) => all.findIndex((other) => other.index === item.index) === index);
}
