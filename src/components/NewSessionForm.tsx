import React, { useState, useCallback, useRef } from "react";
import { FileText, Upload, Sparkles, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoftNotice } from "@/components/SoftNotice";
import { firstWords, wordCount, estimateReadingMinutes } from "@/lib/text-utils";
import { detectLanguage } from "@/lib/reader-tokens";
import { extractTextFromFile, isSupportedFile } from "@/lib/import-text";

export interface NewSessionSubmit {
  title: string;
  content: string;
  language: "en" | "da";
}

interface NewSessionFormProps {
  saving: boolean;
  onSubmit: (data: NewSessionSubmit) => void;
}

/**
 * The New Reading Session content input — two calm tabs:
 *   • Paste text — a large, friendly textarea.
 *   • Upload file — .txt and selectable .pdf (extracted client-side). A scanned
 *     PDF shows a kind message instead of failing silently.
 *
 * The title auto-generates from the first 6 words and stays editable inline.
 * Language is auto-detected (en/da) and stored with the document.
 */
export function NewSessionForm({ saving, onSubmit }: NewSessionFormProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const words = wordCount(content);
  const minutes = estimateReadingMinutes(content);
  const autoTitle = firstWords(content, 6) || "Untitled reading";
  const effectiveTitle = titleEdited ? title : autoTitle;

  // Apply extracted/pasted text and refresh the auto-title unless the user has
  // already typed their own.
  const applyContent = useCallback(
    (text: string) => {
      setContent(text);
      if (!titleEdited) setTitle("");
    },
    [titleEdited]
  );

  const handleFiles = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setNotice(null);
      if (!isSupportedFile(file)) {
        setNotice("Please choose a .txt or .pdf file.");
        return;
      }
      setExtracting(true);
      try {
        const result = await extractTextFromFile(file);
        if (result.kind === "pdf" && result.scanned) {
          setNotice(
            "This PDF is a scanned image. Try pasting the text instead. Photo scanning is coming soon."
          );
          return;
        }
        if (!result.text.trim()) {
          setNotice("We couldn't find any text in that file. Try pasting it instead.");
          return;
        }
        applyContent(result.text);
        if (!titleEdited && !title) {
          setTitle(file.name.replace(/\.(txt|pdf)$/i, ""));
          setTitleEdited(true);
        }
      } catch (err) {
        console.error("File import failed:", err);
        setNotice(
          "We couldn't read that file just now. Try pasting the text instead — that always works."
        );
      } finally {
        setExtracting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [applyContent, title, titleEdited]
  );

  const submit = () => {
    if (!content.trim()) {
      setNotice("Paste or upload some text first, and we'll take it from there.");
      return;
    }
    onSubmit({
      title: (effectiveTitle || "Untitled reading").trim(),
      content: content.trim(),
      language: detectLanguage(content),
    });
  };

  return (
    <div className="space-y-7">
      <Tabs defaultValue="paste" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1">
          <TabsTrigger value="paste" className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Paste text
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-xl">
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload file
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="mt-5 space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="content" className="text-base font-medium">
              Your text
            </Label>
            {words > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground">
                {words} {words === 1 ? "word" : "words"} · ~{minutes} min
              </span>
            )}
          </div>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => applyContent(e.target.value)}
            placeholder="Paste your text here — an email, an article, a letter…"
            className="min-h-[220px] resize-y rounded-2xl border-input bg-card p-4 text-base leading-relaxed"
          />
          <p className="text-sm text-muted-foreground">
            English and Danish are detected automatically.
          </p>
        </TabsContent>

        <TabsContent value="upload" className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-10 text-center outline-none transition hover:border-sage/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {extracting ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-sage" aria-hidden="true" />
                <span className="text-base font-medium text-foreground">Reading your file…</span>
              </>
            ) : (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <Upload className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-base font-medium text-foreground">
                  Choose a .txt or .pdf file
                </span>
                <span className="text-sm text-muted-foreground">
                  We'll pull the text out for you.
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
              Got it — {words} {words === 1 ? "word" : "words"} ready to read.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {notice && <SoftNotice>{notice}</SoftNotice>}

      {/* Editable auto-title */}
      <div className="space-y-2.5">
        <Label htmlFor="title" className="flex items-center gap-2 text-base font-medium">
          <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Title
        </Label>
        <Input
          id="title"
          value={effectiveTitle}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleEdited(true);
          }}
          placeholder="A name for this reading"
          className="h-12 rounded-xl border-input bg-card text-base"
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          We named it from your first few words — change it if you like.
        </p>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          onClick={submit}
          disabled={saving || extracting || !content.trim()}
          className="h-12 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Preparing…
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-5 w-5" aria-hidden="true" />
              Start reading
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default NewSessionForm;
