import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { overskill, useAuth } from "@/lib/auth";
import { ReliefHeader } from "@/components/ReliefHeader";
import { SoftNotice } from "@/components/SoftNotice";
import { NewSessionForm, type NewSessionSubmit } from "@/components/NewSessionForm";
import { UpgradeInvite } from "@/components/UpgradeInvite";
import { recordDocumentCreated, getMonthlyUsage } from "@/lib/usage";
import { usePremium } from "@/hooks/usePremium";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  canCreateDocument,
  documentsRemaining,
  nextResetLabel,
  FREE_MONTHLY_DOCUMENTS,
} from "@/lib/billing";
import { useLanguage } from "@/lib/i18n";

/**
 * New Reading Session — paste text OR upload a .txt/.pdf, auto-titled and
 * language-detected, then opens straight into the reader. Free readers get 3
 * fresh readings a month; hitting the limit shows a warm invitation (never a
 * wall) with "See Premium" and "come back on the 1st" given equal weight.
 */
export default function NewSession() {
  const { user, loading: authLoading } = useAuth();
  const { premium, loading: premiumLoading } = usePremium();
  const navigate = useNavigate();
  const { t } = useLanguage();

  usePageTitle(t("new.title", "New reading session"));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentsCreated, setDocumentsCreated] = useState(0);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    setUsageLoading(true);
    getMonthlyUsage()
      .then((u) => active && setDocumentsCreated(u.documentsCreated))
      .finally(() => active && setUsageLoading(false));
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const atLimit = !premium && !canCreateDocument({ plan: "free", documentsCreated });
  const remaining = documentsRemaining(documentsCreated);
  const gatesResolved = !premiumLoading && !usageLoading;

  const handleSubmit = async (data: NewSessionSubmit) => {
    if (authLoading || !user) return;
    if (atLimit) return; // defensive — the form isn't shown at the limit
    setSaving(true);
    setError(null);
    try {
      const doc = await overskill.entities.document.create({
        title: data.title,
        content_raw: data.content,
        language: data.language,
        listened: false,
      });
      await recordDocumentCreated();
      navigate(`/read/${doc.id}`);
    } catch (err) {
      console.error("Failed to create document:", err);
      setError(t("new.saveError", "We couldn't save that just now. Your text is still here. Try once more."));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ReliefHeader />

      <main className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:px-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={t("new.back", "Back to My Reading Space")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("new.back", "Back to my space")}
        </button>

        {gatesResolved && atLimit ? (
          <UpgradeInvite
            heading={t("new.limitTitle", "You've used your 3 free texts this month")}
            message={t("new.limitText", "Upgrade for unlimited reading, or come back on the 1st. Your readings and saved audio are waiting for you either way.")}
            primaryLabel={t("new.seePremium", "See Premium")}
            onPrimary={() => navigate("/pricing")}
            secondaryLabel={t("new.back", "Back to my space")}
            onSecondary={() => navigate("/dashboard")}
            footnote={t("new.reset", `Your free readings reset on ${nextResetLabel()}.`, { date: nextResetLabel() })}
          />
        ) : (
          <>
            <div className="rr-fade-up">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                {t("new.title", "New reading session")}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {t("new.intro", "Paste anything or upload a file. We'll make it easy to read and read it aloud.")}
              </p>
              {gatesResolved && !premium && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("new.remaining", `${remaining} of ${FREE_MONTHLY_DOCUMENTS} free readings left this month.`, { remaining, total: FREE_MONTHLY_DOCUMENTS })}
                </p>
              )}
            </div>

            <div className="rr-fade-up mt-8">
              {error && <SoftNotice className="mb-5">{error}</SoftNotice>}
              <NewSessionForm saving={saving} onSubmit={handleSubmit} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
