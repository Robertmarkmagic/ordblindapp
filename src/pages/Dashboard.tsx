import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, RefreshCw } from "lucide-react";
import { overskill, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ReliefHeader } from "@/components/ReliefHeader";
import { DocumentCard, type DocumentRecord } from "@/components/DocumentCard";
import { DocumentGridSkeleton } from "@/components/Skeletons";
import { SoftNotice } from "@/components/SoftNotice";
import { firstNameFrom } from "@/lib/text-utils";
import { listMyShareLinks } from "@/lib/share";
import { DemoSeedCard } from "@/components/DemoSeedCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLanguage } from "@/lib/i18n";

/**
 * My Reading Space — the calm home for a signed-in reader.
 * All four states are designed: loading (skeletons), error (amber notice),
 * empty (warm placeholder), and populated (paper cards).
 */
export default function Dashboard() {
  // Auth guard: prevents a 401 flash when the OAuth token is still settling.
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedDocIds, setSharedDocIds] = useState<Set<string>>(new Set());

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await overskill.entities.document.list("-created_at");
      setDocs(rows || []);
      // Which documents have an active public share link? (best-effort — a
      // failed badge lookup must never break the reading list).
      if (user?.id) {
        try {
          const links = await listMyShareLinks(user.id);
          const ownedIds = new Set((rows || []).map((d: DocumentRecord) => d.id));
          setSharedDocIds(new Set(links.map((l) => l.document_id).filter((id) => ownedIds.has(id))));
        } catch {
          setSharedDocIds(new Set());
        }
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(t("dashboard.error", "We couldn't load your readings just now. Take a breath and try again."));
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadDocuments();
  }, [authLoading, user, loadDocuments]);

  const firstName = firstNameFrom(user?.name, "");

  usePageTitle(t("dashboard.title", "My Reading Space"));

  return (
    <div className="min-h-screen bg-background">
      <ReliefHeader />

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-8 sm:px-8">
        {/* Greeting + primary action */}
        <div className="rr-fade-up flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("dashboard.title", "My Reading Space")}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {firstName
                ? t("dashboard.welcomeName", `Welcome back, ${firstName}. Let's make reading easy today.`, { name: firstName })
                : t("dashboard.welcome", "Welcome back. Let's make reading easy today.")}
            </p>
          </div>
          <Button
            className="h-12 rounded-full bg-sage px-6 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90"
            onClick={() => navigate("/new")}
            aria-label={t("dashboard.newAria", "Start a new reading session")}
          >
            <Plus className="mr-1 h-5 w-5" aria-hidden="true" />
            {t("dashboard.new", "New Reading Session")}
          </Button>
        </div>

        <div className="mt-10">
          <DemoSeedCard onSeeded={loadDocuments} />

          {/* Error state — soft amber, warm, retryable. Never red. */}
          {error && !loading && (
            <SoftNotice className="mb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  className="h-11 shrink-0 rounded-full border-amber/50 bg-transparent px-4 text-foreground hover:bg-amber/10"
                  onClick={loadDocuments}
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("dashboard.retry", "Try again")}
                </Button>
              </div>
            </SoftNotice>
          )}

          {/* Loading state — skeletons, not spinners. */}
          {loading ? (
            <DocumentGridSkeleton count={4} />
          ) : docs.length === 0 && !error ? (
            /* Empty state — warmth, not emptiness. */
            <EmptyState onStart={() => navigate("/new")} />
          ) : docs.length > 0 ? (
            <section aria-label={t("dashboard.saved", "Your saved readings")} className="rr-settle grid grid-cols-1 gap-5 sm:grid-cols-2">
              {docs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} shared={sharedDocIds.has(doc.id)} />
              ))}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="rr-fade-up mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-8 py-14 text-center shadow-paper">
      {/* Gentle illustration-style placeholder */}
      <div className="relative grid h-28 w-28 place-items-center" aria-hidden="true">
        <div className="absolute inset-0 rounded-full bg-accent" />
        <div className="absolute inset-3 rounded-full bg-highlight/50" />
        <BookOpen className="relative h-12 w-12 text-sage" />
      </div>
      <h2 className="mt-7 font-display text-2xl font-semibold text-foreground">
        {t("dashboard.emptyTitle", "Nothing here yet")}
      </h2>
      <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
        {t("dashboard.emptyText", "Paste your first text and let's make it easy to read.")}
      </p>
      <Button
        className="mt-7 h-12 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90"
        onClick={onStart}
      >
        <Plus className="mr-1 h-5 w-5" aria-hidden="true" />
        {t("dashboard.new", "New Reading Session")}
      </Button>
    </div>
  );
}
