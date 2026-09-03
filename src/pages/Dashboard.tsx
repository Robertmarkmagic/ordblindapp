import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, RefreshCw, PenLine, Camera, Brain, Files, NotebookText, Sparkles } from "lucide-react";
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
  const documentsRef = useRef<HTMLDivElement>(null);

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

  const openRiley = () => window.dispatchEvent(new Event("reliefread:open-riley"));
  const actionCards = [
    { key: "dashboard.read", english: "Read something", icon: <BookOpen className="h-6 w-6" />, sticker: "📖", onClick: () => navigate("/new") },
    { key: "dashboard.write", english: "Write something", icon: <PenLine className="h-6 w-6" />, sticker: "✍️", onClick: () => navigate("/new") },
    { key: "dashboard.scan", english: "Scan something", icon: <Camera className="h-6 w-6" />, sticker: "📸", onClick: () => navigate("/new") },
    { key: "dashboard.explain", english: "Explain something", icon: <Brain className="h-6 w-6" />, sticker: "🧠", onClick: openRiley },
    { key: "dashboard.documents", english: "My documents", icon: <Files className="h-6 w-6" />, sticker: "📚", onClick: () => documentsRef.current?.scrollIntoView({ behavior: "smooth" }) },
    { key: "dashboard.notes", english: "My notes", icon: <NotebookText className="h-6 w-6" />, sticker: "📝", onClick: () => documentsRef.current?.scrollIntoView({ behavior: "smooth" }) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ReliefHeader />

      <main className="mx-auto max-w-5xl px-5 pb-28 pt-8 sm:px-8">
        {/* Greeting + primary action */}
        <div className="rr-fade-up relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-7 shadow-paper sm:px-8 sm:py-9">
          <div className="rr-decoration pointer-events-none absolute right-5 top-4 select-none text-3xl opacity-80 sm:right-9 sm:top-7" aria-hidden="true">
            🍓 ✨
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {t("dashboard.title", "My ReliefRead")}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("dashboard.hello", "Hello")}{firstName ? `, ${firstName}` : ""} ✨
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t("dashboard.today", "What can we help with today?")}
            </p>
          </div>
        </div>

        <section className="rr-settle mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label={t("dashboard.today", "What can we help with today?")}>
          {actionCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              className="group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 text-left shadow-paper outline-none transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/45 focus-visible:ring-2 focus-visible:ring-ring sm:min-h-36 sm:p-5"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary transition group-hover:scale-105" aria-hidden="true">{card.icon}</span>
              <span className="mt-4 text-base font-semibold text-foreground sm:text-lg">{t(card.key, card.english)}</span>
              <span className="absolute right-3 top-3 text-xl opacity-70 rr-decoration" aria-hidden="true">{card.sticker}</span>
            </button>
          ))}
        </section>

        <button
          type="button"
          onClick={openRiley}
          className="mt-5 flex w-full items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-accent/70 px-5 py-4 text-left shadow-paper outline-none transition hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
            <span>
              <span className="block text-lg font-semibold text-foreground">{t("dashboard.askRiley", "Ask Riley")} ✨</span>
              <span className="block text-sm text-muted-foreground">{t("dashboard.askRileyHelp", "Ask with text or voice")}</span>
            </span>
          </span>
          <span className="text-2xl text-primary" aria-hidden="true">→</span>
        </button>

        <div ref={documentsRef} className="mt-12 scroll-mt-24">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-foreground">{t("dashboard.documents", "My documents")}</h2>
            <Button
              className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-paper hover:bg-primary/90"
              onClick={() => navigate("/new")}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("dashboard.new", "New reading")}
            </Button>
          </div>
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
