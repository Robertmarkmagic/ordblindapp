import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Heart,
  Tag,
  Loader2,
  BookOpen,
} from "lucide-react";
import { overskill, useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { usePremium } from "@/hooks/usePremium";
import { redeemDemoCode, PRICING, TESTER_MODE } from "@/lib/billing";
import { usePageTitle } from "@/hooks/usePageTitle";

const MONTHLY_PLAN = import.meta.env.VITE_PLAN_PREMIUM_MONTHLY as string | undefined;
const ANNUAL_PLAN = import.meta.env.VITE_PLAN_PREMIUM_ANNUAL as string | undefined;

const PREMIUM_FEATURES = [
  "Unlimited reading sessions",
  "Natural AI voices",
  "The phonetic writing coach",
  "Unlimited share links",
  "Export your lookup history",
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel whenever you like, no questions and no dark patterns. You keep Premium until the period you paid for ends.",
  },
  {
    q: "Does it work in Danish and English?",
    a: "Both. Reading, listening, translation and the writing coach all understand English and Danish automatically.",
  },
  {
    q: "Do I need a diagnosis?",
    a: "Never. ReliefRead is for anyone who finds reading tiring — no diagnosis, no gatekeeping.",
  },
  {
    q: "Who is it built for?",
    a: "It's shaped with dyslexic students and borderline readers, so every choice is about calm and clarity — not features for their own sake.",
  },
  {
    q: "How do the AI voice minutes work?",
    a: "Premium includes 90 minutes of fresh AI narration per month. Replaying your saved audio is always free and never counts.",
  },
];

/**
 * Pricing — a calm invitation, not a wall. Two warm cards (annual gently
 * elevated with "2 months free"), an honest comparison banner, a discreet
 * "Have a code?" field, and a small reassuring FAQ. Public route.
 */
export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { premium } = usePremium();

  usePageTitle("Pricing");

  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutTitle, setCheckoutTitle] = useState("Go Premium");

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const checkoutConfigured = Boolean(MONTHLY_PLAN && ANNUAL_PLAN);

  const startCheckout = useCallback(
    (plan: string | undefined, title: string) => {
      if (!plan) {
        // Checkout not configured — steer the reader to the code field instead
        // of showing a broken checkout.
        toast("Have a code?", {
          description: "Enter your access code below to unlock Premium.",
        });
        document.getElementById("have-a-code")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setCheckoutTitle(title);
      setCheckoutPlan(plan);
    },
    []
  );

  const handleRedeem = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!user) {
      // Redeeming writes to the user's settings — sign in first, then return.
      overskill.auth.login("/pricing");
      return;
    }
    setRedeeming(true);
    try {
      const { ok } = await redeemDemoCode(trimmed);
      if (ok) {
        toast("Welcome to Premium 🌿", {
          description: "Unlimited reading, natural voices and the writing coach are open now.",
        });
        navigate("/dashboard");
      } else {
        toast("That code didn't work.", {
          description: "Check the spelling and try once more.",
        });
      }
    } finally {
      setRedeeming(false);
    }
  }, [code, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Soft calm glow at the top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-calm" aria-hidden="true" />

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-28 pt-8 sm:px-8">
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="mb-8 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        <div className="rr-settle mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-paper">
            <Heart className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
            Reading help without shame
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
            Simple, kind pricing.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Start free, forever. Upgrade whenever you're ready — and step back
            anytime. No pressure, no lock-in.
          </p>
        </div>

        {premium && (
          <div className="rr-fade-up mx-auto mt-8 max-w-md rounded-2xl border border-sage/30 bg-accent/60 p-4 text-center text-sm text-foreground shadow-paper">
            <Sparkles className="mr-1 inline h-4 w-4 text-sage" aria-hidden="true" />
            {TESTER_MODE
              ? "Tester access is active. Every premium feature is open while we improve ReliefRead together."
              : "You're already on Premium — thank you. Everything below is yours."}
          </div>
        )}

        {/* Two calm cards */}
        <section className="rr-settle mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Monthly */}
          <div className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-paper">
            <h2 className="font-display text-xl font-semibold text-foreground">Monthly</h2>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {PRICING.monthly.price}
              </span>
              <span className="text-muted-foreground">{PRICING.monthly.cadence}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Flexible — cancel anytime.</p>
            <ul className="mt-6 space-y-3">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => startCheckout(MONTHLY_PLAN, "Premium Monthly")}
              disabled={premium}
              className="mt-7 h-12 w-full rounded-full border border-sage/40 bg-background text-base font-semibold text-foreground shadow-paper hover:bg-accent disabled:opacity-60"
            >
              {premium ? "You're on Premium" : "Choose monthly"}
            </Button>
          </div>

          {/* Annual — gently elevated */}
          <div className="relative flex flex-col rounded-3xl border-2 border-sage bg-card p-7 shadow-paper">
            <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-semibold text-sage-foreground shadow-paper">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {PRICING.annual.note}
            </span>
            <h2 className="font-display text-xl font-semibold text-foreground">Annual</h2>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {PRICING.annual.price}
              </span>
              <span className="text-muted-foreground">{PRICING.annual.cadence}</span>
            </p>
            <p className="mt-2 text-sm text-sage">Best value — two months free.</p>
            <ul className="mt-6 space-y-3">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => startCheckout(ANNUAL_PLAN, "Premium Annual")}
              disabled={premium}
              className="mt-7 h-12 w-full rounded-full bg-sage text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90 disabled:opacity-60"
            >
              <Sparkles className="mr-1 h-5 w-5" aria-hidden="true" />
              {premium ? "You're on Premium" : "Choose annual"}
            </Button>
          </div>
        </section>

        {/* Honest comparison banner */}
        <section className="rr-settle mt-8 rounded-3xl border border-border bg-highlight/40 p-6 text-center shadow-paper sm:p-8">
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-foreground">
            Traditional dyslexia software costs <strong>hundreds per year</strong> and
            requires a diagnosis. ReliefRead is <strong>$7 a month</strong> for everyone.
          </p>
        </section>

        {/* Have a code? */}
        <section id="have-a-code" className="rr-settle mx-auto mt-8 max-w-md">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-paper">
            <label
              htmlFor="access-code"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Tag className="h-4 w-4 text-sage" aria-hidden="true" />
              Have a code?
            </label>
            <div className="mt-3 flex gap-2">
              <Input
                id="access-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                placeholder="Enter your access code"
                className="h-12 rounded-xl border-input bg-background text-base"
                autoComplete="off"
              />
              <Button
                onClick={handleRedeem}
                disabled={redeeming || !code.trim()}
                className="h-12 shrink-0 rounded-xl bg-sage px-5 text-base font-semibold text-sage-foreground hover:bg-sage/90 disabled:opacity-60"
              >
                {redeeming ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Apply"}
              </Button>
            </div>
            {TESTER_MODE ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Tester access is active. No payment details are collected during this phase.
              </p>
            ) : !checkoutConfigured && (
              <p className="mt-3 text-xs text-muted-foreground">
                Card checkout is being set up — a code unlocks Premium instantly in the meantime.
              </p>
            )}
          </div>
        </section>

        {/* Small FAQ */}
        <section className="rr-settle mx-auto mt-14 max-w-2xl">
          <h2 className="text-center font-display text-2xl font-semibold text-foreground">
            A few honest answers
          </h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-border bg-card p-5 shadow-paper">
                <h3 className="font-display text-base font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4 text-sage" aria-hidden="true" />
          Free forever includes 3 readings a month and the standard voice.
        </div>
      </main>

      {checkoutPlan && (
        <CheckoutDialog
          open={Boolean(checkoutPlan)}
          onOpenChange={(o) => !o && setCheckoutPlan(null)}
          planId={checkoutPlan}
          title={checkoutTitle}
          description="Secured checkout · cancel anytime"
          theme="light"
          destination="/dashboard"
        />
      )}
    </div>
  );
}
