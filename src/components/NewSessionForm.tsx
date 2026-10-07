import React, { useState, useCallback, useRef, useEffect } from "react";
import { FileText, Upload, Sparkles, Loader2, Pencil, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoftNotice } from "@/components/SoftNotice";
import { firstWords, wordCount, estimateReadingMinutes } from "@/lib/text-utils";
import { detectLanguage } from "@/lib/reader-tokens";
import { extractTextFromFile, isSupportedFile } from "@/lib/import-text";
import { useLanguage } from "@/lib/i18n";
import { importWebPage, safeWebSourceUrl, webImportMessage, WebImportError, type WebPageText } from "@/lib/web-import";

export interface NewSessionSubmit {
  title: string;
  content: string;
  language: "en" | "da";
  sourceUrl?: string;
}

interface NewSessionFormProps {
  saving: boolean;
  onSubmit: (data: NewSessionSubmit) => void;
}

/**
 * The New Reading Session content input with text, file and web address tabs:
 *   • Paste text — a large, friendly textarea.
 *   • Upload file — .txt and selectable .pdf (extracted client-side). A scanned
 *     PDF shows a kind message instead of failing silently.
 *
 * The title auto-generates from the first 6 words and stays editable inline.
 * Language is auto-detected (en/da) and stored with the document.
 */
export function NewSessionForm({ saving, onSubmit }: NewSessionFormProps) {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState("paste");
  const [content, setContent] = useState("");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [address, setAddress] = useState("");
  const [webPage, setWebPage] = useState<WebPageText | null>(null);
  const [fetchingPage, setFetchingPage] = useState(false);
  const webRequest = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tr = (da: string, en: string) => language === "da" ? da : en;

  useEffect(() => () => { webRequest.current?.abort(); webRequest.current = null; }, []);

  const activeContent = tab === "link" ? webPage?.text || "" : content;
  const busy = saving || extracting || fetchingPage;
  const originalUrl = webPage?.sourceUrl || safeWebSourceUrl(address);

  const words = wordCount(activeContent);
  const minutes = estimateReadingMinutes(activeContent);
  const autoTitle = (tab === "link" ? webPage?.title : suggestedTitle) || firstWords(activeContent, 6) || t("form.untitled", "Untitled reading");
  const effectiveTitle = titleEdited ? title : autoTitle;

  // Apply extracted/pasted text and refresh the auto-title unless the user has
  // already typed their own.
  const applyContent = useCallback(
    (text: string) => {
      setContent(text);
      setSuggestedTitle("");
      if (!titleEdited) setTitle("");
    },
    [titleEdited]
  );

  const handleFiles = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setNotice(null);
      if (!isSupportedFile(file)) {
        setNotice(t("form.chooseFile", "Please choose a .txt or .pdf file."));
        return;
      }
      setExtracting(true);
      try {
        const result = await extractTextFromFile(file);
        if (result.kind === "pdf" && result.scanned) {
          setNotice(
            t("form.scannedPdf", "This PDF is a scanned image. Try pasting the text instead. Photo scanning is coming soon.")
          );
          return;
        }
        if (!result.text.trim()) {
          setNotice(t("form.noText", "We couldn't find any text in that file. Try pasting it instead."));
          return;
        }
        applyContent(result.text);
        setSuggestedTitle(file.name.replace(/\.(txt|pdf)$/i, ""));
      } catch (err) {
        console.error("File import failed:", err);
        setNotice(
          t("form.readError", "We couldn't read that file just now. Try pasting the text instead. That always works.")
        );
      } finally {
        setExtracting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [applyContent, t]
  );

  const fetchPage = async () => {
    if (busy) return;
    setNotice(null);
    const controller = new AbortController();
    webRequest.current?.abort();
    webRequest.current = controller;
    setFetchingPage(true);
    try {
      const page = await importWebPage(address, controller.signal);
      if (webRequest.current === controller) setWebPage(page);
    } catch (error) {
      if (!controller.signal.aborted && webRequest.current === controller) {
        setNotice(webImportMessage(error instanceof WebImportError ? error.code : "web_unavailable", language));
      }
    } finally {
      if (webRequest.current === controller) { setFetchingPage(false); webRequest.current = null; }
    }
  };

  const submit = () => {
    if (busy) return;
    if (!activeContent.trim()) {
      setNotice(t("form.addText", "Paste or upload some text first, and we'll take it from there."));
      return;
    }
    onSubmit({
      title: (effectiveTitle || t("form.untitled", "Untitled reading")).trim(),
      content: activeContent.trim(),
      language: detectLanguage(activeContent),
      ...(tab === "link" && webPage ? { sourceUrl: webPage.sourceUrl } : {}),
    });
  };

  return (
    <div className="space-y-7">
      <Tabs value={tab} onValueChange={(value) => { setTab(value); setNotice(null); }} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted p-1">
          <TabsTrigger value="paste" disabled={busy} className="min-h-12 flex-col gap-1 rounded-xl px-1 text-xs sm:flex-row sm:px-3 sm:text-sm">
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("form.paste", "Paste text")}
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={busy} className="min-h-12 flex-col gap-1 rounded-xl px-1 text-xs sm:flex-row sm:px-3 sm:text-sm">
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("form.upload", "Upload file")}
          </TabsTrigger>
          <TabsTrigger value="link" disabled={busy} className="min-h-12 flex-col gap-1 rounded-xl px-1 text-xs sm:flex-row sm:px-3 sm:text-sm">
            <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {tr("Indsæt link", "Paste link")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="mt-5 space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="content" className="text-base font-medium">
              {t("form.yourText", "Your text")}
            </Label>
            {words > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground">
                {words} {words === 1 ? t("form.word", "word") : t("form.words", "words")} · ~{minutes} min
              </span>
            )}
          </div>
          <Textarea
            id="content"
            value={content}
            disabled={busy}
            onChange={(e) => applyContent(e.target.value)}
            placeholder={t("form.placeholder", "Paste your text here. An email, an article, a letter...")}
            className="min-h-[220px] resize-y rounded-2xl border-input bg-card p-4 text-base leading-relaxed"
          />
          <p className="text-sm text-muted-foreground">
            {t("form.detected", "English and Danish are detected automatically.")}
          </p>
        </TabsContent>

        <TabsContent value="upload" className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-10 text-center outline-none transition hover:border-sage/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {extracting ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-sage" aria-hidden="true" />
                <span className="text-base font-medium text-foreground">{t("form.readingFile", "Reading your file...")}</span>
              </>
            ) : (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <Upload className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-base font-medium text-foreground">
                  {t("form.chooseUpload", "Choose a .txt or .pdf file")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("form.extract", "We'll pull the text out for you.")}
                </span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files?.[0])}
          />
          {content.trim() && !extracting && (
            <p className="text-sm text-sage">
              {t("form.ready", `Got it. ${words} ${words === 1 ? "word" : "words"} ready to read.`, {
                words,
                wordLabel: words === 1 ? t("form.word", "word") : t("form.words", "words"),
              })}
            </p>
          )}
        </TabsContent>

        <TabsContent value="link" className="mt-5 space-y-4">
          <form onSubmit={(event) => { event.preventDefault(); void fetchPage(); }} className="space-y-3">
            <Label htmlFor="web-address" className="text-base font-medium">{tr("Hjemmesidens webadresse", "Web page address")}</Label>
            <Input
              id="web-address" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={address} disabled={saving || extracting} placeholder="https://..." aria-describedby="web-address-help"
              className="h-12 rounded-xl bg-card text-base"
              onChange={(event) => {
                webRequest.current?.abort(); webRequest.current = null;
                setFetchingPage(false); setAddress(event.target.value); setWebPage(null); setNotice(null);
              }}
            />
            <p id="web-address-help" className="text-sm text-muted-foreground">
              {tr("Indsæt et link direkte til en artikel, webtekst eller et kapitel. På Wattpad: åbn kapitlet og kopier dets webadresse.", "Paste a direct link to an article, web text or chapter. On Wattpad, open the chapter and copy its web address.")}
            </p>
            <Button type="submit" disabled={busy || !address.trim()} className="min-h-11 rounded-full px-5">
              {fetchingPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />}
              {fetchingPage ? tr("Henter teksten…", "Fetching text…") : tr("Hent teksten fra linket", "Fetch text from link")}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            {tr("Vi henter sidens læsetekst med Jina AI. Webadressen sendes til denne tjeneste. Loginoplysninger og din ReliefRead-session sendes ikke med.", "We fetch the page's reading text with Jina AI. The web address is sent to this service. Your login credentials and ReliefRead session are not forwarded.")}
          </p>
          {originalUrl && (
            <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />{tr("Åbn originalsiden", "Open original page")}
            </a>
          )}
          {fetchingPage && <p role="status" className="text-sm text-muted-foreground">{tr("Det kan tage lidt tid. Vi henter kun denne side.", "This may take a little time. We fetch only this page.")}</p>}
          {webPage && (
            <div className="space-y-2">
              <Label htmlFor="web-text" className="text-base font-medium">{tr("Teksten fra hjemmesiden", "Text from the web page")}</Label>
              <p role="status" className="text-sm text-sage">{words} {t("form.words", "words")} · ~{minutes} min</p>
              <Textarea id="web-text" value={webPage.text} disabled={busy} className="min-h-[220px] rounded-2xl bg-card p-4 text-base leading-relaxed" onChange={(event) => setWebPage({ ...webPage, text: event.target.value })} />
              <p className="text-sm text-muted-foreground">{tr("Kontrollér teksten. Tryk derefter på Start læsning for oplæsning, markering, ordbog og noter. Læsningen er en gemt kopi, ikke den oprindelige hjemmeside.", "Check the text, then choose Start reading for read-aloud, highlighting, dictionary and notes. The reading is a saved copy, not the original website.")}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{tr("Sider med login, betalingsmur eller blokering kan kræve, at du selv kopierer teksten til Indsæt tekst. Hvert kapitel hentes separat.", "Pages requiring a login or payment, or blocking extraction, may need you to copy the text into Paste text. Each chapter is fetched separately.")}</p>
        </TabsContent>
      </Tabs>

      {notice && <SoftNotice>{notice}</SoftNotice>}

      {/* Editable auto-title */}
      <div className="space-y-2.5">
        <Label htmlFor="title" className="flex items-center gap-2 text-base font-medium">
          <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("form.title", "Title")}
        </Label>
        <Input
          id="title"
          value={effectiveTitle}
          disabled={busy}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleEdited(true);
          }}
          placeholder={t("form.titlePlaceholder", "A name for this reading")}
          className="h-12 rounded-xl border-input bg-card text-base"
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          {tab === "link" ? tr("Vi bruger hjemmesidens titel. Du kan ændre den.", "We use the page title. You can change it.") : t("form.titleHelp", "We named it from your first few words. Change it if you like.")}
        </p>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          onClick={submit}
          disabled={busy || !activeContent.trim()}
          className="h-12 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              {t("form.preparing", "Preparing...")}
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-5 w-5" aria-hidden="true" />
              {t("form.start", "Start reading")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default NewSessionForm;
