import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Loader2,
  MessageCircleQuestion,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SoftNotice } from "@/components/SoftNotice";
import { toast } from "@/components/ui/sonner";
import { useSpeech } from "@/hooks/useSpeech";
import { bcp47For } from "@/lib/reader-tokens";
import {
  generateDocumentInsights,
  insightsAsText,
  loadDocumentInsights,
  type DocumentInsights,
} from "@/lib/document-insights";

interface DocumentInsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  title: string;
  text: string;
  lang: "da" | "en";
  fontFamily: string;
  onAskRiley: (insights: DocumentInsights) => void;
}

export function DocumentInsightsSheet({
  open,
  onOpenChange,
  documentId,
  title,
  text,
  lang,
  fontFamily,
  onAskRiley,
}: DocumentInsightsSheetProps) {
  const [insights, setInsights] = useState<DocumentInsights | null>(() => loadDocumentInsights(documentId, text, lang));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const { supported: speechSupported, speaking, speak, stop: stopSpeech } = useSpeech();

  useEffect(() => {
    requestRef.current += 1;
    setInsights(loadDocumentInsights(documentId, text, lang));
    setError(null);
    setLoading(false);
    stopSpeech();
  }, [documentId, text, lang, stopSpeech]);

  const createOverview = useCallback(async () => {
    if (!text.trim()) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await generateDocumentInsights({ documentId, title, text, lang });
      if (requestId === requestRef.current) setInsights(result);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("Document overview failed:", err);
      setError(
        lang === "da"
          ? "Overblikket kunne ikke laves lige nu. Din original er stadig sikker. Prøv igen om lidt."
          : "We couldn't create the overview just now. Your original is still safe. Try again shortly."
      );
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [documentId, lang, text, title]);

  useEffect(() => {
    if (open && !insights && !loading && !error) void createOverview();
  }, [open, insights, loading, error, createOverview]);

  const spokenText = useMemo(() => insights ? insightsAsText(insights, lang) : "", [insights, lang]);

  const closeOrOpen = (next: boolean) => {
    if (!next) stopSpeech();
    onOpenChange(next);
  };

  const copyOverview = async () => {
    if (!spokenText) return;
    try {
      await navigator.clipboard.writeText(spokenText);
      toast(lang === "da" ? "Overblikket er kopieret." : "Overview copied.");
    } catch {
      toast(lang === "da" ? "Overblikket kunne ikke kopieres på denne enhed." : "The overview could not be copied on this device.");
    }
  };

  const toggleSpeech = () => {
    if (speaking) stopSpeech();
    else if (spokenText) speak(spokenText, { lang: bcp47For(lang), rate: 0.92 });
  };

  return (
    <Sheet open={open} onOpenChange={closeOrOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background p-5 sm:max-w-lg sm:p-7">
        <SheetHeader className="pr-8 text-left">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-[0.14em]">ReliefRead</span>
          </div>
          <SheetTitle className="font-display text-2xl">
            {lang === "da" ? "Det vigtigste" : "What matters most"}
          </SheetTitle>
          <SheetDescription>
            {lang === "da" ? "Et kort overblik baseret på originalteksten." : "A short overview based on the original text."}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-7 space-y-4" aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              {lang === "da" ? "Finder det vigtigste roligt" : "Finding what matters most"}
            </div>
            <div className="rr-skeleton h-28 rounded-3xl" />
            <div className="rr-skeleton h-20 rounded-3xl" />
            <div className="rr-skeleton h-20 rounded-3xl" />
          </div>
        ) : error ? (
          <SoftNotice className="mt-7">
            <div>
              <p>{error}</p>
              <Button type="button" variant="outline" onClick={() => void createOverview()} className="mt-3 h-11 rounded-full">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {lang === "da" ? "Prøv igen" : "Try again"}
              </Button>
            </div>
          </SoftNotice>
        ) : insights ? (
          <div className="mt-7 space-y-5" style={{ fontFamily }}>
            <section className="rounded-3xl border border-amber/40 bg-amber/10 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertCircle className="h-5 w-5 text-amber" aria-hidden="true" />
                {lang === "da" ? "Vigtigt" : "Important"}
              </div>
              <p className="mt-3 text-lg leading-relaxed text-foreground">{insights.mainPoint}</p>
            </section>

            {insights.importantPoints.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-foreground">
                  {lang === "da" ? "Vigtige punkter" : "Important points"}
                </h3>
                <div className="mt-3 space-y-2">
                  {insights.importantPoints.map((point, index) => (
                    <div key={`${point}-${index}`} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-primary" aria-hidden="true">
                        {index + 1}
                      </span>
                      <p className="leading-relaxed text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {insights.actions.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  {lang === "da" ? "Det skal du gøre" : "What to do"}
                </h3>
                <div className="mt-3 space-y-2">
                  {insights.actions.map((action, index) => (
                    <div key={`${action.task}-${index}`} className="rounded-2xl border border-primary/20 bg-accent/55 p-4">
                      <p className="font-semibold leading-relaxed text-foreground">{action.task}</p>
                      {(action.deadline || action.owner) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                          {action.deadline && <span className="rounded-full bg-background px-3 py-1">{action.deadline}</span>}
                          {action.owner && <span className="rounded-full bg-background px-3 py-1">{action.owner}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {insights.dates.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                  {lang === "da" ? "Datoer og frister" : "Dates and deadlines"}
                </h3>
                <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card px-4">
                  {insights.dates.map((date, index) => (
                    <div key={`${date.date}-${index}`} className="py-3">
                      <p className="font-semibold text-foreground">{date.date}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{date.meaning}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {insights.needsReply && (
              <SoftNotice icon={<MessageCircleQuestion className="h-4 w-4" />}>
                <strong>{lang === "da" ? "Et svar kan være nødvendigt." : "A reply may be needed."}</strong>{" "}
                {insights.replyReason}
              </SoftNotice>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-border pt-5">
              {speechSupported && (
                <Button type="button" variant="outline" onClick={toggleSpeech} className="h-11 rounded-full">
                  {speaking ? <Square className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  {speaking ? (lang === "da" ? "Stop" : "Stop") : (lang === "da" ? "Læs højt" : "Read aloud")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => void copyOverview()} className="h-11 rounded-full">
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                {lang === "da" ? "Kopiér" : "Copy"}
              </Button>
              <Button
                type="button"
                onClick={() => onAskRiley(insights)}
                className="col-span-2 h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                {lang === "da" ? "Spørg Riley om teksten" : "Ask Riley about the text"}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default DocumentInsightsSheet;
