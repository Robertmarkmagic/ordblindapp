import { Link } from "react-router-dom";
import { BookOpen, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function LoggedOut() {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-paper">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-primary">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">
          {language === "da" ? "Du er logget ud" : "You are signed out"}
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {language === "da" ? "Dine dokumenter og indstillinger er gemt sikkert på din profil." : "Your documents and settings are saved safely in your profile."}
        </p>
        <Link to="/login" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-sage px-7 font-semibold text-sage-foreground hover:bg-sage/90">
          {language === "da" ? "Log ind igen" : "Sign in again"}
        </Link>
        <Link to="/" className="mt-4 flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {language === "da" ? "Til forsiden" : "Back to the front page"}
        </Link>
      </section>
    </div>
  );
}
