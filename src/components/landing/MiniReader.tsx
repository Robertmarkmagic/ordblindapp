import React, { useMemo, useState } from "react";
import { Type, AlignLeft, Palette, Check } from "lucide-react";
import { bionicSplit } from "@/lib/reader-tokens";

/**
 * The hero's live, interactive mini-reader. This is the REAL product logic —
 * OpenDyslexic uses the same @font-face as the reader, Bionic uses the same
 * bionicSplit() the reader uses, and Soft Blue is the real tint swatch. Judges
 * will click these, so every toggle must transform the text flawlessly on both
 * mobile and desktop.
 *
 * The reading surface is a FIXED light surface (cream / soft-blue) that never
 * flips with dark mode — exactly like the real reader — so its text color is
 * an explicit dark slate to guarantee AA contrast regardless of app theme.
 */

const SAMPLE =
  "Reading is meant to open doors, not close them. When the words settle down and the letters stop dancing, a whole story can finally come through. Take a breath — this paragraph is yours to shape.";

const LEXEND = "'Lexend', ui-sans-serif, system-ui, sans-serif";
const OPEN_DYSLEXIC = "'OpenDyslexic', 'Lexend', ui-sans-serif, system-ui, sans-serif";
const CREAM = "#FDFBF7";
const SOFT_BLUE = "#EAF2F8";
const INK = "#1E293B";
const INK_BOLD = "#0F172A";

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none transition active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? "border-sage bg-sage text-sage-foreground shadow-paper"
          : "border-border bg-card text-foreground hover:bg-accent"
      }`}
    >
      <span aria-hidden="true">{active ? <Check className="h-4 w-4" /> : icon}</span>
      {label}
    </button>
  );
}

export function MiniReader() {
  const [dyslexic, setDyslexic] = useState(false);
  const [bionic, setBionic] = useState(false);
  const [softBlue, setSoftBlue] = useState(false);

  // Split into words + the whitespace between them so we can re-bold per word.
  const tokens = useMemo(() => SAMPLE.split(/(\s+)/), []);

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-paper sm:p-6">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Reading options">
        <Toggle
          active={dyslexic}
          onClick={() => setDyslexic((v) => !v)}
          icon={<Type className="h-4 w-4" />}
          label="OpenDyslexic"
        />
        <Toggle
          active={bionic}
          onClick={() => setBionic((v) => !v)}
          icon={<AlignLeft className="h-4 w-4" />}
          label="Bionic Reading"
        />
        <Toggle
          active={softBlue}
          onClick={() => setSoftBlue((v) => !v)}
          icon={<Palette className="h-4 w-4" />}
          label="Soft Blue"
        />
      </div>

      <div
        className="rounded-2xl border border-border p-5 transition-colors duration-300 sm:p-7"
        style={{ backgroundColor: softBlue ? SOFT_BLUE : CREAM }}
      >
        <p
          className="text-lg sm:text-xl"
          style={{
            fontFamily: dyslexic ? OPEN_DYSLEXIC : LEXEND,
            lineHeight: 1.9,
            letterSpacing: dyslexic ? "0.02em" : "normal",
            color: INK,
          }}
        >
          {tokens.map((token, i) => {
            if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
            if (!bionic) return <span key={i}>{token}</span>;
            const { bold, rest } = bionicSplit(token);
            return (
              <span key={i}>
                <b style={{ color: INK_BOLD, fontWeight: 700 }}>{bold}</b>
                {rest}
              </span>
            );
          })}
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Go ahead — tap the toggles. This is the real reader.
      </p>
    </div>
  );
}

export default MiniReader;
