import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronRight, CircleHelp } from "lucide-react";

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

export function CommaGuide({ sentence }: { sentence: string }) {
  const [open, setOpen] = useState(false);
  const [activeRule, setActiveRule] = useState(0);
  const [startComma, setStartComma] = useState<"with" | "without">("with");

  const liveHint = useMemo(() => {
    const lower = sentence.toLocaleLowerCase("da-DK");
    if (/\bmen\b/.test(lower) && !/,\s*men\b/.test(lower)) return "Jeg fandt ‘men’. Det er en god og sikker løsning at sætte komma foran ‘men’.";
    const marker = CLAUSE_MARKERS.find((word) => new RegExp(`\\b${word}\\b`, "u").test(lower));
    if (marker) return `Jeg fandt ‘${marker}’. Det kan indlede en ledsætning. Se efter grundled og udsagnsled, og husk slutkommaet, hvis helsætningen fortsætter.`;
    if (/\bog\b/.test(lower)) return "Jeg fandt ‘og’. Undersøg, om der er et grundled og et udsagnsled på begge sider. Hvis ja, skal der normalt komma.";
    return "Skriv en længere sætning med for eksempel ‘fordi’, ‘men’ eller ‘når’, så hjælper ReliefRead med at finde en mulig kommagrænse.";
  }, [sentence]);

  return (
    <div className="rr-comma-guide">
      <button type="button" className="rr-comma-toggle" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span><BookOpenCheck aria-hidden="true" /><b>De danske kommaregler</b><small>20 korte forklaringer med eksempler</small></span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="rr-comma-content">
          <div className="rr-comma-intro">
            <div>
              <b>Vælg din kommastil</b>
              <p>Startkomma er valgfrit. ReliefRead hjælper dig med at bruge dit valg konsekvent.</p>
            </div>
            <div role="group" aria-label="Vælg kommastil">
              <button type="button" aria-pressed={startComma === "with"} onClick={() => setStartComma("with")}>Med startkomma</button>
              <button type="button" aria-pressed={startComma === "without"} onClick={() => setStartComma("without")}>Uden startkomma</button>
            </div>
          </div>
          <div className="rr-comma-live-hint"><CircleHelp aria-hidden="true" /><span><b>Hjælp til din sætning</b>{liveHint}</span></div>
          <div className="rr-comma-browser">
            <div className="rr-comma-rule-list" aria-label="Kommaregler">
              {COMMA_RULES.map((rule, index) => (
                <button key={rule.title} type="button" aria-pressed={activeRule === index} onClick={() => setActiveRule(index)}>
                  <span>{index + 1}</span>{rule.title}<ChevronRight aria-hidden="true" />
                </button>
              ))}
            </div>
            <article className="rr-comma-rule-detail" aria-live="polite">
              <span>Regel {activeRule + 1} af {COMMA_RULES.length}</span>
              <h4>{COMMA_RULES[activeRule].title}</h4>
              <p>{COMMA_RULES[activeRule].explanation}</p>
              <div><b>Eksempel</b><q>{COMMA_RULES[activeRule].example}</q></div>
            </article>
          </div>
          <a href="https://dsn.dk/hjaelp-til-dansk/kommaoevelser/komma-det-korte-overblik/" target="_blank" rel="noreferrer">Læs Dansk Sprognævns officielle overblik</a>
        </div>
      )}
    </div>
  );
}
