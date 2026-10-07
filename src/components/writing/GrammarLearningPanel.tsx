import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GrammarTextGuide } from "./GrammarTextGuide";
import { GrammarRuleBrowser } from "./GrammarRuleBrowser";
import { analyseGrammar, detectGrammarLanguage, findDanishCommaSuggestions, findEnglishCommaSuggestions, type CommaSuggestion, type GrammarLanguage } from "@/lib/grammar-learning";

export function GrammarLearningPanel({ text, language, grammar, comma, onApply, onAskRiley, additionalCommaSuggestions = [], startComma: controlledStartComma, onStartCommaChange, textLanguageSelection, onTextLanguageSelectionChange }: {
  text: string;
  language: GrammarLanguage;
  grammar: boolean;
  comma: boolean;
  onApply: (text: string) => void;
  onAskRiley?: (topic: string) => void;
  additionalCommaSuggestions?: CommaSuggestion[];
  startComma?: boolean;
  onStartCommaChange?: (value: boolean) => void;
  textLanguageSelection?: GrammarLanguage | "auto";
  onTextLanguageSelectionChange?: (value: GrammarLanguage | "auto") => void;
}) {
  const [localLanguage, setLocalLanguage] = useState<GrammarLanguage | "auto">("auto");
  const selectedLanguage = textLanguageSelection ?? localLanguage;
  const setSelectedLanguage = onTextLanguageSelectionChange ?? setLocalLanguage;
  const [localStartComma, setLocalStartComma] = useState(false);
  const startComma = controlledStartComma ?? localStartComma;
  const setStartComma = onStartCommaChange ?? setLocalStartComma;
  const [view, setView] = useState<"text" | "rules" | "practice">("text");
  const textLanguage = selectedLanguage === "auto" ? detectGrammarLanguage(text, language) : selectedLanguage;
  const da = language === "da";
  const tokens = useMemo(() => analyseGrammar(text, textLanguage), [text, textLanguage]);
  const suggestions = useMemo(() => {
    if (!comma) return [];
    const local = textLanguage === "da" ? findDanishCommaSuggestions(text, { startComma }) : findEnglishCommaSuggestions(text);
    const combined = [...additionalCommaSuggestions.filter((item) => item.original === text && (!item.optional || startComma)), ...local];
    return combined.filter((item, index) => combined.findIndex((other) => other.index === item.index) === index).sort((a, b) => a.index - b.index);
  }, [text, textLanguage, startComma, comma, additionalCommaSuggestions]);

  return (
    <section className="rounded-3xl border border-sky-200 bg-white p-5 text-black shadow-paper" aria-label={da ? "Lær af din egen tekst" : "Learn from your text"}>
      <h2 className="font-display text-xl font-semibold">{da ? "Lær grammatik og komma" : "Learn grammar and commas"}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{da ? "Få vejledning i din egen tekst, forstå reglerne og øv dig trin for trin. Du vælger selv, hvad der ændres." : "Explore your own text, understand the rules and practise step by step. You choose what changes."}</p>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span>{da ? "Tekstens sprog" : "Text language"}</span>
        <select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value as GrammarLanguage | "auto")} className="min-h-10 max-w-full rounded-xl border border-slate-300 bg-white px-2 text-black focus-visible:outline-sky-600">
          <option value="auto">{da ? "Automatisk" : "Automatic"} ({textLanguage === "da" ? da ? "dansk" : "Danish" : da ? "engelsk" : "English"})</option>
          <option value="da">{da ? "Dansk" : "Danish"}</option>
          <option value="en">{da ? "Engelsk" : "English"}</option>
        </select>
      </label>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={da ? "Vælg læringsvisning" : "Choose learning view"}>
        {(["text", "rules", "practice"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} aria-pressed={view === item} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-sky-600 ${view === item ? "border-sky-600 bg-sky-100" : "border-slate-300 bg-white"}`}>{item === "text" ? da ? "Min tekst" : "My text" : item === "rules" ? da ? "Regler og eksempler" : "Rules and examples" : da ? "Øv selv" : "Practise"}</button>)}
      </div>
      {view === "text" ? (
        <>
          {grammar && <p className="mt-4 text-sm text-slate-700">{da ? "× Grundled: Hvem eller hvad gør noget? ○ Udsagnsled: Hvad sker der?" : "× Subject: Who or what acts? ○ Verb: What happens?"}</p>}
          {comma && textLanguage === "da" && <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <span className="text-sm"><b className="block">{da ? "Med startkomma" : "Include Danish start commas"}</b><small className="text-xs text-slate-600">{da ? "Valgfrit komma før ledsætninger. Følg samme valg i hele teksten." : "Optional commas before subordinate clauses. Keep the same choice throughout your text."}</small></span>
            <Switch checked={startComma} onCheckedChange={setStartComma} aria-label={da ? "Med startkomma" : "Include Danish start commas"} />
          </label>}
          {text.trim() ? <GrammarTextGuide text={text} tokens={tokens} suggestions={suggestions} language={language} grammar={grammar} onApply={onApply} onAskRiley={onAskRiley} /> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{da ? "Skriv eller indsæt din opgave ovenfor. Du kan også åbne reglerne eller prøve en øvelse nu." : "Write or paste your task above. You can also open the rules or try an exercise now."}</p>}
          {comma && text.trim() && <p className="mt-3 text-xs text-slate-600" role="status">{suggestions.length ? `${suggestions.length} ${da ? "mulige kommasteder. Tryk på et gult komma i teksten." : "possible comma positions. Press a yellow comma in the text."}` : da ? "Ingen forslag fra de enkle kommaregler. Det betyder ikke, at alle kommaer er tjekket." : "No suggestions from the simple comma rules. This does not mean all commas have been checked."}</p>}
          <p className="mt-3 text-xs leading-relaxed text-slate-600">{da ? "De automatiske markeringer er forslag til enkle sætninger. De viser genkendte ord, ikke altid hele grundled eller udsagnsled. Undersøg hele leddet med reglerne eller få Riley til at vejlede dig." : "Automatic marks are suggestions for simple sentences. They show recognised words, not always the whole subject or verb phrase. Explore the full phrase using the rules or ask Riley to guide you."}</p>
          {onAskRiley && <Button type="button" variant="outline" onClick={() => onAskRiley(da ? "Min grammatikopgave, ét trin ad gangen" : "My grammar task, one step at a time")} className="mt-4 h-auto min-h-11 whitespace-normal rounded-full">{da ? "Arbejd med min opgave sammen med Riley" : "Work on my task with Riley"}</Button>}
        </>
      ) : <GrammarRuleBrowser key={textLanguage} textLanguage={textLanguage} language={language} grammar={grammar} comma={comma} practice={view === "practice"} onAskRiley={onAskRiley} />}
    </section>
  );
}
