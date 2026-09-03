import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  AlertCircle,
  HelpCircle,
  Volume2,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  runAudioDiagnostics,
  playTestTone,
  type AudioDiagnostics,
  type CheckStatus,
} from "@/lib/audio-diagnostics";

interface AudioTroubleshooterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reading language, so voice checks target the right language. */
  lang: "en" | "da";
  /** Offer a one-tap switch to the HD Natural voice as a fallback. */
  onUseNaturalVoice?: () => void;
  /** Whether the reader is already on a Natural (HD) voice. */
  usingNaturalVoice?: boolean;
}

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <Check className="h-4 w-4" aria-hidden="true" />,
  warn: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
  fail: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
  unknown: <HelpCircle className="h-4 w-4" aria-hidden="true" />,
};

// Warm, never-red palette. Fail uses the amber tone too (this app has no red).
const STATUS_STYLES: Record<CheckStatus, string> = {
  pass: "bg-sage/15 text-sage",
  warn: "bg-amber/15 text-amber",
  fail: "bg-amber/20 text-amber",
  unknown: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "OK",
  warn: "Check this",
  fail: "Needs attention",
  unknown: "Can't tell",
};

/**
 * A calm "No sound?" troubleshooter. Runs real device/voice checks and offers
 * concrete fixes — including a live test tone and a one-tap switch to a Natural
 * voice that doesn't depend on the browser's built-in voices.
 */
export function AudioTroubleshooter({
  open,
  onOpenChange,
  lang,
  onUseNaturalVoice,
  usingNaturalVoice,
}: AudioTroubleshooterProps) {
  const [report, setReport] = useState<AudioDiagnostics | null>(null);
  const [running, setRunning] = useState(false);
  const [toneState, setToneState] = useState<"idle" | "playing" | "played" | "failed">("idle");

  const runChecks = useCallback(async () => {
    setRunning(true);
    try {
      const result = await runAudioDiagnostics(lang);
      setReport(result);
    } finally {
      setRunning(false);
    }
  }, [lang]);

  // Run checks each time the panel opens (device state can change).
  useEffect(() => {
    if (open) {
      setToneState("idle");
      void runChecks();
    }
  }, [open, runChecks]);

  const handleTestTone = useCallback(async () => {
    setToneState("playing");
    const ok = await playTestTone();
    if (!ok) {
      setToneState("failed");
      return;
    }
    // Give the tone time to finish, then re-run checks (AudioContext may have
    // moved from "suspended" to "running" after this gesture).
    window.setTimeout(() => {
      setToneState("played");
      void runChecks();
    }, 700);
  }, [runChecks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-foreground">
            No sound? Let's check.
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {running && !report
              ? "Checking your audio setup…"
              : report?.headline ?? "Running a few gentle checks on your audio."}
          </DialogDescription>
        </DialogHeader>

        {/* Checklist */}
        <div className="mt-2 space-y-2.5">
          {running && !report ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Running checks…</span>
            </div>
          ) : (
            report?.checks.map((check) => (
              <div
                key={check.id}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3.5"
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${STATUS_STYLES[check.status]}`}
                  aria-hidden="true"
                >
                  {STATUS_ICON[check.status]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{check.label}</p>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {STATUS_LABEL[check.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {check.detail}
                  </p>
                  {check.suggestion && check.status !== "pass" && (
                    <p className="mt-2 rounded-xl bg-highlight/40 px-3 py-2 text-sm leading-relaxed text-foreground">
                      {check.suggestion}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2.5">
          {/* Live test tone — the fastest way to confirm the audio path works
              AND it satisfies the AudioContext gesture requirement. */}
          <button
            onClick={handleTestTone}
            disabled={toneState === "playing"}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-sage px-5 text-base font-semibold text-sage-foreground shadow-paper outline-none transition hover:bg-sage/90 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {toneState === "playing" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Playing…
              </>
            ) : (
              <>
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                Play a test sound
              </>
            )}
          </button>

          {toneState === "played" && (
            <p className="text-center text-sm text-sage">
              Heard a soft chime? Your audio works — press Play to start reading.
            </p>
          )}
          {toneState === "failed" && (
            <p className="text-center text-sm text-amber">
              The test tone couldn't play. Check your volume and output device, then try again.
            </p>
          )}

          {/* Fallback: Natural voice doesn't rely on browser voices at all. */}
          {onUseNaturalVoice && !usingNaturalVoice && (
            <button
              onClick={() => {
                onUseNaturalVoice();
                onOpenChange(false);
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-sage/40 bg-transparent px-5 text-base font-medium text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Sparkles className="h-5 w-5 text-sage" aria-hidden="true" />
              Switch to a Natural voice instead
            </button>
          )}

          <button
            onClick={() => void runChecks()}
            disabled={running}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Run the checks again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AudioTroubleshooter;
