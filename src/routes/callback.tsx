import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default function CallbackPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const destination = safeReturnPath(sessionStorage.getItem("reliefread_post_login_redirect"));

    const finish = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) {
        setError(language === "da" ? "Loginlinket kunne ikke godkendes. Bed om et nyt link." : "The sign-in link could not be verified. Please request a new link.");
        return;
      }
      if (data.session) {
        sessionStorage.removeItem("reliefread_post_login_redirect");
        navigate(destination, { replace: true });
      }
    };

    void finish();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void finish();
    });

    const timeout = window.setTimeout(() => {
      if (active) {
        setError(language === "da" ? "Loginlinket er udløbet eller allerede brugt." : "The sign-in link has expired or has already been used.");
      }
    }, 10000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [language, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-sage text-sage-foreground shadow-paper">
          <BookOpen className="h-7 w-7" aria-hidden="true" />
        </span>
        {error ? (
          <>
            <h1 className="mt-6 font-display text-2xl font-semibold">{language === "da" ? "Linket kunne ikke bruges" : "The link could not be used"}</h1>
            <p role="alert" className="mt-3 text-muted-foreground">{error}</p>
            <button onClick={() => navigate("/login", { replace: true })} className="mt-6 min-h-11 rounded-full bg-sage px-6 font-semibold text-sage-foreground">
              {language === "da" ? "Få et nyt loginlink" : "Get a new sign-in link"}
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mt-7 h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            <p className="mt-4 text-lg text-muted-foreground">{language === "da" ? "Åbner din ReliefRead-profil..." : "Opening your ReliefRead profile..."}</p>
          </>
        )}
      </div>
    </div>
  );
}
