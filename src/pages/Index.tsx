import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  Play,
  Check,
  X,
  Sparkles,
  Heart,
} from "lucide-react";
import { overskill, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MiniReader } from "@/components/landing/MiniReader";
import { FeatureDemos } from "@/components/landing/FeatureDemos";
import { PRICING } from "@/lib/billing";

/**
 * ReliefRead landing page — ALWAYS public. A vertical story arc built to make a
 * reader (or a judge) feel something in the first five seconds: an honest
 * headline, then a LIVE mini-reader they can touch. Warm cream + sage, no red,
 * no pity, no stock photos of sad children.
 */

const OLD_TOOLS = [
  "Robotic, 2005-era text-to-speech voices",
  "Rigid, clinical interfaces",
  "Hundreds of dollars every year",
  "Often locked behind a formal diagnosis",
];

const RELIEFREAD = [
  "Natural, human-like AI voices",
  "OpenDyslexic, Bionic Reading & tints built in",
  "A shame-free phonetic writing coach",
  "$7 a month, open to everyone",
];

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Already signed in → quietly continue to the reading space.
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Lightweight SEO / Open Graph for the landing page.
  useEffect(() => {
    document.title = "ReliefRead — Reading shouldn't feel like a battle";
    const desc =
      "The readability-first AI workspace for dyslexic and borderline readers. Natural audio, fonts and spacing tuned for your eyes, and a writing coach that never uses red ink.";
    setMeta("description", desc);
    setMeta("og:title", "ReliefRead — Reading shouldn't feel like a battle", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
  }, []);

  const goSignUp = () => overskill.auth.login("/dashboard");
  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-gradient-calm" aria-hidden="true" />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            data-app-icon
            className="grid h-11 w-11 place-items-center rounded-2xl bg-sage text-sage-foreground shadow-paper"
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">ReliefRead</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/pricing"
            className="hidden h-11 items-center rounded-full px-4 text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Pricing
          </Link>
          <Button
            variant="ghost"
            className="h-11 rounded-full px-5 text-foreground hover:bg-accent"
            onClick={() => overskill.auth.login("/dashboard")}
          >
            Log in
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        {/* ---------- HERO ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:pt-12">
          <div className="rr-settle">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-paper">
              <Heart className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
              Made for dyslexic &amp; borderline readers
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              Reading shouldn't feel like a battle.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              ReliefRead is the readability-first AI workspace for dyslexic and borderline readers.
              Natural human-like audio, fonts and spacing tuned for your eyes, and a writing coach
              that never uses red ink.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90"
                onClick={goSignUp}
              >
                Try ReliefRead free
                <ArrowRight className="ml-1 h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                onClick={scrollToDemo}
                className="h-12 rounded-full border border-border bg-card px-7 text-base font-medium text-foreground hover:bg-accent"
              >
                <Play className="mr-1 h-4 w-4 text-sage" aria-hidden="true" />
                See it in action
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No diagnosis required. No password to remember.
            </p>
          </div>

          {/* Live, interactive mini reader */}
          <div className="rr-fade-up">
            <MiniReader />
          </div>
        </section>

        {/* ---------- STORY ---------- */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="rr-fade-up rounded-3xl border border-border bg-card p-8 shadow-paper sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-sage">
              Built for those on the edge
            </p>
            <p className="mt-5 font-display text-xl leading-relaxed text-foreground sm:text-2xl">
              Thousands of students score just above the line for an official dyslexia diagnosis.
              They get no public support, no tools, no extra time — yet they fight with every page,
              every day.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              ReliefRead was built for one of them: the founder's daughter. She didn't need a
              diagnosis to deserve relief.
            </p>
          </div>
        </section>

        {/* ---------- COMPARISON STRIP ---------- */}
        <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-foreground">
            Why ReliefRead?
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-muted/50 p-7">
              <h3 className="font-display text-lg font-semibold text-muted-foreground">
                The old way
              </h3>
              <ul className="mt-5 space-y-3">
                {OLD_TOOLS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-muted-foreground">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border-2 border-sage bg-card p-7 shadow-paper">
              <h3 className="font-display text-lg font-semibold text-sage">ReliefRead</h3>
              <ul className="mt-5 space-y-3">
                {RELIEFREAD.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-foreground">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage text-sage-foreground">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- FEATURE TRIO (live demos) ---------- */}
        <section id="demo" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-16 sm:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Listen. See. Write.
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              Three ways ReliefRead meets you where you are — watch them move.
            </p>
          </div>
          <FeatureDemos />
        </section>

        {/* ---------- PRICING ---------- */}
        <section className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Simple, kind pricing
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              Start free forever. Upgrade when you're ready, step back anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-paper">
              <h3 className="font-display text-lg font-semibold text-foreground">Monthly</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                  {PRICING.monthly.price}
                </span>
                <span className="text-muted-foreground">{PRICING.monthly.cadence}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Flexible — cancel anytime.</p>
              <Button
                onClick={() => navigate("/pricing")}
                className="mt-6 h-12 w-full rounded-full border border-sage/40 bg-background text-base font-semibold text-foreground shadow-paper hover:bg-accent"
              >
                Choose monthly
              </Button>
            </div>
            <div className="relative flex flex-col rounded-3xl border-2 border-sage bg-card p-7 shadow-paper">
              <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-semibold text-sage-foreground shadow-paper">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {PRICING.annual.note}
              </span>
              <h3 className="font-display text-lg font-semibold text-foreground">Annual</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                  {PRICING.annual.price}
                </span>
                <span className="text-muted-foreground">{PRICING.annual.cadence}</span>
              </p>
              <p className="mt-2 text-sm text-sage">Best value — two months free.</p>
              <Button
                onClick={() => navigate("/pricing")}
                className="mt-6 h-12 w-full rounded-full bg-sage text-base font-semibold text-sage-foreground hover:bg-sage/90"
              >
                <Sparkles className="mr-1 h-5 w-5" aria-hidden="true" />
                Choose annual
              </Button>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Free forever includes 3 readings a month and the standard voice.
          </p>
        </section>

        {/* ---------- FINAL CTA BAND ---------- */}
        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-4xl rounded-[2rem] bg-sage px-6 py-14 text-center shadow-paper sm:px-12">
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-sage-foreground sm:text-4xl">
              Give someone you love an easier way to read.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-sage-foreground/90">
              It takes one minute to start, and it's free. No diagnosis, no pressure — just relief.
            </p>
            <Button
              onClick={goSignUp}
              className="mt-8 h-12 rounded-full bg-background px-8 text-base font-semibold text-foreground shadow-paper hover:bg-background/90"
            >
              Try ReliefRead free
              <ArrowRight className="ml-1 h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="relative z-10 border-t border-border/70 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 sm:px-8">
          <div className="flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5 text-sage" aria-hidden="true" />
            <span className="font-display font-semibold">ReliefRead</span>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <Link to="/privacy" className="rounded px-1 py-0.5 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              Privacy
            </Link>
            <Link to="/terms" className="rounded px-1 py-0.5 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              Terms
            </Link>
            <a
              href="mailto:hello@reliefread.com"
              className="rounded px-1 py-0.5 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Contact
            </a>
          </nav>
          <p className="text-sm text-muted-foreground">Proudly built in Denmark 🇩🇰</p>
        </div>
      </footer>
    </div>
  );
}
