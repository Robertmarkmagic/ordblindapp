import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronRight, CircleHelp } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type CommaRule = {
  title: string;
  explanation: string;
  example: string;
};

const COMMA_RULES: CommaRule[] = [
  { title: "Kryds og bolle", explanation: "Sæt kryds ved grundleddet og bolle ved udsagnsleddet. Flere sæt kryds og bolle viser, at sætningen består af flere sætningsdele.", example: "Sofie × læser ○, og Amir × skriver ○." },
  { title: "Opremsninger", explanation: "Sæt komma mellem sideordnede ord og led, når de ikke er bundet sammen af og, men eller eller.", example: "Vi købte æbler, pærer og bananer." },
  { title: "Titler og adresser", explanation: "Adskil sideordnede titler, betegnelser og dele af en adresse med komma.", example: "Maja Holm, lærer, Aarhus." },
  { title: "Forstærkende gentagelse", explanation: "En gentagelse, der bruges til at forstærke et ord eller udtryk, adskilles med komma.", example: "Det var en meget, meget lang dag." },
  { title: "Selvstændige sætningsdele", explanation: "Et selvstændigt indskud kan afgrænses med komma, når det hjælper læseren med at forstå sætningen.", example: "Opgaven er, efter min mening, tydelig." },
  { title: "Appositioner", explanation: "Et forklarende ekstraled, der kan undværes, skal stå mellem kommaer.", example: "Min nabo, en dygtig kok, laver middagen." },
  { title: "Udråb og tiltale", explanation: "Udråb, navne i direkte tiltale og små spørgende tilføjelser adskilles fra resten.", example: "Freja, vil du hjælpe? Ja, det vil jeg." },
  { title: "Forklaringer og præciseringer", explanation: "Forklarende eller præciserende tilføjelser afgrænses med komma.", example: "Vi mødes fredag, altså dagen før festen." },
  { title: "Parentetiske relativsætninger", explanation: "En relativsætning med ekstra information, som kan fjernes uden at ændre hovedbudskabet, står mellem kommaer.", example: "Bogen, som ligger på bordet, er min." },
  { title: "Komma før men", explanation: "Komma før men er altid en sikker løsning. Andre regler kan gøre kommaet nødvendigt.", example: "Hun var træt, men hun fortsatte." },
  { title: "Direkte tale", explanation: "Adskil replikken fra den del, der fortæller, hvem der taler.", example: "“Jeg kommer nu,” sagde han." },
  { title: "Mellem helsætninger", explanation: "Sæt komma mellem helsætninger, især når de forbindes med og, eller, men, for eller så.", example: "Jeg læser opgaven, og du skriver svaret." },
  { title: "Helsætninger med udeladte ord", explanation: "Komma kan markere grænsen, når grundled eller udsagnsled gentages eller er underforstået.", example: "Nora valgte den blå, og Emil den grønne." },
  { title: "Bydemåde", explanation: "Sætninger i bydemåde fungerer som helsætninger med et underforstået grundled. Meget tæt forbundne bydeformer kan stå uden komma.", example: "Læs teksten, og svar på spørgsmålene." },
  { title: "Find en ledsætning", explanation: "Brug ikke-prøven. Kan ikke stå mellem grundled og udsagnsled, er der typisk tale om en ledsætning.", example: "Når hun ikke kommer, begynder vi." },
  { title: "Sæt slutkomma", explanation: "Sæt som hovedregel komma efter en ledsætning, når helsætningen fortsætter.", example: "Hvis det regner, tager vi bussen." },
  { title: "Vælg startkomma", explanation: "Du kan vælge komma før ledsætninger eller lade være. Brug samme valg gennem hele teksten.", example: "Jeg ved(,) at du kommer." },
  { title: "Sideordnede ledsætninger", explanation: "Sæt komma mellem ledsætninger, der er sideordnede og har samme funktion i helsætningen.", example: "Hun fandt stedet, hvor vi mødtes, og hvor vi spiste." },
  { title: "Selvstændige ledsætninger", explanation: "En parentetisk ledsætning, der blot tilføjer ekstra information, skal afgrænses med komma.", example: "Min cykel, som er helt ny, står udenfor." },
  { title: "Flyttet startkomma", explanation: "Nogle småord hører så tæt sammen med ledsætningen, at startkommaet placeres før hele forbindelsen.", example: "Han gik stille, uden at nogen hørte det." },
];

const CLAUSE_MARKERS = ["fordi", "hvis", "når", "selvom", "at", "som", "der", "hvor", "hvordan", "hvem", "hvorfor"];
const COMMA_RULES_EN: CommaRule[] = [
  { title: "Lists", explanation: "Use commas to separate three or more items in a list.", example: "We bought apples, pears and bananas." },
  { title: "Independent clauses", explanation: "Use a comma before a coordinating conjunction when it joins two complete clauses.", example: "I read the task, and you write the answer." },
  { title: "Introductory phrases", explanation: "Use a comma after an introductory word, phrase or clause.", example: "After lunch, we continued working." },
  { title: "Extra information", explanation: "Set off non-essential information with commas.", example: "The book, which is on the table, is mine." },
  { title: "Direct address", explanation: "Use a comma when speaking directly to someone.", example: "Freya, could you help me?" },
  { title: "Direct speech", explanation: "Use a comma to separate quoted speech from the reporting clause.", example: "‘I am coming now,’ he said." },
  { title: "Contrasts", explanation: "A comma can separate a clear contrast in a sentence.", example: "She was tired, but she continued." },
  { title: "Dates and places", explanation: "Use commas between parts of dates, places and addresses when needed.", example: "Copenhagen, Denmark, is the destination." },
];

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
