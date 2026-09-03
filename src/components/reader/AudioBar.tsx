import React from "react";
import { Play, Pause, Square, RotateCcw, Gauge, Sparkles, Loader2, Volume2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlaybackStatus } from "@/hooks/useReadAloud";
import type { Engine } from "@/lib/reader-tokens";
import { voicesForLang, type ReaderVoice } from "@/lib/reader-voices";
import { AudioTroubleshooter } from "@/components/reader/AudioTroubleshooter";
import { useLanguage } from "@/lib/i18n";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

interface AudioBarProps {
  status: PlaybackStatus;
  engine: Engine;
  lang: "en" | "da";
  speed: number;
  onSpeed: (s: number) => void;
  onToggle: () => void;
  onStop: () => void;
  onSkipBack: () => void;
  /** Undefined = using the free browser voice. A voice id = HD requested. */
  hdVoiceId?: string;
  /** Choose an HD voice (turns HD on), or null to switch back to the free voice. */
  onVoice: (voice: ReaderVoice | null) => void;
}

/**
 * Persistent audio bar pinned to the bottom of the Reading View. Calm, roomy
 * controls: a single 48px play/pause toggle, stop, skip-back-10s, speed, and a
 * voice selector that lets the reader stay on the free voice or pick a warm HD
 * voice. Every control is >=44px with an aria-label.
 */
export function AudioBar({
  status,
  engine,
  lang,
  speed,
  onSpeed,
  onToggle,
  onStop,
  onSkipBack,
  hdVoiceId,
  onVoice,
}: AudioBarProps) {
  const { t } = useLanguage();
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const hdVoices = voicesForLang(lang);
  const activeVoiceLabel = hdVoiceId
    ? hdVoices.find((v) => v.id === hdVoiceId)?.label ?? t("audio.natural", "Natural voice")
    : t("audio.standard", "Standard voice");
  const [troubleshootOpen, setTroubleshootOpen] = React.useState(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        {/* Skip back 10s */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full text-foreground hover:bg-accent"
          onClick={onSkipBack}
          disabled={isLoading}
          aria-label={t("audio.back", "Skip back 10 seconds")}
          title={t("audio.back", "Back 10 seconds")}
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Play / Pause — one 48px toggle */}
        <Button
          className="h-12 w-12 shrink-0 rounded-full bg-sage text-sage-foreground shadow-paper hover:bg-sage/90"
          onClick={onToggle}
          disabled={isLoading}
          aria-label={isPlaying ? t("audio.pause", "Pause") : isLoading ? t("audio.preparing", "Preparing audio") : t("audio.play", "Play")}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Play className="h-6 w-6" aria-hidden="true" />
          )}
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full text-foreground hover:bg-accent"
          onClick={onStop}
          disabled={status === "idle"}
          aria-label={t("audio.stop", "Stop")}
          title={t("audio.stop", "Stop")}
        >
          <Square className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="mx-1 hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden="true" />

        {/* Speed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-11 shrink-0 gap-1.5 rounded-full px-3 text-foreground hover:bg-accent"
              aria-label={t("audio.speedAria", `Playback speed, currently ${speed} times`, { speed })}
            >
              <Gauge className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums text-sm font-medium">{speed}×</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="rounded-2xl">
            <DropdownMenuLabel>{t("audio.speed", "Reading speed")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(speed)}
              onValueChange={(v) => onSpeed(Number(v))}
            >
              {SPEEDS.map((s) => (
                <DropdownMenuRadioItem key={s} value={String(s)} className="tabular-nums">
                  {s}×{s === 1 ? ` (${t("audio.normal", "normal")})` : ""}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Voice selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="ml-auto h-11 shrink-0 gap-1.5 rounded-full px-3 text-foreground hover:bg-accent"
              aria-label={t("audio.voiceAria", `Voice, currently ${activeVoiceLabel}`, { voice: activeVoiceLabel })}
            >
              {hdVoiceId ? (
                <Sparkles className="h-4 w-4 text-sage" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:block">
                {activeVoiceLabel}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl">
            <DropdownMenuLabel>{t("audio.voice", "Voice")}</DropdownMenuLabel>
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-xl"
              onSelect={() => onVoice(null)}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <div className="flex flex-col">
                <span>{t("audio.standard", "Standard voice")}</span>
                <span className="text-xs text-muted-foreground">{t("audio.freeOffline", "Free. Works offline")}</span>
              </div>
              {!hdVoiceId && <span className="ml-auto text-sage" aria-hidden="true">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t("audio.naturalVoices", "Natural voices")}
            </DropdownMenuLabel>
            {hdVoices.map((v) => (
              <DropdownMenuItem
                key={v.id}
                className="cursor-pointer gap-2 rounded-xl"
                onSelect={() => onVoice(v)}
              >
                <Sparkles className="h-4 w-4 text-sage" aria-hidden="true" />
                <span>{v.label}</span>
                {hdVoiceId === v.id && (
                  <span className="ml-auto text-sage" aria-hidden="true">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {engine === "hd" && (
        <p className="pb-2 text-center text-xs text-muted-foreground">
          {t("audio.follow", "Natural voice. Highlight follows along")}
        </p>
      )}

      {/* Gentle "No sound?" escape hatch — right where a silent Play button is. */}
      <div className="pb-2 text-center">
        <button
          onClick={() => setTroubleshootOpen(true)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={t("audio.troubleshoot", "Troubleshoot: no sound")}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("audio.noSound", "No sound?")}
        </button>
      </div>

      <AudioTroubleshooter
        open={troubleshootOpen}
        onOpenChange={setTroubleshootOpen}
        lang={lang}
        usingNaturalVoice={!!hdVoiceId}
        onUseNaturalVoice={() => {
          const first = hdVoices[0];
          if (first) onVoice(first);
        }}
      />
    </div>
  );
}

export default AudioBar;
