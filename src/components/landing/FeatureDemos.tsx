import React, { useEffect, useRef, useState } from "react";
import { Headphones, Type, PenLine } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const LISTEN_WORDS = ["Ordene", "bliver", "markeret", "mens", "stemmen", "læser", "højt."];
const LISTEN_WORDS_EN = ["Words", "are", "highlighted", "as", "the", "voice", "reads."];
const READING_LOOKS = [
  { fontFamily: "'Lexend', sans-serif", letterSpacing: "normal", lineHeight: 1.7 },
  {
    fontFamily: "'OpenDyslexic', 'Lexend', sans-serif",
    letterSpacing: "0.03em",
    lineHeight: 2,
  },
];

/**
 * Three small, always-looping visual demos for the feature trio. All motion is
 * CSS/JS driven (no audio, no network) and every loop is paused for readers who
 * prefer reduced motion — the demos simply rest in a calm, legible state.
 */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** LISTEN — a soft yellow highlight that walks word by word, like the reader. */
function ListenDemo({ en }: { en: boolean }) {
  const reduced = usePrefersReducedMotion();
  const words = en ? LISTEN_WORDS_EN : LISTEN_WORDS;
  const [active, setActive] = useState(reduced ? words.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActive((a) => (a + 1) % words.length), 620);
    return () => clearInterval(id);
  }, [reduced, words.length]);

  return (
    <p className="text-base leading-relaxed text-foreground" aria-hidden="true">
      {words.map((w, i) => (
        <span
          key={i}
          className={`rounded px-0.5 transition-colors duration-200 ${
            i === active ? "bg-highlight text-highlight-foreground" : ""
          }`}
        >
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/** SEE — the same line eases between fonts + spacing that fit different eyes. */
function SeeDemo({ en }: { en: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % READING_LOOKS.length), 2200);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <p
      className="text-base text-foreground transition-all duration-700 ease-out"
      style={READING_LOOKS[step]}
      aria-hidden="true"
    >
      {en ? "Fonts, colours and spacing that suit your eyes." : "Skrift, farver og afstand, der passer til dine øjne."}
    </p>
  );
}

/** WRITE — a word that looks "wrong", then a gentle sage suggestion, never red. */
function WriteDemo({ en }: { en: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [fixed, setFixed] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setFixed((f) => !f), 2400);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <p className="text-base leading-relaxed text-foreground" aria-hidden="true">
      {en ? "I would " : "Jeg vil "}
      <span
        className={`rounded px-0.5 transition-all duration-500 ${
          fixed ? "text-sage font-medium" : "rr-misspelled"
        }`}
      >
        {en ? (fixed ? "like" : "liek") : (fixed ? "gerne" : "grene")}
      </span>{" "}
      {en ? " to write clearly." : " skrive tydeligt."}
    </p>
  );
}

export function FeatureDemos() {
  const { language } = useLanguage();
  const en = language === "en";
  const FEATURES = [
    { icon: Headphones, title: en ? "Read and understand" : "Læs og forstå", body: en ? "Hear words, sentences or the entire text read aloud while highlighting follows along and helps you focus." : "Få ord, sætninger eller hele teksten læst højt, mens markeringen følger med og hjælper dig med at holde fokus.", demo: <ListenDemo en={en} /> },
    { icon: Type, title: en ? "Adapt your reading" : "Tilpas din læsning", body: en ? "Choose font, spacing, highlighting and speed. Text is black in light themes and white in Night Mode." : "Vælg skrift, afstand, markering og tempo. Teksten er sort i lyse temaer og hvid i Night Mode.", demo: <SeeDemo en={en} /> },
    { icon: PenLine, title: en ? "Write with support" : "Skriv med støtte", body: en ? "Use speech to text, word suggestions, spelling, grammar, punctuation and read-aloud support in one writing process." : "Brug tale-til-tekst, ordforslag, stavning, grammatik, komma og oplæsning i den samme skriveproces.", demo: <WriteDemo en={en} /> },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-paper"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <f.icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{f.title}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{f.body}</p>
          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
            {f.demo}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FeatureDemos;
