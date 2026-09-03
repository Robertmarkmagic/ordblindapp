import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Mic, RotateCcw, Send, Sparkles, Volume2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAiChat } from "@/hooks/useAiChat";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useLanguage } from "@/lib/i18n";

type QuickAction = {
  icon: React.ReactNode;
  da: string;
  en: string;
  promptDa: string;
  promptEn: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Volume2 className="h-4 w-4" aria-hidden="true" />,
    da: "Læs for mig",
    en: "Read for me",
    promptDa: "Hjælp mig med at få teksten læst højt.",
    promptEn: "Help me read this text aloud.",
  },
  {
    icon: <Bot className="h-4 w-4" aria-hidden="true" />,
    da: "Forklar dette",
    en: "Explain this",
    promptDa: "Forklar dette med korte og almindelige ord.",
    promptEn: "Explain this using short, everyday words.",
  },
  {
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    da: "Gør lettere",
    en: "Make it easier",
    promptDa: "Gør teksten lettere at læse. Bevar betydningen.",
    promptEn: "Make the text easier to read. Keep the meaning.",
  },
  {
    icon: <span aria-hidden="true">✍️</span>,
    da: "Hjælp mig med at skrive",
    en: "Help me write",
    promptDa: "Hjælp mig med at skrive dette. Det skal stadig lyde som mig.",
    promptEn: "Help me write this. It should still sound like me.",
  },
  {
    icon: <span aria-hidden="true">✓</span>,
    da: "Ret kun fejl",
    en: "Fix errors only",
    promptDa: "Ret kun stavefejl og tydelige fejl. Ændr ikke min tone.",
    promptEn: "Fix spelling and clear errors only. Do not change my tone.",
  },
  {
    icon: <span aria-hidden="true">[,]</span>,
    da: "Ret kommaer",
    en: "Fix commas",
    promptDa: "Ret kun kommaerne og forklar meget kort hvorfor.",
    promptEn: "Fix commas only and explain very briefly why.",
  },
];

function getSelectedText() {
  if (typeof window === "undefined") return "";
  return window.getSelection()?.toString().trim().slice(0, 6000) || "";
}

export function RileyAssistant() {
  const location = useLocation();
  const { preferences } = useAppPreferences();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState("");
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const systemPrompt = useMemo(
    () =>
      language === "da"
        ? "Du er Riley, ReliefReads rolige AI-hjælper. Svar på dansk med korte, tydelige sætninger. Hjælp med læsning, forståelse og skrivning uden at dømme. Når du retter tekst, skal den stadig lyde som brugeren. Giv ikke facit på skoleopgaver, hvis brugeren beder om at lære."
        : "You are Riley, ReliefRead's calm AI helper. Use short, clear sentences. Help with reading, understanding and writing without judgement. When correcting text, keep the user's voice. Do not give away school answers when the user asks to learn.",
    [language]
  );

  const { messages, sendMessage, loading, error, clearHistory } = useAiChat({ systemPrompt });
  const availableHere = ["/dashboard", "/new", "/write", "/read", "/settings"].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    const openRiley = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      setSelection(getSelectedText());
      if (detail?.prompt) setInput(detail.prompt);
      setOpen(true);
    };
    window.addEventListener("reliefread:open-riley", openRiley);
    return () => window.removeEventListener("reliefread:open-riley", openRiley);
  }, []);

  useEffect(() => {
    if (open) setSelection(getSelectedText());
  }, [open, location.pathname]);

  useEffect(() => {
    if (!availableHere) setOpen(false);
  }, [availableHere]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const withContext = (prompt: string) => {
    const selected = selection.trim();
    if (!selected) return prompt;
    return `${prompt}\n\n${language === "da" ? "Tekst:" : "Text:"}\n${selected}`;
  };

  const submit = async (prompt = input) => {
    if (!prompt.trim() || loading) return;
    setInput("");
    await sendMessage(withContext(prompt.trim()));
  };

  const startDictation = () => {
    const SpeechRecognition = (window as typeof window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setInput(language === "da" ? "Taleinput understøttes ikke i denne browser." : "Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "da" ? "da-DK" : "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput((current) => `${current}${current ? " " : ""}${transcript}`);
    };
    recognition.start();
  };

  if (!availableHere) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={language === "da" ? "Åbn Riley" : "Open Riley"}
        className="fixed bottom-6 left-5 z-40 flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground shadow-xl outline-none transition hover:scale-[1.02] hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:left-auto sm:right-6"
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
        Riley
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-full w-[94vw] max-w-md flex-col border-primary/20 bg-background p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border bg-card px-6 py-5 pr-14 text-left">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-paper" aria-hidden="true">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <SheetTitle className="font-display text-xl">Riley</SheetTitle>
                <SheetDescription className="text-sm">
                  {language === "da" ? "Din hjælp til ord, tekst og forståelse" : "Your help with words, text and understanding"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {selection && (
              <div className="mb-4 rounded-2xl border border-primary/20 bg-accent/70 p-3 text-sm text-foreground">
                <p className="font-semibold">{language === "da" ? "Markeret tekst" : "Selected text"}</p>
                <p className="mt-1 line-clamp-3 leading-relaxed text-muted-foreground">{selection}</p>
              </div>
            )}

            {messages.length === 0 ? (
              <div>
                <p className="text-base font-semibold text-foreground">
                  {language === "da" ? "Hvad vil du have hjælp til?" : "What would you like help with?"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.da}
                      type="button"
                      onClick={() => submit(language === "da" ? action.promptDa : action.promptEn)}
                      className="flex min-h-[54px] items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground shadow-paper outline-none transition hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-primary">{action.icon}</span>
                      {language === "da" ? action.da : action.en}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4" aria-live="polite">
                {messages.filter((message) => message.role !== "system").map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-card text-foreground shadow-paper"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                {loading && (
                  <div className="flex max-w-[88%] items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-paper">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {preferences.gentleMessages
                      ? language === "da" ? "Riley gør svaret klar..." : "Riley is getting your answer ready..."
                      : language === "da" ? "Arbejder..." : "Working..."}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-2xl border border-amber/30 bg-amber/10 p-3 text-sm text-foreground">
                {language === "da" ? "Riley kunne ikke svare lige nu. Prøv igen om lidt." : "Riley could not answer just now. Please try again shortly."}
              </p>
            )}
          </div>

          <div className="border-t border-border bg-card/90 p-4 backdrop-blur">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="mb-2 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {language === "da" ? "Ny samtale" : "New conversation"}
              </button>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder={language === "da" ? "Spørg Riley..." : "Ask Riley..."}
                rows={2}
                className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={startDictation}
                aria-label={language === "da" ? "Tal til Riley" : "Speak to Riley"}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${listening ? "bg-amber/20 text-foreground" : "text-primary hover:bg-accent"}`}
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!input.trim() || loading}
                aria-label={language === "da" ? "Send til Riley" : "Send to Riley"}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default RileyAssistant;
