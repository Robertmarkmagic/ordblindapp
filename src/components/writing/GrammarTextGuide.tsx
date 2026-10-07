import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { applyCommaSuggestion, type CommaSuggestion, type GrammarLanguage, type GrammarRole, type GrammarToken } from "@/lib/grammar-learning";
import { getGrammarLessons } from "@/lib/grammar-lessons";

const ROLE_LABELS: Record<GrammarLanguage, Record<GrammarRole, string>> = {
  da: { subject: "Stedord", verb: "Udsagnsord", noun: "Navneord", adjective: "Tillægsord", other: "Andet", unknown: "Ikke bestemt" },
  en: { subject: "Pronoun", verb: "Verb", noun: "Noun", adjective: "Adjective", other: "Other", unknown: "Not classified" },
};

export function GrammarTextGuide({ text, tokens, suggestions, language, grammar, onApply, onAskRiley }: {
  text: string;
  tokens: GrammarToken[];
  suggestions: CommaSuggestion[];
  language: GrammarLanguage;
  grammar: boolean;
  onApply: (text: string) => void;
  onAskRiley?: (topic: string) => void;
}) {
  const [selected, setSelected] = useState<{ text: string; kind: "word" | "comma"; index: number } | null>(null);
  const da = language === "da";
  const selection = selected?.text === text ? selected : null;
  const selectedToken = grammar && selection?.kind === "word" ? tokens.find((token) => token.start === selection.index) : null;
  const selectedComma = selection?.kind === "comma" ? suggestions.find((suggestion) => suggestion.index === selection.index) : null;
  const commaAt = new Map(suggestions.map((suggestion) => [suggestion.index, suggestion]));
  const parts: ReactNode[] = [];
  let cursor = 0;
  const pushGap = (end: number) => {
    let gapCursor = cursor;
    for (let at = cursor; at < end; at += 1) {
      if (!commaAt.has(at)) continue;
      parts.push(text.slice(gapCursor, at));
      parts.push(<button key={`comma:${at}`} type="button" onClick={() => setSelected({ text, kind: "comma", index: at })} aria-label={`${da ? "Muligt komma ved tegn" : "Possible comma at character"} ${at + 1}`} aria-pressed={selection?.kind === "comma" && selection.index === at} className="rr-learning-comma">,<span className="sr-only"> {da ? "Tryk for forklaring" : "Press for explanation"}</span></button>);
      gapCursor = at;
    }
    parts.push(text.slice(gapCursor, end));
    cursor = end;
  };
  tokens.forEach((token) => {
    pushGap(token.start);
    parts.push(grammar ? <button key={`word:${token.start}`} type="button" className={`rr-learning-word ${token.sentenceRole ? "is-marked" : ""}`} aria-pressed={selection?.kind === "word" && selection.index === token.start} aria-label={`${token.word}. ${ROLE_LABELS[language][token.role]}${token.sentenceRole ? `. ${token.sentenceRole === "subject" ? da ? "Grundled" : "Subject" : da ? "Udsagnsled" : "Verb"}` : ""}`} onClick={() => setSelected({ text, kind: "word", index: token.start })}>
      {token.word}
      {token.sentenceRole && <span className="rr-learning-symbol" aria-hidden="true">{token.sentenceRole === "subject" ? "×" : "○"}</span>}
    </button> : token.word);
    cursor = token.end;
  });
  pushGap(text.length);
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{da ? "Hjælp direkte i din tekst" : "Guidance directly in your text"}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{da ? "Tryk på et gult komma for at se hvorfor. Det er et forslag og er ikke sat ind endnu. Tryk på et ord for at undersøge det." : "Press a yellow comma to learn why. It is a suggestion and has not been inserted yet. Press a word to explore it."}</p>
      <div className="rr-learning-text mt-3" aria-label={da ? "Din tekst med læringsmarkeringer" : "Your text with learning marks"}>{parts}</div>
      {selectedToken && <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4" role="status">
        <h4 className="font-semibold">{selectedToken.word}: {ROLE_LABELS[language][selectedToken.role]}</h4>
        <p className="mt-2 text-sm leading-relaxed">{selectedToken.sentenceRole === "subject" ? da ? "Muligt grundled ×. Spørg: Hvem eller hvad gør noget? Undersøg, om flere ord hører med til grundleddet." : "Possible subject ×. Ask who or what acts. Check whether other words belong to the whole subject." : selectedToken.sentenceRole === "predicate" ? da ? "Muligt udsagnsled ○. Hvad sker der? Undersøg, om der også er hjælpeudsagnsord, som hører med, for eksempel har skrevet." : "Possible verb ○. What happens? Check for auxiliary verbs that belong to the full verb phrase, such as has written." : da ? "Ordklasse og sætningsled er ikke det samme. Se på ordets opgave i denne sætning. Et ukendt ord skal undersøges i sammenhæng." : "Word class and sentence role are different. Examine this word in its sentence. An unclassified word needs context."}</p>
        {onAskRiley && <Button type="button" variant="outline" onClick={() => onAskRiley(selectedToken.word)} className="mt-3 h-auto min-h-10 whitespace-normal rounded-full">{da ? "Hjælp mig med at undersøge ordet" : "Help me explore this word"}</Button>}
      </div>}
      {selectedComma && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status">
        <h4 className="font-semibold">{selectedComma.optional ? da ? "Valgfrit startkomma" : "Optional Danish start comma" : da ? "Muligt manglende komma" : "Possible missing comma"}</h4>
        <p className="mt-2 text-sm leading-relaxed">{selectedComma.ruleId ? getGrammarLessons(language).find((rule) => rule.id === selectedComma.ruleId)?.explanation || (da ? selectedComma.rule : "Optional Danish start comma before a subordinate clause. Use the same style throughout your text.") : selectedComma.rule}</p>
        <p className="mt-2 text-sm">{da ? "Undersøg sætningsgrænsen og grundled/udsagnsled, før du vælger." : "Check the clause boundary and subject/verb before choosing."}</p>
        <Button type="button" onClick={() => { onApply(applyCommaSuggestion(text, selectedComma)); setSelected(null); }} className="mt-3 h-10 rounded-full bg-[#17345e] text-white">{da ? "Brug dette komma" : "Use this comma"}</Button>
      </div>}
    </div>
  );
}
