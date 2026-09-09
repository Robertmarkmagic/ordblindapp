import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { language, t } = useLanguage();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  usePageTitle(t("auth.loginTitle", "Log in to ReliefRead"));

  const returnTo = safeReturnPath(searchParams.get("redirect"));

  useEffect(() => {
    if (!loading && user) navigate(returnTo, { replace: true });
  }, [loading, navigate, returnTo, user]);

  const sendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || sending) return;

    if (!supabaseConfigured) {
      setError(t("auth.configError", "Login is not available just now. Please try again shortly."));
      return;
    }

    setSending(true);
    setError("");
    sessionStorage.setItem("reliefread_post_login_redirect", returnTo);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/callback`,
        data: { locale: language },
      },
    });

    setSending(false);
    if (authError) {
      setError(t("auth.sendError", "We could not send the login email. Check the address and try again."));
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sage text-sage-foreground shadow-paper">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold">ReliefRead</span>
        </Link>
        <LanguageSwitcher compact />
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-5 pb-20 pt-8 sm:px-8">
        <Link to="/" className="mb-5 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("trial.back", "Back to the front page")}
        </Link>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-paper sm:p-9">
          {sent ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-primary">
                <Check className="h-7 w-7" aria-hidden="true" />
              </span>
              <h1 className="mt-6 font-display text-3xl font-semibold">
                {t("auth.checkEmail", "Check your email")}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {language === "da"
                  ? `Vi har sendt et sikkert loginlink til ${email}. Tryk på linket, så åbner din egen ReliefRead-profil.`
                  : `We sent a secure sign-in link to ${email}. Use it to open your personal ReliefRead profile.`}
              </p>
              <Button variant="outline" onClick={() => setSent(false)} className="mt-7 h-12 rounded-full px-6">
                {t("auth.useOtherEmail", "Use another email")}
              </Button>
            </div>
          ) : (
            <>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary">
                <Mail className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="mt-6 font-display text-3xl font-semibold">
                {t("auth.loginTitle", "Log in to ReliefRead")}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {language === "da"
                  ? "Skriv din e-mail. Du får et sikkert loginlink og behøver ikke huske en adgangskode."
                  : "Enter your email. We will send a secure sign-in link, so there is no password to remember."}
              </p>

              <form onSubmit={sendLink} className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-base">{t("trial.email", "Email")}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("trial.emailPlaceholder", "you@example.com")}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-2xl bg-amber/10 p-4 text-sm leading-relaxed text-foreground">{error}</p>
                )}
                <Button type="submit" disabled={!email.trim() || sending} className="h-12 w-full rounded-full bg-sage text-base font-semibold text-sage-foreground hover:bg-sage/90">
                  {sending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Mail className="mr-2 h-5 w-5" aria-hidden="true" />}
                  {t("auth.sendLink", "Send me a login link")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {language === "da" ? "Ny bruger?" : "New here?"}{" "}
                <Link to="/trial" className="font-semibold text-primary underline-offset-4 hover:underline">
                  {t("trial.submit", "Join the free trial")}
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
