import { useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, Heart, Headphones, Mic, PenLine, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AUDIENCES = {
  parent: {
    label: "Til forældre",
    icon: Heart,
    title: "Dit barn har brug for adgang til indholdet. Ikke lavere forventninger.",
    text: "Når læsning og stavning kræver meget energi, kan oplæsning, tale-til-tekst og ordforslag frigive overskud til at forstå, tænke og lære. Start med én funktion, øv den sammen, og lad barnet være med til at vælge, hvad der føles hjælpsomt.",
    steps: ["Tal med barnet om, hvad der er svært", "Involver lærer eller læsevejleder", "Øv hjælpemidlet i rolige situationer", "Brug samme værktøj på tværs af fag"],
  },
  adult: {
    label: "Til voksne",
    icon: BriefcaseBusiness,
    title: "Ordblindhed stopper ikke efter skolen.",
    text: "ReliefRead kan støtte dig, når du læser en mail, forstår et brev, skriver en besked eller arbejder med et dokument. Du vælger selv oplæsning, diktat, ordforslag, grammatikhjælp og den visning, der passer til dine øjne.",
    steps: ["Få breve og dokumenter læst højt", "Indtal mails og beskeder", "Få hjælp til stavning og komma", "Tilpas farver, tekst og læsetempo"],
  },
  school: {
    label: "Til skole og uddannelse",
    icon: GraduationCap,
    title: "Hjælpemidler virker bedst, når de bliver en naturlig del af undervisningen.",
    text: "Læse- og skriveteknologi giver elever mulighed for at deltage mere selvstændigt. Det kræver, at eleven lærer funktionerne at kende, får digitale materialer og møder voksne, der gør brugen tryg og almindelig i alle fag.",
    steps: ["Giv materialer i et læsbart digitalt format", "Aftal hvilke funktioner eleven bruger", "Følg op på om støtten faktisk hjælper", "Brug LST i alle relevante fag"],
  },
} as const;

type Audience = keyof typeof AUDIENCES;

export function DyslexiaHelpSection() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<Audience>("parent");
  const current = AUDIENCES[audience];
  const CurrentIcon = current.icon;

  return (
    <div className="rr-dyslexia-section">
      <div className="rr-dyslexia-heading">
        <span>Ordblindhed og hjælpemidler</span>
        <h2>Ordene må gerne arbejde på din måde</h2>
        <p>
          Ordblindhed handler om vedvarende vanskeligheder med at forbinde bogstaver og sproglyde i læsning og stavning.
          Det siger ikke noget om intelligens, idéer eller evnen til at lære. Den rigtige støtte kan gøre vejen til indholdet kortere.
        </p>
      </div>

      <div className="rr-dyslexia-basics">
        <article><BookOpen aria-hidden="true" /><div><h3>Alle er forskellige</h3><p>Der findes ikke ét hjælpemiddel eller én indstilling, der passer til alle. Det bedste valg er det, personen faktisk kan og vil bruge.</p></div></article>
        <article><Users aria-hidden="true" /><div><h3>Støtte skaber deltagelse</h3><p>Oplæsning og skrivestøtte kan mindske den tekniske kamp, så energien bruges på forståelse, faglighed og egne idéer.</p></div></article>
        <article><Heart aria-hidden="true" /><div><h3>Tryghed før tempo</h3><p>Hjælpemidlet skal læres i små skridt. Gentagelse og medbestemmelse gør det lettere at bruge støtten selvstændigt.</p></div></article>
      </div>

      <div className="rr-dyslexia-audience-tabs" role="tablist" aria-label="Information om ordblindhed">
        {(Object.entries(AUDIENCES) as Array<[Audience, typeof AUDIENCES[Audience]]>).map(([key, item]) => {
          const Icon = item.icon;
          return <button key={key} type="button" role="tab" aria-selected={audience === key} onClick={() => setAudience(key)}><Icon aria-hidden="true" />{item.label}</button>;
        })}
      </div>

      <div className="rr-dyslexia-audience" role="tabpanel">
        <div className="rr-dyslexia-audience-copy">
          <span><CurrentIcon aria-hidden="true" /></span>
          <h3>{current.title}</h3>
          <p>{current.text}</p>
        </div>
        <ol>
          {current.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
      </div>

      <div className="rr-dyslexia-reliefread">
        <div>
          <span>Sådan hjælper ReliefRead</span>
          <h3>Læs, skriv og forstå med støtte samlet ét sted</h3>
        </div>
        <div className="rr-dyslexia-feature-grid">
          <span><Headphones aria-hidden="true" /><b>Oplæsning</b><small>Følg teksten og tilpas tempoet</small></span>
          <span><Mic aria-hidden="true" /><b>Tale-til-tekst</b><small>Indtal tanker direkte i skrivefeltet</small></span>
          <span><PenLine aria-hidden="true" /><b>Skrivehjælp</b><small>Ordforslag, stavning og grammatik</small></span>
          <span><BookOpen aria-hidden="true" /><b>Dokumenthjælp</b><small>PDF, ordbog og lettere forklaringer</small></span>
        </div>
      </div>

      <div className="rr-dyslexia-test-note">
        <div>
          <b>Behøver man en ordblindetest for at bruge ReliefRead?</b>
          <p>Nej. ReliefRead kan prøves af alle med læse- eller skrivevanskeligheder. Offentlig støtte gennem skole eller uddannelse kan have andre dokumentationskrav. Tal med lærer, læsevejleder, PPR eller SPS om den konkrete situation.</p>
        </div>
        <button type="button" onClick={() => navigate("/trial")}>Prøv ReliefRead gratis <ArrowRight aria-hidden="true" /></button>
      </div>

      <div className="rr-dyslexia-sources">
        <span>Læs mere hos</span>
        <a href="https://emu.dk/ordblindhed-og-andre-laesevanskeligheder" target="_blank" rel="noreferrer">EMU</a>
        <a href="https://www.ordblindeforeningen.dk/om-ordblindhed/" target="_blank" rel="noreferrer">Ordblindeforeningen</a>
        <a href="https://uvm.dk/grundskole/folkeskolen/laering-og-laeringsmiljoe/test-og-evalueringsredskaber/test-og-evalueringsredskaber-til-at-opspore-sprog-og-laesevanskeligheder/" target="_blank" rel="noreferrer">Børne- og Undervisningsministeriet</a>
      </div>
    </div>
  );
}
