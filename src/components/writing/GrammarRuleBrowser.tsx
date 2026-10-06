import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getGrammarLessons, type GrammarLesson } from "@/lib/grammar-lessons";
import type { GrammarLanguage } from "@/lib/grammar-learning";
import { COMMA_RULES, COMMA_RULES_EN } from "@/lib/comma-rules";

function GrammarExercise({ lesson, language }: { lesson: GrammarLesson; language: GrammarLanguage }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const da = language === "da";
  return (
    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <h4 className="text-base font-semibold">{da ? "Prøv selv" : "Try it yourself"}</h4>
      <p className="mt-2 rounded-xl bg-white p-3 text-base leading-relaxed">{lesson.exercise.sentence}</p>
      <p className="mt-3 font-medium">{lesson.exercise.question}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={lesson.exercise.question}>
        {lesson.exercise.choices.map((option, index) => <button key={option} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm focus-visible:outline-sky-600 ${choice === index ? "border-sky-600 bg-sky-100" : "border-slate-300 bg-white"}`}>{option}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setHint((value) => !value)} className="h-10 rounded-full" aria-expanded={hint}>{da ? hint ? "Skjul hint" : "Giv mig et hint" : hint ? "Hide hint" : "Give me a hint"}</Button>
        {choice !== null && <Button type="button" variant="outline" onClick={() => { setChoice(null); setHint(false); }} className="h-10 rounded-full">{da ? "Prøv igen" : "Try again"}</Button>}
      </div>
      {hint && <p className="mt-3 text-sm leading-relaxed">{lesson.exercise.hint}</p>}
      {choice !== null && <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-relaxed" role="status">{choice === lesson.exercise.answer ? `${da ? "Ja, det er rigtigt." : "Yes, that is correct."} ${lesson.exercise.feedback}` : `${da ? "Prøv en gang til." : "Try once more."} ${lesson.exercise.hint}`}</p>}
    </div>
  );
}

export function GrammarRuleBrowser({ textLanguage, language, grammar, comma, practice = false, onAskRiley }: {
  textLanguage: GrammarLanguage;
  language: GrammarLanguage;
  grammar: boolean;
  comma: boolean;
  practice?: boolean;
  onAskRiley?: (topic: string) => void;
}) {
  const rules = getGrammarLessons(textLanguage).filter((lesson) => lesson.category === "grammar" ? grammar : comma);
  const [activeId, setActiveId] = useState(rules[0]?.id || "subject");
  const [extraRuleIndex, setExtraRuleIndex] = useState(0);
  const extraRules = textLanguage === "da" ? COMMA_RULES : COMMA_RULES_EN;
  const extra = extraRules[Math.min(extraRuleIndex, extraRules.length - 1)];
  const active = rules.find((lesson) => lesson.id === activeId) || rules[0];
  const da = language === "da";
  if (!active) return null;
  return (
    <div className="mt-4">
      <label className="block text-sm font-semibold">
        {da ? "Vælg en regel" : "Choose a rule"}
        <select value={active.id} onChange={(event) => setActiveId(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-black focus-visible:outline-sky-600">
          {rules.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
        </select>
      </label>
      <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-display text-lg font-semibold">{active.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{active.explanation}</p>
        <div className="mt-3 rounded-xl bg-slate-50 p-3"><b className="text-xs uppercase tracking-wide text-slate-600">{da ? "Eksempel" : "Example"}</b><p className="mt-1 text-base leading-relaxed">{active.example}</p></div>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {active.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        {onAskRiley && <Button type="button" variant="outline" onClick={() => onAskRiley(active.title)} className="mt-4 min-h-11 h-auto whitespace-normal rounded-full">{da ? "Vejled mig i min egen tekst" : "Guide me in my own text"}</Button>}
        {practice && <GrammarExercise key={`${textLanguage}:${active.id}`} lesson={active} language={language} />}
      </article>
      {comma && <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold">{da ? "Flere kommaregler" : "More comma rules"} ({extraRules.length})</summary>
        <label className="mt-3 block text-sm">{da ? "Vælg en kommaregel" : "Choose a comma rule"}
          <select value={extraRuleIndex} onChange={(event) => setExtraRuleIndex(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-black">
            {extraRules.map((rule, index) => <option key={rule.title} value={index}>{rule.title}</option>)}
          </select>
        </label>
        <h4 className="mt-4 font-semibold">{extra.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{extra.explanation}</p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{extra.example}</p>
      </details>}
      <p className="mt-3 text-xs text-slate-600">{da ? "Regelgrundlag" : "Rule sources"}: <a className="underline underline-offset-2" href={textLanguage === "da" ? "https://sproget.dk/typiske-problemer/komma/kommagrammatik/" : "https://owl.purdue.edu/owl/general_writing/grammar/index.html"} target="_blank" rel="noreferrer">{textLanguage === "da" ? "Dansk Sprognævn / sproget.dk" : "Purdue OWL"}</a></p>
    </div>
  );
}
