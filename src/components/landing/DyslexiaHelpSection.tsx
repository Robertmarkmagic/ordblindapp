import { useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, Heart, Headphones, Mic, PenLine, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

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

const AUDIENCES_EN: Record<Audience, { label: string; title: string; text: string; steps: readonly string[] }> = {
  parent: { label: "For parents", title: "Your child needs access to the content, not lower expectations.", text: "When reading and spelling take a great deal of energy, read-aloud support, speech to text and word suggestions can free up capacity for understanding, thinking and learning. Start with one tool, practise it together and let the child help decide what feels useful.", steps: ["Talk about what feels difficult", "Involve a teacher or reading specialist", "Practise the tool in calm situations", "Use the same tool across subjects"] },
  adult: { label: "For adults", title: "Dyslexia does not end when school does.", text: "ReliefRead can support you when you read an email, understand a letter, write a message or work with a document. You choose read-aloud support, dictation, word suggestions, grammar help and the display that suits your eyes.", steps: ["Have letters and documents read aloud", "Dictate emails and messages", "Get help with spelling and punctuation", "Adjust colours, text and reading speed"] },
  school: { label: "For schools and education", title: "Assistive tools work best when they become a natural part of learning.", text: "Reading and writing technology helps students participate more independently. Students need to learn the tools, receive digital materials and meet adults who make using support feel safe and normal in every subject.", steps: ["Provide materials in an accessible digital format", "Agree which tools the student will use", "Check whether the support actually helps", "Use assistive technology across relevant subjects"] },
};

export function DyslexiaHelpSection() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const en = language === "en";
  const tr = (da: string, english: string) => en ? english : da;
  const [audience, setAudience] = useState<Audience>("parent");
  const current = AUDIENCES[audience];
  const currentCopy = en ? AUDIENCES_EN[audience] : current;
  const CurrentIcon = current.icon;

  return (
    <div className="rr-dyslexia-section">
      <div className="rr-dyslexia-heading">
        <span>{tr("Ordblindhed og hjælpemidler", "Dyslexia and assistive tools")}</span>
        <h2>{tr("Ordene må gerne arbejde på din måde", "Let words work your way")}</h2>
        <p>
          {tr("Ordblindhed handler om vedvarende vanskeligheder med at forbinde bogstaver og sproglyde i læsning og stavning. Det siger ikke noget om intelligens, idéer eller evnen til at lære. Den rigtige støtte kan gøre vejen til indholdet kortere.", "Dyslexia involves persistent difficulty connecting letters and speech sounds when reading and spelling. It says nothing about intelligence, ideas or the ability to learn. The right support can make content easier to reach.")}
        </p>
      </div>

      <div className="rr-dyslexia-basics">
        <article><BookOpen aria-hidden="true" /><div><h3>{tr("Alle er forskellige", "Everyone is different")}</h3><p>{tr("Der findes ikke ét hjælpemiddel eller én indstilling, der passer til alle. Det bedste valg er det, personen faktisk kan og vil bruge.", "No single tool or setting works for everyone. The best choice is the one a person can and wants to use.")}</p></div></article>
        <article><Users aria-hidden="true" /><div><h3>{tr("Støtte skaber deltagelse", "Support enables participation")}</h3><p>{tr("Oplæsning og skrivestøtte kan mindske den tekniske kamp, så energien bruges på forståelse, faglighed og egne idéer.", "Reading and writing support can reduce the technical struggle, leaving more energy for understanding, learning and original ideas.")}</p></div></article>
        <article><Heart aria-hidden="true" /><div><h3>{tr("Tryghed før tempo", "Confidence before speed")}</h3><p>{tr("Hjælpemidlet skal læres i små skridt. Gentagelse og medbestemmelse gør det lettere at bruge støtten selvstændigt.", "Assistive tools are best learned in small steps. Repetition and choice make independent use easier.")}</p></div></article>
      </div>

      <div className="rr-dyslexia-audience-tabs" role="tablist" aria-label={tr("Information om ordblindhed", "Information about dyslexia")}>
        {(Object.entries(AUDIENCES) as Array<[Audience, typeof AUDIENCES[Audience]]>).map(([key, item]) => {
          const Icon = item.icon;
          return <button key={key} type="button" role="tab" aria-selected={audience === key} onClick={() => setAudience(key)}><Icon aria-hidden="true" />{en ? AUDIENCES_EN[key].label : item.label}</button>;
        })}
      </div>

      <div className="rr-dyslexia-audience" role="tabpanel">
        <div className="rr-dyslexia-audience-copy">
          <span><CurrentIcon aria-hidden="true" /></span>
          <h3>{currentCopy.title}</h3>
          <p>{currentCopy.text}</p>
        </div>
        <ol>
          {currentCopy.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
      </div>

      <div className="rr-dyslexia-reliefread">
        <div>
          <span>{tr("Sådan hjælper ReliefRead", "How ReliefRead helps")}</span>
          <h3>{tr("Læs, skriv og forstå med støtte samlet ét sted", "Read, write and understand with support in one place")}</h3>
        </div>
        <div className="rr-dyslexia-feature-grid">
          <span><Headphones aria-hidden="true" /><b>{tr("Oplæsning", "Read aloud")}</b><small>{tr("Følg teksten og tilpas tempoet", "Follow the text and adjust the speed")}</small></span>
          <span><Mic aria-hidden="true" /><b>{tr("Tale-til-tekst", "Speech to text")}</b><small>{tr("Indtal tanker direkte i skrivefeltet", "Dictate thoughts directly into the writing field")}</small></span>
          <span><PenLine aria-hidden="true" /><b>{tr("Skrivehjælp", "Writing support")}</b><small>{tr("Ordforslag, stavning og grammatik", "Word suggestions, spelling and grammar")}</small></span>
          <span><BookOpen aria-hidden="true" /><b>{tr("Dokumenthjælp", "Document support")}</b><small>{tr("PDF, ordbog og lettere forklaringer", "PDF, dictionary and simpler explanations")}</small></span>
        </div>
      </div>

      <div className="rr-dyslexia-test-note">
        <div>
          <b>{tr("Behøver man en ordblindetest for at bruge ReliefRead?", "Do you need a dyslexia assessment to use ReliefRead?")}</b>
          <p>{tr("Nej. ReliefRead kan prøves af alle med læse- eller skrivevanskeligheder. Offentlig støtte gennem skole eller uddannelse kan have andre dokumentationskrav. Tal med lærer, læsevejleder, PPR eller SPS om den konkrete situation.", "No. Anyone with reading or writing difficulties can try ReliefRead. Public support through a school or education provider may have separate documentation requirements. Speak to a teacher or specialist about your situation.")}</p>
        </div>
        <button type="button" onClick={() => navigate("/trial")}>{tr("Prøv ReliefRead gratis", "Try ReliefRead free")} <ArrowRight aria-hidden="true" /></button>
      </div>

      <div className="rr-dyslexia-sources">
        <span>{tr("Læs mere hos", "Read more from")}</span>
        <a href="https://emu.dk/ordblindhed-og-andre-laesevanskeligheder" target="_blank" rel="noreferrer">EMU</a>
        <a href="https://www.ordblindeforeningen.dk/om-ordblindhed/" target="_blank" rel="noreferrer">{tr("Ordblindeforeningen", "Danish Dyslexia Association")}</a>
        <a href="https://uvm.dk/grundskole/folkeskolen/laering-og-laeringsmiljoe/test-og-evalueringsredskaber/test-og-evalueringsredskaber-til-at-opspore-sprog-og-laesevanskeligheder/" target="_blank" rel="noreferrer">{tr("Børne- og Undervisningsministeriet", "Danish Ministry of Children and Education")}</a>
      </div>
    </div>
  );
}
