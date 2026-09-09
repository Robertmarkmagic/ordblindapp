import { ArrowLeft, BookOpen, Check, Gift, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const da = language === "da";
  usePageTitle(da ? "Gratis prøveperiode" : "Free trial");

  const features = da
    ? ["Oplæsning og fokusvisning", "Skrivehjælp og diktat", "Egne dokumenter, noter og indstillinger", "Riley-hjælp i appen"]
    : ["Read aloud and focus view", "Writing support and dictation", "Your own documents, notes and settings", "Riley support in the app"];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-8">
        <button
          type="button"
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {da ? "Tilbage" : "Back"}
        </button>

        <section className="mt-8 rounded-[2rem] border border-border bg-card p-7 shadow-paper sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
            <Gift className="h-4 w-4" aria-hidden="true" />
            {da ? "Gratis testadgang" : "Free trial access"}
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground">
            {da ? "Prøv hele ReliefRead gratis" : "Try all of ReliefRead for free"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {da
              ? "Alle funktioner er åbne i testperioden. Du skal ikke bruge betalingskort, og du kan ændre dine valg senere."
              : "Every feature is open during the trial. No payment card is needed, and you can change your choices later."}
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4 text-foreground">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-sage" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>

          <Button asChild className="mt-8 h-12 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground hover:bg-sage/90">
            <Link to={user ? "/dashboard" : "/trial"}>
              <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
              {user ? (da ? "Åbn min profil" : "Open my profile") : (da ? "Tilmeld gratis" : "Join for free")}
            </Link>
          </Button>
        </section>

        <p className="mt-7 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4 text-sage" aria-hidden="true" />
          {da ? "Din tekst og dine indstillinger tilhører din egen konto." : "Your text and preferences belong to your own account."}
        </p>
      </main>
    </div>
  );
}
