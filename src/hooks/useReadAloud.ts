import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { generateHdAudio } from "@/lib/tts";
import { recordTtsSeconds } from "@/lib/usage";
import {
  ReaderModel,
  Engine,
  chooseEngine,
  charIndexToWordIndex,
  estimateWordTimings,
  timeToWordIndex,
  reindexSlice,
  sliceRange,
  bcp47For,
} from "@/lib/reader-tokens";

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

export interface UseReadAloudArgs {
  documentId: string;
  model: ReaderModel;
  lang: "en" | "da";
  /** ElevenLabs voice id when the user wants the HD/natural voice. */
  hdVoiceId?: string;
  /** True when the user has switched on the natural (HD) voice. */
  hdRequested: boolean;
  /** Fires once when HD fails and we auto-fall-back (for the toast). */
  onFallback?: () => void;
  /**
   * Fires when the browser voice produced NO audible sound at all (the
   * watchdog's 'no-audio' signal), so the UI can point the user at the
   * "No sound?" checker instead of failing silently.
   */
  onNoAudio?: () => void;
  /**
   * Fires when the browser voice spoke a word then FROZE mid-utterance (the
   * watchdog's 'stalled' signal — classic on-device Danish stall). Lets the UI
   * warn the reader and/or switch to a voice that handles the language.
   */
  onStall?: () => void;
}

export interface UseReadAloudResult {
  status: PlaybackStatus;
  engine: Engine;
  currentWordIndex: number;
  speed: number;
  setSpeed: (s: number) => void;
  /** Toggle play/pause. Starts from `fromWord` if given (click-to-seek). */
  toggle: (fromWord?: number) => void;
  stop: () => void;
  /** Jump back 10 seconds (or ~a sentence for the browser engine). */
  skipBack: () => void;
  /** Jump playback to a specific word (click a word to seek there). */
  seekToWord: (wordIndex: number) => void;
  /** Play ONLY the words in [startWord, endWord] then stop (fragment read). */
  playRange: (startWord: number, endWord: number) => void;
  /** True while the browser voice is unavailable AND HD is the only option. */
  browserSupported: boolean;
}

/**
 * useReadAloud — the reader's audio brain. Coordinates two engines behind one
 * simple API so the Reading View just renders `currentWordIndex`:
 *
 *   • BROWSER (default, free): useSpeech + real `boundary` events → sample-
 *     accurate word highlight. Never costs credits, works offline.
 *   • HD (opt-in): ElevenLabs Flash v2.5 via the cached gateway (tts.ts). The
 *     gateway returns no per-word timestamps, so we spread words across the
 *     clip duration (estimateWordTimings) and track the <audio> element's
 *     currentTime → word. Speed is applied client-side (playbackRate), so a
 *     replay of the same text at a different speed never regenerates.
 *
 * If an HD generation fails we flip `hdError` and `chooseEngine` automatically
 * routes the SAME play action to the browser voice — the app is never silent
 * because an API failed.
 */
export function useReadAloud({
  documentId,
  model,
  lang,
  hdVoiceId,
  hdRequested,
  onFallback,
  onNoAudio,
  onStall,
}: UseReadAloudArgs): UseReadAloudResult {
  const speech = useSpeech();
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [hdError, setHdError] = useState(false);

  const engine = chooseEngine({
    hdRequested,
    hdError,
    browserSupported: speech.supported,
  });

  // ── HD engine plumbing ────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timingsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  const clearRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tickHd = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = timeToWordIndex(timingsRef.current, audio.currentTime);
    setCurrentWordIndex(idx);
    rafRef.current = requestAnimationFrame(tickHd);
  }, []);

  const teardownHd = useCallback(() => {
    clearRaf();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    }
  }, []);

  // Which absolute word the current browser utterance STARTED from, and the
  // re-based slice used to translate its boundary charIndex → absolute word.
  const browserBaseRef = useRef(0);
  const browserSliceRef = useRef(model.words);

  // ── Browser-voice highlight ticker (root-cause fix) ────────────────────────
  // The frozen highlight was NOT a stale setter/closure — the boundary→state
  // path is sound. The real cause: some browser voices (notably Chrome's remote
  // "Google …" network voices) play audio to completion but never fire usable
  // `boundary` events, so `charIndex` stays 0 and the highlight sticks on the
  // first word while audio plays fine (verified: stuck on "The" for a whole
  // reading). A wall-clock ticker GUARANTEES the highlight advances regardless
  // of voice. When real boundaries DO arrive (local voices) they're precise, so
  // the moment charIndex moves past 0 we stand the ticker down and let
  // boundaries own the highlight.
  const browserRafRef = useRef<number | null>(null);
  const browserTimingsRef = useRef<number[]>([]); // slice-local estimated starts
  const browserPlayStartRef = useRef(0);
  const browserPausedAccumRef = useRef(0);
  const browserPauseStartRef = useRef(0);
  const browserSawBoundaryRef = useRef(false);

  const clearBrowserRaf = () => {
    if (browserRafRef.current != null) {
      cancelAnimationFrame(browserRafRef.current);
      browserRafRef.current = null;
    }
  };

  const tickBrowser = useCallback(() => {
    const timings = browserTimingsRef.current;
    const slice = browserSliceRef.current;
    if (timings.length && slice.length && !browserSawBoundaryRef.current) {
      const elapsedSec =
        (performance.now() -
          browserPlayStartRef.current -
          browserPausedAccumRef.current) /
        1000;
      const localIdx = Math.min(
        timeToWordIndex(timings, elapsedSec),
        slice.length - 1
      );
      const abs = slice[localIdx]?.index;
      if (typeof abs === "number") setCurrentWordIndex(abs);
    }
    browserRafRef.current = requestAnimationFrame(tickBrowser);
  }, []);

  // Build an estimated per-word timeline for the slice and (re)start the ticker.
  // Duration is estimated from char count and rate (~14 chars/sec at 1×); only
  // the SHAPE matters — real boundary events refine/replace it when available.
  const startBrowserTicker = useCallback(
    (slice: ReaderModel["words"], rate: number) => {
      const text = slice.map((w) => w.text).join(" ");
      const estDuration = Math.max(1, text.length / (14 * Math.max(0.25, rate)));
      browserTimingsRef.current = estimateWordTimings(slice, estDuration);
      browserSawBoundaryRef.current = false;
      browserPlayStartRef.current = performance.now();
      browserPausedAccumRef.current = 0;
      clearBrowserRaf();
      browserRafRef.current = requestAnimationFrame(tickBrowser);
    },
    [tickBrowser]
  );

  // Keep the browser engine's word position in sync via its boundary charIndex.
  // charIndex is relative to the sliced text we passed to speak(), so map it
  // against the re-based slice (whose .index values are absolute). Once a real
  // boundary advances past word 0, precise boundary tracking takes over and the
  // estimated ticker stands down (browserSawBoundaryRef).
  useEffect(() => {
    if (engine !== "browser") return;
    if (!speech.speaking) return;
    if (speech.charIndex > 0) browserSawBoundaryRef.current = true;
    setCurrentWordIndex(
      charIndexToWordIndex(browserSliceRef.current, speech.charIndex)
    );
  }, [engine, speech.speaking, speech.charIndex]);

  // Mirror the browser engine's speaking/paused state into our status.
  useEffect(() => {
    if (engine !== "browser") return;
    if (speech.speaking) setStatus(speech.paused ? "paused" : "playing");
    else if (status === "playing" || status === "paused") setStatus("idle");
  }, [engine, speech.speaking, speech.paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    speech.stop();
    teardownHd();
    clearBrowserRaf();
    setStatus("idle");
    setCurrentWordIndex(0);
  }, [speech, teardownHd]);

  // ── Start playback from a given word on the chosen engine ──────────────────
  const startBrowser = useCallback(
    (fromWord: number) => {
      const slice = reindexSlice(model.words, fromWord);
      if (!slice.length) return;
      browserBaseRef.current = fromWord;
      browserSliceRef.current = slice;
      const text = slice.map((w) => w.text).join(" ");
      setStatus("playing");
      setCurrentWordIndex(fromWord);
      speech.speak(text, {
        rate: speed,
        lang: bcp47For(lang),
        onError: (msg) => {
          clearBrowserRaf();
          setStatus("idle");
          if (msg === "no-audio") onNoAudio?.();
          else if (msg === "stalled") onStall?.();
        },
        onEnd: () => {
          clearBrowserRaf();
          setStatus("idle");
          setCurrentWordIndex(0);
        },
      });
      // Guarantee the highlight advances even if this voice never fires usable
      // boundary events; real boundaries (if any) refine it and stand it down.
      startBrowserTicker(slice, speed);
    },
    [model.words, speech, speed, lang, onNoAudio, onStall, startBrowserTicker]
  );

  // Speak ONLY an inclusive [startWord, endWord] fragment. The slice ends at
  // endWord, so onEnd fires naturally there — playback never continues into the
  // rest of the document. Highlight tracks via boundary events against the
  // re-based slice (whose .index values stay absolute).
  const startBrowserRange = useCallback(
    (startWord: number, endWord: number) => {
      const slice = sliceRange(model.words, startWord, endWord);
      if (!slice.length) return;
      browserBaseRef.current = startWord;
      browserSliceRef.current = slice;
      const text = slice.map((w) => w.text).join(" ");
      setStatus("playing");
      setCurrentWordIndex(startWord);
      speech.speak(text, {
        rate: speed,
        lang: bcp47For(lang),
        onError: (msg) => {
          clearBrowserRaf();
          setStatus("idle");
          if (msg === "no-audio") onNoAudio?.();
          else if (msg === "stalled") onStall?.();
        },
        onEnd: () => {
          clearBrowserRaf();
          setStatus("idle");
          setCurrentWordIndex(0);
        },
      });
      startBrowserTicker(slice, speed);
    },
    [model.words, speech, speed, lang, onNoAudio, onStall, startBrowserTicker]
  );

  // Fragment read ("Read this"): always the free browser voice — instant,
  // boundary-accurate highlight, and it stops exactly at the fragment's end.
  const playRange = useCallback(
    (startWord: number, endWord: number) => {
      speech.stop();
      teardownHd();
      startBrowserRange(startWord, endWord);
    },
    [speech, teardownHd, startBrowserRange]
  );

  const playHd = useCallback(
    async (fromWord: number) => {
      setStatus("loading");
      try {
        const { url, cachedFree } = await generateHdAudio({
          documentId,
          voiceId: hdVoiceId || "",
          text: model.collapsed,
        });

        const audio = new Audio(url);
        audio.playbackRate = speed;
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error("audio load failed"));
        });

        // Duration known → build per-word timings and seek to the start word.
        timingsRef.current = estimateWordTimings(model.words, audio.duration);
        const startTime = timingsRef.current[fromWord] ?? 0;
        audio.currentTime = startTime;

        // Count seconds ONLY on a genuinely fresh generation (never on replays).
        if (!cachedFree && Number.isFinite(audio.duration)) {
          void recordTtsSeconds(audio.duration);
        }

        audio.onended = () => {
          clearRaf();
          setStatus("idle");
          setCurrentWordIndex(0);
        };
        audio.onerror = () => {
          teardownHd();
          setHdError(true);
          onFallback?.();
          startBrowser(fromWord); // never silent
        };

        await audio.play();
        setStatus("playing");
        setCurrentWordIndex(fromWord);
        clearRaf();
        rafRef.current = requestAnimationFrame(tickHd);
      } catch (err) {
        console.warn("[readAloud] HD failed, falling back to browser voice:", err);
        teardownHd();
        setHdError(true);
        onFallback?.();
        startBrowser(fromWord);
      }
    },
    [documentId, hdVoiceId, model, speed, tickHd, teardownHd, startBrowser, onFallback]
  );

  const start = useCallback(
    (fromWord: number) => {
      const useHd = chooseEngine({
        hdRequested,
        hdError,
        browserSupported: speech.supported,
      }) === "hd";
      if (useHd && hdVoiceId) void playHd(fromWord);
      else startBrowser(fromWord);
    },
    [hdRequested, hdError, speech.supported, hdVoiceId, playHd, startBrowser]
  );

  const toggle = useCallback(
    (fromWord?: number) => {
      if (status === "playing") {
        if (engine === "hd") {
          audioRef.current?.pause();
          clearRaf();
        } else {
          speech.pause();
          browserPauseStartRef.current = performance.now();
          clearBrowserRaf();
        }
        setStatus("paused");
        return;
      }
      if (status === "paused") {
        if (engine === "hd" && audioRef.current) {
          void audioRef.current.play();
          rafRef.current = requestAnimationFrame(tickHd);
        } else {
          speech.resume();
          browserPausedAccumRef.current +=
            performance.now() - browserPauseStartRef.current;
          clearBrowserRaf();
          browserRafRef.current = requestAnimationFrame(tickBrowser);
        }
        setStatus("playing");
        return;
      }
      // idle → start fresh
      start(fromWord ?? 0);
    },
    [status, engine, speech, start, tickHd, tickBrowser]
  );

  const seekToWord = useCallback(
    (wordIndex: number) => {
      const clamped = Math.max(0, Math.min(wordIndex, model.words.length - 1));
      if (engine === "hd" && audioRef.current && timingsRef.current.length) {
        audioRef.current.currentTime = timingsRef.current[clamped] ?? 0;
        setCurrentWordIndex(clamped);
        if (status !== "playing") {
          void audioRef.current.play();
          setStatus("playing");
          clearRaf();
          rafRef.current = requestAnimationFrame(tickHd);
        }
      } else {
        // Browser engine can't seek within an utterance — restart from the word.
        speech.stop();
        start(clamped);
      }
    },
    [engine, model.words.length, status, speech, start, tickHd]
  );

  const skipBack = useCallback(() => {
    if (engine === "hd" && audioRef.current) {
      const t = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = t;
      setCurrentWordIndex(timeToWordIndex(timingsRef.current, t));
    } else {
      // Approximate 10s ≈ ~28 words at a calm pace; restart there.
      const target = Math.max(0, currentWordIndex - 28);
      speech.stop();
      start(target);
    }
  }, [engine, currentWordIndex, speech, start]);

  const setSpeed = useCallback(
    (s: number) => {
      setSpeedState(s);
      // HD: apply to the cached clip live — no regeneration.
      if (audioRef.current) audioRef.current.playbackRate = s;
      // Browser: rate can't change mid-utterance; restart at the current word
      // so the new speed takes effect immediately if we're playing.
      if (engine === "browser" && status === "playing") {
        const from = currentWordIndex;
        speech.stop();
        // Defer so the cancel settles before re-speaking.
        setTimeout(() => start(from), 0);
      }
    },
    [engine, status, currentWordIndex, speech, start]
  );

  // Cleanup on TRUE UNMOUNT ONLY. `speech`/`teardownHd` change identity across
  // renders (useSpeech returns a fresh object every render), so listing them
  // here previously re-ran this effect on EVERY render — including each
  // word-boundary event during playback — calling stop()/synth.cancel() and
  // silencing audio the instant it began. Route through a ref + empty deps so
  // it only runs when the component actually unmounts.
  const cleanupRef = useRef<() => void>();
  cleanupRef.current = () => {
    speech.stop();
    teardownHd();
    clearBrowserRaf();
  };
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return {
    status,
    engine,
    currentWordIndex,
    speed,
    setSpeed,
    toggle,
    stop,
    skipBack,
    seekToWord,
    playRange,
    browserSupported: speech.supported,
  };
}

export default useReadAloud;
