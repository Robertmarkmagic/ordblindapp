import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  analyseGrammar,
  applyCommaSuggestion,
  detectGrammarLanguage,
  findDanishCommaSuggestions,
  type GrammarLanguage,
  type GrammarRole,
} from "@/lib/grammar-learning";

const ROLE_LABELS: Record<GrammarLanguage, Record<GrammarRole, string>> = {
  da: { subject: "Stedord", verb: "Udsagnsord", noun: "Navneord", adjective: "Tillægsord", other: "Andet", unknown: "Ikke bestemt" },
  en: { subject: "Pronoun", verb: "Verb", noun: "Noun", adjective: "Adjective", other: "Other", unknown: "Not classified" },
};

export function GrammarLearningPanel({ text, language, grammar, comma, onApply }: {
  text: string;
  language: GrammarLanguage;
  grammar: boolean;
  comma: boolean;
  onApply: (text: string) => void;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<GrammarLanguage | "auto">("auto");
  const [startComma, setStartComma] = useState(false);
  const [visibleWords, setVisibleWords] = useState(24);
  const textLanguage = selectedLanguage === "auto" ? detectGrammarLanguage(text, language) : selectedLanguage;
  const da = language === "da";
  const tokens = useMemo(() => analyseGrammar(text, textLanguage), [text, textLanguage]);
  const suggestions = useMemo(
    () => textLanguage === "da" ? findDanishCommaSuggestions(text, { startComma }) : [],
    [text, textLanguage, startComma],
  );

  return (
    <section className="rounded-3xl border border-sky-200 bg-white p-5 text-black shadow-paper" aria-label={da ? "Lær af din egen tekst" : "Learn from your text"}>
      <h2 className="font-display text-xl font-semibold">{da ? "Lær af din egen tekst" : "Learn from your text"}</h2>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span>{da ? "Tekstens sprog" : "Text language"}</span>
        <select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value as GrammarLanguage | "auto")} className="min-h-10 rounded-xl border border-slate-300 bg-white px-2 text-black focus-visible:outline-sky-600">
          <option value="auto">{da ? "Automatisk" : "Automatic"} ({textLanguage === "da" ? da ? "dansk" : "Danish" : da ? "engelsk" : "English"})</option>
          <option value="da">{da ? "Dansk" : "Danish"}</option>
          <option value="en">{da ? "Engelsk" : "English"}</option>
        </select>
      </label>
      <p className="mt-3 text-sm text-slate-600">{da ? "× Grundled: Hvem eller hvad gør noget? ○ Udsagnsled: Hvad sker der?" : "× Subject: Who or what acts? ○ Verb: What happens?"}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{da ? "Markeringerne er forslag til enkle sætninger. Ord, som ikke genkendes, vises som ‘Ikke bestemt’. Brug Tjek min tekst til en mere grundig gennemgang." : "The markings are suggestions for simple sentences. Unrecognised words are shown as ‘Not classified’. Use Check my text for a fuller review."}</p>
      {grammar && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {tokens.slice(0, visibleWords).map((token, index) => (
              <span key={token.start} className={`grid min-w-[4.25rem] rounded-xl border px-2 py-1.5 text-center ${token.sentenceRole ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white"}`}>
                <b className="text-sm">{token.word}{text.slice(token.end, tokens[index + 1]?.start ?? text.length).trim()}</b>
                <small className="text-[11px] text-slate-600">{ROLE_LABELS[language][token.role]}</small>
                {token.sentenceRole && <em className="text-[11px] font-bold not-italic text-[#17345e]">{token.sentenceRole === "subject" ? da ? "× Grundled" : "× Subject" : da ? "○ Udsagnsled" : "○ Verb"}</em>}
              </span>
            ))}
          </div>
          {tokens.length > visibleWords && <Button type="button" variant="outline" onClick={() => setVisibleWords((count) => count + 24)} className="mt-3 rounded-full">{da ? "Vis flere ord" : "Show more words"} ({visibleWords}/{tokens.length})</Button>}
        </>
      )}
      {comma && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold">{da ? "Kommahjælp i din tekst" : "Comma help in your text"}</h3>
          {textLanguage === "da" ? (
            <>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <span className="text-sm"><b className="block">{da ? "Med startkomma" : "Include Danish start commas"}</b><small className="text-xs text-slate-600">{da ? "Valgfrit komma før ledsætninger. Følg samme valg i hele teksten." : "Optional commas before subordinate clauses. Keep the same choice throughout your text."}</small></span>
                <Switch checked={startComma} onCheckedChange={setStartComma} aria-label={da ? "Med startkomma" : "Include Danish start commas"} />
              </label>
              {suggestions.length ? suggestions.map((suggestion) => (
                <div key={suggestion.index} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{suggestion.original.slice(Math.max(0, suggestion.index - 55), suggestion.index)}<mark className="rounded bg-amber-200 px-1 font-bold text-black" aria-label={da ? "Foreslået komma" : "Suggested comma"}>,</mark>{suggestion.original.slice(suggestion.index, suggestion.index + 75)}</p>
                  <p className="mt-2 text-xs text-slate-600">{da ? suggestion.rule : suggestion.optional ? "Optional Danish start comma before a subordinate clause. Keep the same comma style throughout your text." : "Danish comma between two main clauses, each with its own subject and verb."}</p>
                  <Button type="button" onClick={() => onApply(applyCommaSuggestion(text, suggestion))} className="mt-2 h-9 rounded-full bg-[#17345e] text-xs font-semibold text-white">{da ? "Brug dette komma" : "Use this comma"}</Button>
                </div>
              )) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{da ? "Ingen forslag fra de enkle kommaregler. Det betyder ikke, at alle kommaer er tjekket. Brug Tjek min tekst til en grundigere gennemgang." : "No suggestions from the simple comma rules. This does not mean every comma has been checked. Use Check my text for a fuller review."}</p>}
            </>
          ) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{da ? "Denne kommahjælp følger danske regler. Til engelsk kan du vælge Komma og trykke på Tjek min tekst." : "This learning guide uses Danish comma rules. For English, enable Commas and press Check my text."}</p>}
        </div>
      )}
    </section>
  );
}
