import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "da" | "en";

const STORAGE_KEY = "reliefread-language";

type Dictionary = Record<string, string>;

const da: Dictionary = {
  "language.danish": "Dansk",
  "language.english": "Engelsk",
  "header.home": "ReliefRead startside",
  "header.tagline": "Dit læserum",
  "header.account": "Kontomenu",
  "header.signedIn": "Logget ind",
  "header.settings": "Læseindstillinger",
  "header.signOut": "Log ud",
  "nav.pricing": "Priser",
  "nav.login": "Log ind",
  "nav.privacy": "Privatliv",
  "nav.terms": "Vilkår",
  "nav.contact": "Kontakt",
  "landing.badge": "Skabt til ordblinde og læsere i gråzonen",
  "landing.title": "Læsning skal ikke føles som en kamp.",
  "landing.intro": "ReliefRead er et AI-læserum med fokus på læsbarhed for ordblinde og læsere i gråzonen. Naturlig oplæsning, skrifttyper og afstand tilpasset dine øjne samt en skrivehjælper, der aldrig bruger rød skrift.",
  "landing.tryFree": "Prøv ReliefRead gratis",
  "landing.demo": "Se det i brug",
  "landing.noDiagnosis": "Ingen diagnose nødvendig. Ingen adgangskode at huske.",
  "landing.edgeLabel": "Skabt til dem i gråzonen",
  "landing.edgeStory": "Tusindvis af elever ligger lige over grænsen for en officiel ordblindediagnose. De får ingen offentlig støtte, ingen værktøjer og ingen ekstra tid. Alligevel kæmper de med hver eneste side hver dag.",
  "landing.daughter": "ReliefRead blev skabt til en af dem: stifterens datter. Hun behøvede ikke en diagnose for at fortjene hjælp.",
  "landing.why": "Hvorfor ReliefRead?",
  "landing.oldWay": "Den gamle måde",
  "landing.listenSeeWrite": "Lyt. Se. Skriv.",
  "landing.threeWays": "Tre måder ReliefRead møder dig, hvor du er. Se dem i bevægelse.",
  "landing.pricingTitle": "Enkle og venlige priser",
  "landing.pricingIntro": "Start gratis. Opgrader, når du er klar, og gå tilbage når som helst.",
  "landing.monthly": "Månedligt",
  "landing.annual": "Årligt",
  "landing.flexible": "Fleksibelt. Opsig når som helst.",
  "landing.bestValue": "Bedste værdi. To måneder gratis.",
  "landing.chooseMonthly": "Vælg månedligt",
  "landing.chooseAnnual": "Vælg årligt",
  "landing.freeIncludes": "Gratisversionen indeholder 3 læsninger om måneden og standardstemmen.",
  "landing.finalTitle": "Giv en, du holder af, en lettere måde at læse på.",
  "landing.finalText": "Det tager ét minut at komme i gang, og det er gratis. Ingen diagnose, intet pres. Bare lettelse.",
  "landing.denmark": "Stolt udviklet i Danmark 🇩🇰",
  "landing.old1": "Robotagtige oplæsningsstemmer fra 00'erne",
  "landing.old2": "Stive og kliniske brugerflader",
  "landing.old3": "Tusindvis af kroner hvert år",
  "landing.old4": "Ofte låst bag en formel diagnose",
  "landing.new1": "Naturlige og menneskelignende AI-stemmer",
  "landing.new2": "OpenDyslexic, Bionic Reading og farvetoner indbygget",
  "landing.new3": "En tryg fonetisk skrivehjælper",
  "landing.new4": "Åben for alle til en lav månedlig pris",
  "dashboard.title": "Mit læserum",
  "dashboard.welcome": "Velkommen tilbage. Lad os gøre læsning lettere i dag.",
  "dashboard.welcomeName": "Velkommen tilbage, {name}. Lad os gøre læsning lettere i dag.",
  "dashboard.new": "Ny læsning",
  "dashboard.newAria": "Start en ny læsning",
  "dashboard.retry": "Prøv igen",
  "dashboard.error": "Vi kunne ikke hente dine tekster lige nu. Tag en rolig pause, og prøv igen.",
  "dashboard.saved": "Dine gemte tekster",
  "dashboard.emptyTitle": "Her er tomt endnu",
  "dashboard.emptyText": "Indsæt din første tekst, så gør vi den lettere at læse.",
  "new.title": "Ny læsning",
  "new.back": "Tilbage til mit læserum",
  "new.intro": "Indsæt en tekst eller upload en fil. Vi gør den lettere at læse og læser den højt.",
  "new.remaining": "{remaining} af {total} gratis læsninger tilbage denne måned.",
  "new.limitTitle": "Du har brugt dine 3 gratis tekster denne måned",
  "new.limitText": "Opgrader til ubegrænset læsning, eller kom tilbage den 1. Dine tekster og gemte lydfiler venter på dig.",
  "new.seePremium": "Se Premium",
  "new.reset": "Dine gratis læsninger nulstilles {date}.",
  "new.saveError": "Vi kunne ikke gemme teksten lige nu. Din tekst er stadig her. Prøv igen.",
};

const dictionaries: Record<AppLanguage, Dictionary> = { da, en: {} };

function initialLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "da" || saved === "en") return saved;
  return window.navigator.language.toLowerCase().startsWith("da") ? "da" : "en";
}

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, english: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, english: string, values: Record<string, string | number> = {}) => {
      const template = dictionaries[language][key] ?? english;
      return Object.entries(values).reduce(
        (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
        template
      );
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
