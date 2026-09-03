import React, { useEffect, useRef, useState } from "react";
import { Headphones, Type, PenLine } from "lucide-react";

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
function ListenDemo() {
  const words = ["The", "words", "light", "up", "as", "the", "voice", "reads."];
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(reduced ? words.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActive((a) => (a + 1) % words.length), 620);
    return () => clearInterval(id);
  }, [reduced]);

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
function SeeDemo() {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const looks = [
    { fontFamily: "'Lexend', sans-serif", letterSpacing: "normal", lineHeight: 1.7 },
    {
      fontFamily: "'OpenDyslexic', 'Lexend', sans-serif",
      letterSpacing: "0.03em",
      lineHeight: 2,
    },
  ];

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % looks.length), 2200);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <p
      className="text-base text-foreground transition-all duration-700 ease-out"
      style={looks[step]}
      aria-hidden="true"
    >
      Fonts and spacing that fit your eyes.
    </p>
  );
}

/** WRITE — a word that looks "wrong", then a gentle sage suggestion, never red. */
function WriteDemo() {
  const reduced = usePrefersReducedMotion();
  const [fixed, setFixed] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setFixed((f) => !f), 2400);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <p className="text-base leading-relaxed text-foreground" aria-hidden="true">
      I want to{" "}
      <span
        className={`rounded px-0.5 transition-all duration-500 ${
          fixed ? "text-sage font-medium" : "rr-misspelled"
        }`}
      >
        {fixed ? "beautiful" : "beutifull"}
      </span>{" "}
      write.
    </p>
  );
}

const FEATURES = [
  {
    icon: Headphones,
    title: "Listen",
    body: "Natural, human-like narration with the highlight following every word, so your ears and eyes read together.",
    demo: <ListenDemo />,
  },
  {
    icon: Type,
    title: "See",
    body: "OpenDyslexic, Bionic Reading, tints and spacing — tuned until the page finally feels calm.",
    demo: <SeeDemo />,
  },
  {
    icon: PenLine,
    title: "Write",
    body: "A phonetic writing coach that offers gentle green suggestions you can hear. Never a red mark, never shame.",
    demo: <WriteDemo />,
  },
];

export function FeatureDemos() {
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
