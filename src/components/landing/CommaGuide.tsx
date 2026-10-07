import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronRight, CircleHelp } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { COMMA_RULES, COMMA_RULES_EN } from "@/lib/comma-rules";

const CLAUSE_MARKERS = ["fordi", "hvis", "når", "selvom", "at", "som", "der", "hvor", "hvordan", "hvem", "hvorfor"];
export function CommaGuide({ sentence }: { sentence: string }) {
  const { language } = useLanguage();
  const en = language === "en";
  const tr = (da: string, english: string) => en ? english : da;
  const rules = en ? COMMA_RULES_EN : COMMA_RULES;
  const [open, setOpen] = useState(false);
  const [activeRule, setActiveRule] = useState(0);
  const [startComma, setStartComma] = useState<"with" | "without">("with");

  const liveHint = useMemo(() => {
    if (en) {
      const lower = sentence.toLocaleLowerCase("en-US");
      if (/\b(but|and|or|so)\b/.test(lower)) return "Check whether the conjunction joins two complete clauses. If it does, a comma may be needed before it.";
      if (/\b(because|although|when|if|while)\b/.test(lower)) return "This word can introduce a dependent clause. Check whether a comma helps separate it from the main clause.";
      return "Write a longer sentence with words such as ‘because’, ‘but’ or ‘when’, and ReliefRead will suggest a possible comma boundary.";
    }
    const lower = sentence.toLocaleLowerCase("da-DK");
    if (/\bmen\b/.test(lower) && !/,\s*men\b/.test(lower)) return "Jeg fandt ‘men’. Det er en god og sikker løsning at sætte komma foran ‘men’.";
    const marker = CLAUSE_MARKERS.find((word) => new RegExp(`\\b${word}\\b`, "u").test(lower));
    if (marker) return `Jeg fandt ‘${marker}’. Det kan indlede en ledsætning. Se efter grundled og udsagnsled, og husk slutkommaet, hvis helsætningen fortsætter.`;
    if (/\bog\b/.test(lower)) return "Jeg fandt ‘og’. Undersøg, om der er et grundled og et udsagnsled på begge sider. Hvis ja, skal der normalt komma.";
    return "Skriv en længere sætning med for eksempel ‘fordi’, ‘men’ eller ‘når’, så hjælper ReliefRead med at finde en mulig kommagrænse.";
  }, [en, sentence]);

  return (
    <div className="rr-comma-guide">
      <button type="button" className="rr-comma-toggle" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span><BookOpenCheck aria-hidden="true" /><b>{tr("De danske kommaregler", "English punctuation guide")}</b><small>{en ? `${rules.length} short explanations with examples` : "20 korte forklaringer med eksempler"}</small></span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="rr-comma-content">
          <div className="rr-comma-intro">
            <div>
              <b>{tr("Vælg din kommastil", "Choose your punctuation style")}</b>
              <p>{tr("Startkomma er valgfrit. ReliefRead hjælper dig med at bruge dit valg konsekvent.", "ReliefRead helps you apply punctuation consistently throughout your text.")}</p>
            </div>
            <div role="group" aria-label={tr("Vælg kommastil", "Choose punctuation style")}>
              <button type="button" aria-pressed={startComma === "with"} onClick={() => setStartComma("with")}>{tr("Med startkomma", "More guidance")}</button>
              <button type="button" aria-pressed={startComma === "without"} onClick={() => setStartComma("without")}>{tr("Uden startkomma", "Less guidance")}</button>
            </div>
          </div>
          <div className="rr-comma-live-hint"><CircleHelp aria-hidden="true" /><span><b>{tr("Hjælp til din sætning", "Help with your sentence")}</b>{liveHint}</span></div>
          <div className="rr-comma-browser">
            <div className="rr-comma-rule-list" aria-label={tr("Kommaregler", "Punctuation rules")}>
              {rules.map((rule, index) => (
                <button key={rule.title} type="button" aria-pressed={activeRule === index} onClick={() => setActiveRule(index)}>
                  <span>{index + 1}</span>{rule.title}<ChevronRight aria-hidden="true" />
                </button>
              ))}
            </div>
            <article className="rr-comma-rule-detail" aria-live="polite">
              <span>{tr("Regel", "Rule")} {activeRule + 1} {tr("af", "of")} {rules.length}</span>
              <h4>{rules[Math.min(activeRule, rules.length - 1)].title}</h4>
              <p>{rules[Math.min(activeRule, rules.length - 1)].explanation}</p>
              <div><b>{tr("Eksempel", "Example")}</b><q>{rules[Math.min(activeRule, rules.length - 1)].example}</q></div>
            </article>
          </div>
          <a href={en ? "https://owl.purdue.edu/owl/general_writing/punctuation/commas/index.html" : "https://dsn.dk/hjaelp-til-dansk/kommaoevelser/komma-det-korte-overblik/"} target="_blank" rel="noreferrer">{tr("Læs Dansk Sprognævns officielle overblik", "Read Purdue OWL’s comma guide")}</a>
        </div>
      )}
    </div>
  );
}
