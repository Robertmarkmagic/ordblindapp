import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BookOpen,
  Play,
  Pause,
  Square,
  RotateCcw,
  Gauge,
  Type,
  Palette,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { SoftNotice } from "@/components/SoftNotice";
import {
  fontFamilyFor,
  tintColorFor,
  FONT_OPTIONS,
  TINT_OPTIONS,
  type FontChoice,
  type TintChoice,
} from "@/lib/reading-settings";
import { buildReaderModel, detectLanguage } from "@/lib/reader-tokens";
import { useReadAloud } from "@/hooks/useReadAloud";
import {
  fetchPublicShare,
  parseSnapshot,
  type ShareSnapshot,
} from "@/lib/share";
import { usePageTitle } from "@/hooks/usePageTitle";

const SIZE_STEPS = [16, 18, 20, 24, 28] as const;
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

/**
 * PublicRead — the anonymous shared reading page (reliefread.com/r/{slug}).
 * No login. The recipient lands in the sharer's exact formatting, can adjust
 * everything locally, and can listen along with the standard voice. A slim,
 * dismissible banner turns every share into a demo of ReliefRead.
 *
 * SAFETY: content comes ONLY from /api/share-view (presentation fields — never
 * user data). A revoked/missing slug yields a calm "no longer available" page.
 */
export default function PublicRead() {
  const { slug } = useParams<{ slug: string }>();

  const [status, setStatus] = useState<"loading" | "ok" | "gone" | "error">("loading");
  const [title, setTitle] = useState("");
  const [contentRaw, setContentRaw] = useState("");
  const [language, setLanguage] = useState("");

  // Local, non-persisted reading controls — start from the sharer's snapshot.
  const [font, setFont] = useState<FontChoice>("lexend");
  const [tint, setTint] = useState<TintChoice>("cream");
  const [bionic, setBionic] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<number>(1.7);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [wordSpacing, setWordSpacing] = useState<number>(0);

  const [bannerOpen, setBannerOpen] = useState(true);

  usePageTitle(status === "ok" && title ? title : "Shared reading");

  useEffect(() => {
    if (!slug) {
      setStatus("gone");
      return;
    }
    let active = true;
    setStatus("loading");
    fetchPublicShare(slug)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setStatus("gone");
          return;
        }
        setTitle(data.title || "Shared reading");
        setContentRaw(data.content_raw || "");
        setLanguage(data.language || "");
        const snap: ShareSnapshot = parseSnapshot(data.settings_json);
        setFont(snap.font);
        setTint(snap.tint);
        setBionic(snap.bionic);
        setFontSize(snap.fontSize);
        setLineHeight(snap.lineHeight);
        setLetterSpacing(snap.letterSpacing);
        setWordSpacing(snap.wordSpacing);
        setStatus("ok");
      })
      .catch((err) => {
        if (!active) return;
        console.error("[publicRead] fetch failed:", err);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const model = useMemo(() => buildReaderModel(contentRaw), [contentRaw]);
  const lang = useMemo<"en" | "da">(() => {
    if (language === "en" || language === "da") return language;
    return detectLanguage(contentRaw);
  }, [language, contentRaw]);

  // Standard (free browser) voice only — works for anonymous visitors, no credits.
  const {
    status: audioStatus,
    currentWordIndex,
    speed,
    setSpeed,
    toggle,
    stop,
    skipBack,
    seekToWord,
  } = useReadAloud({
    documentId: slug || "",
    model,
    lang,
    hdRequested: false,
    onFallback: () => {},
  });

  const following = audioStatus === "playing" || audioStatus === "paused";
  const isPlaying = audioStatus === "playing";
  const fontFamily = fontFamilyFor(font);
  const tintColor = tintColorFor(tint);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-3xl px-5 pt-10 sm:px-8">
          <div className="rr-skeleton mb-4 h-8 w-2/3 rounded-lg" />
          <div className="space-y-3 rounded-3xl border border-border p-8 shadow-paper">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rr-skeleton h-4 w-full rounded" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── Revoked / missing — calm, still a demo ──────────────────────────────────
  if (status === "gone") {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="mx-auto flex max-w-lg flex-col items-center px-5 pt-20 text-center sm:px-8">
          <div className="relative grid h-24 w-24 place-items-center" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-accent" />
            <BookOpen className="relative h-11 w-11 text-sage" />
          </div>
          <h1 className="mt-7 font-display text-2xl font-semibold text-foreground">
            This link is no longer available
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The reading may have been unshared. But you can make any text this
            easy to read yourself — it's free to start.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex h-12 items-center gap-1.5 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper transition hover:bg-sage/90"
          >
            Try ReliefRead
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </main>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-lg px-5 pt-16 sm:px-8">
          <SoftNotice>
            We couldn't open this reading just now. Please refresh the page in a
            moment.
          </SoftNotice>
        </main>
      </div>
    );
  }

  // ── The shared reading ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader
        adjust={
          <AdjustPanel
            font={font}
            setFont={setFont}
            tint={tint}
            setTint={setTint}
            bionic={bionic}
            setBionic={setBionic}
            fontSize={fontSize}
            setFontSize={setFontSize}
          />
        }
      />

      <main className="mx-auto max-w-3xl px-5 pb-44 pt-6 sm:px-8">
        <article className="rr-fade-up">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shared reading · {lang === "da" ? "Dansk" : "English"}
          </p>

          <div className="mt-8">
            {model.words.length > 0 ? (
              <ReaderContent
                model={model}
                currentWordIndex={following ? currentWordIndex : -1}
                following={following}
                bionic={bionic}
                fontFamily={fontFamily}
                tintColor={tintColor}
                onWordClick={seekToWord}
                fontSize={fontSize}
                lineHeight={lineHeight}
                letterSpacing={letterSpacing}
                wordSpacing={wordSpacing}
              />
            ) : (
              <div
                className="rounded-3xl border border-border p-8 text-lg italic opacity-70 shadow-paper"
                style={{ backgroundColor: tintColor, color: "#1E293B" }}
              >
                This reading is empty.
              </div>
            )}
          </div>
        </article>
      </main>

      {/* Fixed bottom region: dismissible ReliefRead banner + audio controls */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        {bannerOpen && (
          <div className="border-t border-sage/25 bg-accent/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 sm:px-6">
              <BookOpen className="h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
              <p className="flex-1 text-sm text-foreground">
                Formatted with ReliefRead.{" "}
                <Link to="/" className="font-medium text-sage underline-offset-2 hover:underline">
                  Make any text this easy to read.
                </Link>
              </p>
              <button
                onClick={() => setBannerOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {model.words.length > 0 && (
          <div className="border-t border-border/70 bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full text-foreground hover:bg-accent"
                onClick={skipBack}
                aria-label="Skip back 10 seconds"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                className="h-12 w-12 shrink-0 rounded-full bg-sage text-sage-foreground shadow-paper hover:bg-sage/90"
                onClick={() => toggle()}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Play className="h-6 w-6" aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full text-foreground hover:bg-accent"
                onClick={stop}
                disabled={audioStatus === "idle"}
                aria-label="Stop"
              >
                <Square className="h-5 w-5" aria-hidden="true" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="ml-auto h-11 shrink-0 gap-1.5 rounded-full px-3 text-foreground hover:bg-accent"
                    aria-label={`Playback speed, currently ${speed} times`}
                  >
                    <Gauge className="h-4 w-4" aria-hidden="true" />
                    <span className="tabular-nums text-sm font-medium">{speed}×</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <DropdownMenuLabel>Reading speed</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                    {SPEEDS.map((s) => (
                      <DropdownMenuRadioItem key={s} value={String(s)} className="tabular-nums">
                        {s}×{s === 1 ? " (normal)" : ""}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Minimal, public top bar — brand + optional adjust control. No auth chrome. */
function PublicHeader({ adjust }: { adjust?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            data-app-icon
            className="grid h-9 w-9 place-items-center rounded-xl bg-sage text-sage-foreground shadow-paper"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">ReliefRead</span>
        </Link>
        {adjust}
      </div>
    </header>
  );
}

/** The recipient's local reading controls — font, tint, size, Bionic. */
function AdjustPanel({
  font,
  setFont,
  tint,
  setTint,
  bionic,
  setBionic,
  fontSize,
  setFontSize,
}: {
  font: FontChoice;
  setFont: (f: FontChoice) => void;
  tint: TintChoice;
  setTint: (t: TintChoice) => void;
  bionic: boolean;
  setBionic: (b: boolean) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-paper hover:bg-accent"
          aria-label="Adjust reading appearance"
        >
          <Type className="h-4 w-4 text-sage" aria-hidden="true" />
          Adjust
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-5">
        {/* Font */}
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-sage" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Reading font</span>
        </div>
        <div className="mt-2 grid gap-2">
          {FONT_OPTIONS.map((opt) => {
            const active = font === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFont(opt.value)}
                aria-pressed={active}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-sage bg-accent" : "border-border bg-background hover:border-sage/40"
                }`}
                style={{ fontFamily: opt.fontFamily }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Tint */}
        <div className="mt-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-sage" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Background</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TINT_OPTIONS.map((opt) => {
            const active = tint === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTint(opt.value)}
                aria-pressed={active}
                aria-label={opt.label}
                className={`grid h-10 w-10 place-items-center rounded-full border transition outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-sage ring-2 ring-sage/40" : "border-border"
                }`}
                style={{ backgroundColor: opt.swatch }}
                title={opt.label}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {/* Text size */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Text size</span>
          <span className="text-xs tabular-nums text-muted-foreground">{fontSize}px</span>
        </div>
        <div className="mt-2 flex gap-2">
          {SIZE_STEPS.map((s) => {
            const active = fontSize === s;
            return (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                aria-pressed={active}
                aria-label={`Text size ${s} pixels`}
                className={`h-11 flex-1 rounded-xl border text-center outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-sage bg-accent text-foreground" : "border-border bg-background text-muted-foreground hover:border-sage/40"
                }`}
                style={{ fontSize: `${Math.max(12, s - 4)}px` }}
              >
                A
              </button>
            );
          })}
        </div>

        {/* Bionic */}
        <button
          onClick={() => setBionic(!bionic)}
          aria-pressed={bionic}
          className={`mt-4 flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
            bionic ? "border-sage bg-accent" : "border-border bg-background hover:border-sage/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-sage" aria-hidden="true" />
            Bionic reading
          </span>
          <span
            className={`grid h-6 w-11 items-center rounded-full px-0.5 transition ${
              bionic ? "bg-sage" : "bg-muted"
            }`}
            aria-hidden="true"
          >
            <span
              className={`h-5 w-5 rounded-full bg-background transition-transform ${
                bionic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
