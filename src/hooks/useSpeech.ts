import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * useSpeech — FREE on-device text-to-speech via the browser's Web Speech API
 * (`window.speechSynthesis` / `SpeechSynthesisUtterance`).
 *
 * ⚠️ USE THIS BY DEFAULT for LONG-FORM read-aloud / narration / "listen to
 * this article/summary/page" / any text the USER supplies or that is more
 * than ~1,000 characters. It is 100% FREE — zero network, zero OverSkill
 * credits, no platform dependency. The audio is synthesized locally by the
 * user's own device/OS voices.
 *
 * Contrast with `useAiAudio()` (the PAID `/api/ai/audio/*` ElevenLabs path),
 * which bills ~0.5–1 credit PER CHARACTER. Narrating a full page/summary with
 * ElevenLabs can cost thousands of credits (a whole credit pack) in a single
 * tap — DON'T do that for long-form read-aloud. Reserve `useAiAudio()` for:
 *   - short fixed cues / notifications
 *   - generated SOUND EFFECTS / MUSIC (no browser equivalent)
 *   - an explicit user-opt-in "HD / studio voice" upgrade where the credit
 *     cost is shown up front before generating.
 *
 * The typical hybrid pattern is: free `useSpeech()` by default, plus an
 * optional "HD Voice" toggle that routes to `useAiAudio().generateTts(...)`.
 *
 * ─── Gotchas this hook handles for you (all non-negotiable) ─────────────────
 *
 *  • Async voice loading + QUALITY-RANKED default — voices populate lazily; the
 *    underlying `getVoices()` often returns `[]` on first call. We subscribe to
 *    `speechSynthesis.onvoiceschanged` and expose the resolved `voices` list
 *    plus the BEST-quality default voice for the utterance language. We do NOT
 *    blanket-prefer `localService` — on macOS the local voices are the ROBOTIC
 *    "compact" defaults (Alex/Fred/bare-name Samantha), which is exactly why
 *    browser TTS "sounds bad on Mac". Instead we rank: enhanced (Siri /
 *    "(Enhanced)" / "(Premium)" / neural / "Natural") > network (Chrome's
 *    "Google …") > standard > compact. The hook also exposes `voiceQuality`
 *    ('enhanced'|'network'|'standard'|'compact') and, when a Mac user has only
 *    low-quality voices installed, `showEnhancedVoiceTip:true` + a ready-to-
 *    render `enhancedVoiceTip` so the app can nudge the user to download an
 *    Enhanced voice (the hook never renders UI itself).
 *
 *  • Long-text chunking — many engines choke or silently truncate very long
 *    utterances (some cap ~32k chars), and Chrome has a long-standing bug
 *    where a single long utterance stops speaking after ~15 seconds. We split
 *    the text into sentence-ish chunks (~200–500 chars, broken on sentence
 *    boundaries) and speak them sequentially so a full book summary narrates
 *    end-to-end. A periodic `pause()/resume()` keepalive further mitigates the
 *    Chrome 15s cutoff.
 *
 *  • iOS / Safari user-gesture requirement — the FIRST `speak()` must be
 *    triggered from a user gesture (a click/tap). Call `speak()` directly from
 *    your Play button's `onClick` — do NOT kick it off from an effect / timer
 *    / async callback, or iOS Safari will silently refuse to speak.
 *
 *  • Graceful fallback — if `window.speechSynthesis` is unavailable, the hook
 *    NEVER throws; it returns `supported: false` so the UI can hide the free
 *    option and fall back to the paid HD path.
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 * ```tsx
 * function ListenButton({ summary }: { summary: string }) {
 *   const { supported, speaking, paused, speak, pause, resume, stop } = useSpeech();
 *   if (!supported) return null; // fall back to an HD-voice (useAiAudio) button
 *   return (
 *     <div>
 *       {!speaking && <button onClick={() => speak(summary)}>▶︎ Listen</button>}
 *       {speaking && !paused && <button onClick={pause}>⏸ Pause</button>}
 *       {speaking && paused && <button onClick={resume}>▶︎ Resume</button>}
 *       {speaking && <button onClick={stop}>⏹ Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * Read-along highlighting — the `boundary` word-boundary event exposes the
 * current char index of the whole text via `charIndex`:
 * ```tsx
 * const { speak, charIndex } = useSpeech();
 * // highlight text.slice(0, charIndex) as it's spoken
 * ```
 */

export interface SpeakOptions {
  /** Speaking rate 0.1–10, default 1. */
  rate?: number;
  /** Pitch 0–2, default 1. */
  pitch?: number;
  /** Volume 0–1, default 1. */
  volume?: number;
  /** BCP-47 language tag, e.g. 'en-US'. Defaults to the picked voice's lang. */
  lang?: string;
  /**
   * Specific voice to use. Pass a `SpeechSynthesisVoice` (from `voices`) or a
   * voice name/voiceURI string. Omit to use the auto-picked default voice.
   */
  voice?: SpeechSynthesisVoice | string;
  /** Called once when the very first chunk starts speaking. */
  onStart?: () => void;
  /** Called once when all chunks finish (natural end). */
  onEnd?: () => void;
  /** Called on a synthesis error. NEVER throws. */
  onError?: (message: string) => void;
}

export interface UseSpeechOptions {
  /**
   * Max characters per chunk (default 300). Text is split on sentence
   * boundaries as close to this size as possible. Keep in the ~200–500 range —
   * small enough to dodge the Chrome ~15s cutoff, large enough to sound
   * natural.
   */
  maxChunkChars?: number;
  /** Default speaking rate for `speak()` calls that omit one. */
  defaultRate?: number;
  /** Default pitch for `speak()` calls that omit one. */
  defaultPitch?: number;
  /**
   * Enable the Chrome pause()/resume() keepalive that works around the
   * long-utterance ~15s cutoff. Default true. Harmless on other browsers.
   */
  chromeKeepalive?: boolean;
}

export interface UseSpeechResult {
  /** False when `window.speechSynthesis` is unavailable — hide the free UI. */
  supported: boolean;
  /** Resolved list of on-device voices (populates asynchronously). */
  voices: SpeechSynthesisVoice[];
  /**
   * The voice the hook will use by default — the BEST-quality voice available
   * for the browser/OS language (see `pickDefaultVoice`). NOT necessarily a
   * local voice: on macOS a Siri/"(Enhanced)" voice or a Chrome network voice
   * is preferred over the robotic compact defaults.
   */
  defaultVoice: SpeechSynthesisVoice | null;
  /**
   * Quality bucket of `defaultVoice` ('enhanced' | 'network' | 'standard' |
   * 'compact'), or null before voices load. Use it to show a "voice quality"
   * hint or to decide whether to surface the Enhanced-voices tip.
   */
  voiceQuality: VoiceQuality | null;
  /**
   * True ONLY on macOS AND when the best available voice is merely
   * 'compact'/'standard' (no Enhanced/Siri/network voice installed). The
   * consumer should render a subtle, one-time, dismissible tip pointing the
   * user at System Settings to download an Enhanced voice — see
   * `enhancedVoiceTip` for the copy. The hook does NOT render UI (it's a hook);
   * dismiss-persistence is the consumer's job.
   */
  showEnhancedVoiceTip: boolean;
  /** Ready-to-render copy for the Enhanced-voices tip (see `ENHANCED_VOICE_TIP`). */
  enhancedVoiceTip: string;
  /** True while any chunk is being spoken (incl. while paused). */
  speaking: boolean;
  /** True while speech is paused. */
  paused: boolean;
  /**
   * Char index into the ORIGINAL text of the word currently being spoken
   * (from the `boundary` event) — use it for read-along highlighting. 0 when
   * idle.
   */
  charIndex: number;
  /**
   * Start narrating `text`. MUST be called from a user gesture on the first
   * play (iOS/Safari requirement). Cancels any in-progress narration first.
   */
  speak: (text: string, options?: SpeakOptions) => void;
  /** Pause the current narration (resumable). */
  pause: () => void;
  /** Resume a paused narration. */
  resume: () => void;
  /** Stop and clear the queue. Safe to call anytime. */
  stop: () => void;
}

/**
 * Split `text` into sentence-ish chunks no larger than `maxChars`. Breaks on
 * sentence-ending punctuation first, then on whitespace, then hard-splits an
 * over-long token as a last resort. Never returns empty chunks.
 */
export function chunkText(text: string, maxChars = 300): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  // Split into sentences (keep the terminating punctuation).
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const t = current.trim();
    if (t) chunks.push(t);
    current = '';
  };

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    if (sentence.length > maxChars) {
      // A single sentence longer than the cap — flush what we have, then
      // break the long sentence on word boundaries.
      pushCurrent();
      let word = '';
      for (const token of sentence.split(/\s+/)) {
        if (token.length > maxChars) {
          // Pathological token (e.g. a giant URL) — hard-split it.
          if (word.trim()) {
            chunks.push(word.trim());
            word = '';
          }
          for (let i = 0; i < token.length; i += maxChars) {
            chunks.push(token.slice(i, i + maxChars));
          }
          continue;
        }
        if ((word + ' ' + token).trim().length > maxChars) {
          if (word.trim()) chunks.push(word.trim());
          word = token;
        } else {
          word = word ? `${word} ${token}` : token;
        }
      }
      if (word.trim()) chunks.push(word.trim());
      continue;
    }

    if ((current + ' ' + sentence).trim().length > maxChars) {
      pushCurrent();
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  pushCurrent();

  return chunks.filter((c) => c.length > 0);
}

/**
 * A coarse quality bucket for a synthesized voice, best → worst:
 *
 *  • 'enhanced' — a genuinely high-quality neural/premium voice. On macOS these
 *    are the "(Enhanced)" / "(Premium)" downloads and the Siri voices; on
 *    Windows Edge these are the free Azure "Natural" / neural voices. This is
 *    what you WANT for narration.
 *  • 'network'  — a non-local (network) voice, e.g. Chrome's "Google US English".
 *    These are usually noticeably better than the OS compact defaults.
 *  • 'compact'  — the low-quality, robotic on-device defaults macOS ships with
 *    and selects by DEFAULT (Alex, Fred, and the bare-name "Samantha"/"Victoria"
 *    compact variants). This is the thing that makes browser TTS "sound bad on
 *    Mac". We AVOID these unless nothing better exists.
 *  • 'standard' — any other named local voice that isn't obviously one of the
 *    known-bad compact defaults. Acceptable, but we still prefer enhanced/network.
 */
export type VoiceQuality = 'enhanced' | 'network' | 'standard' | 'compact';

// High-quality voice NAME patterns. macOS: "(Enhanced)", "(Premium)", Siri.
// Windows/Edge: free Azure "Natural" / neural voices. Chrome sometimes labels
// its better voices "Natural" too.
const ENHANCED_NAME = /(\bsiri\b|\(enhanced\)|\(premium\)|neural|natural)/i;

// Known-BAD macOS compact/robotic defaults — the ones the browser picks by
// default and that Todd (correctly) calls "so bad". Bare-name (no "(Enhanced)")
// Samantha/Victoria/etc. are the compact builds; Alex/Fred/Albert/etc. are the
// classic robotic voices. These are demoted to last resort.
const COMPACT_NAME =
  /^(alex|fred|albert|bad news|bahh|bells|boing|bruce|bubbles|cellos|deranged|good news|hysterical|junior|kathy|pipe organ|princess|ralph|trinoids|whisper|zarvox|agnes|vicki)\b/i;
const BARE_COMPACT_NAME =
  /^(samantha|victoria|daniel|karen|moira|tessa|fiona|veena|rishi|serena|tom|allison|ava|nathan|susan)$/i;

/**
 * Classify a single voice into a quality bucket. Uses the voice NAME (the only
 * reliable cross-browser signal for "enhanced/neural") plus `localService`
 * (a network voice usually beats an OS compact voice) to decide.
 */
export function classifyVoiceQuality(voice: SpeechSynthesisVoice): VoiceQuality {
  const name = voice?.name || '';
  if (ENHANCED_NAME.test(name)) return 'enhanced';
  // A network voice (localService === false) is generally better than a local
  // compact default — Chrome's "Google …" voices are the common example.
  if (voice && voice.localService === false) return 'network';
  if (COMPACT_NAME.test(name) || BARE_COMPACT_NAME.test(name)) return 'compact';
  return 'standard';
}

const QUALITY_RANK: Record<VoiceQuality, number> = {
  enhanced: 3,
  network: 2,
  standard: 1,
  compact: 0,
};

/**
 * Pick the BEST-quality default voice for the given language.
 *
 * ⚠️ This deliberately does NOT blanket-prefer `localService` — on macOS the
 * local voices are the ROBOTIC compact defaults, so preferring them is exactly
 * why browser TTS "sounds bad on Mac". Instead we QUALITY-RANK candidates:
 *   1. enhanced (Siri / "(Enhanced)" / "(Premium)" / neural / natural)
 *   2. network  (non-local voices, e.g. Chrome's "Google …")
 *   3. standard (other named modern local voices)
 *   4. compact  (Alex/Fred/bare-name Samantha — last resort)
 *
 * We first restrict to voices matching the utterance language (exact tag, then
 * base-language prefix), rank WITHIN that set, and only if the language has no
 * voices at all do we fall back to the globally-best voice.
 */
export function pickDefaultVoice(
  voices: SpeechSynthesisVoice[],
  lang?: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const target = (lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US').toLowerCase();
  const base = target.split('-')[0];

  // Best of a candidate set: highest quality bucket wins; ties broken by
  // preferring an exact language-tag match, then the voice flagged `default`,
  // then original discovery order (stable).
  const bestOf = (candidates: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (candidates.length === 0) return null;
    let best = candidates[0];
    let bestScore = -1;
    for (const v of candidates) {
      const vLang = (v.lang || '').toLowerCase();
      const score =
        QUALITY_RANK[classifyVoiceQuality(v)] * 10 +
        (vLang === target ? 2 : 0) +
        (v.default ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  };

  // Prefer voices in the requested base language (covers en-US, en-GB, …).
  const inLang = voices.filter((v) => (v.lang || '').toLowerCase().startsWith(base));
  const inLangBest = bestOf(inLang);
  if (inLangBest) return inLangBest;

  // No voice for this language at all → return the globally best voice so the
  // user still hears SOMETHING (never null when voices exist).
  return bestOf(voices);
}

/**
 * The quality bucket of the voice `pickDefaultVoice` would choose for `lang`.
 * Consumers use this to (a) show a "voice quality" hint and (b) decide whether
 * to surface the "enable Enhanced voices" tip (see `shouldShowEnhancedVoiceTip`).
 */
export function defaultVoiceQuality(
  voices: SpeechSynthesisVoice[],
  lang?: string
): VoiceQuality | null {
  const v = pickDefaultVoice(voices, lang);
  return v ? classifyVoiceQuality(v) : null;
}

/**
 * True when the on-device voice list has at least one voice matching `lang`
 * (by base-language prefix, e.g. "da" matches "da-DK"). Callers MUST guard on
 * `voices.length > 0` before treating a false result as "no voice installed",
 * since voices load asynchronously (an empty list returns false).
 */
export function hasVoiceForLang(voices: SpeechSynthesisVoice[], lang?: string): boolean {
  if (!voices || voices.length === 0) return false;
  const base = (lang || 'en').toLowerCase().split('-')[0];
  return voices.some((v) => (v.lang || '').toLowerCase().startsWith(base));
}

/** True when the current platform is macOS (used to gate the Enhanced-voices tip). */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const plat = (navigator.platform || '') + ' ' + (navigator.userAgent || '');
  // Match "Mac" but NOT iOS (iPhone/iPad) — iOS voice management is different
  // and the "System Settings → Accessibility" instructions don't apply there.
  return /mac/i.test(plat) && !/(iphone|ipad|ipod)/i.test(plat);
}

/**
 * The subtle, one-time tip to render when a Mac user has only low-quality
 * voices installed. Exposed as a constant so the APP/template renders the UI —
 * the hook never renders (it's a hook). Persistence of "dismissed" is the
 * consumer's responsibility.
 */
export const ENHANCED_VOICE_TIP =
  'For much better narration, enable Enhanced voices: System Settings → ' +
  'Accessibility → Spoken Content → System Voice → download an Enhanced or ' +
  'Premium voice (e.g. "Samantha (Enhanced)").';

/**
 * Should the consumer surface the "enable Enhanced voices" tip?
 *
 * Only true when BOTH:
 *  (a) we're on macOS, AND
 *  (b) the best voice we could pick is only 'compact' or 'standard' quality
 *      (i.e. NO enhanced/Siri/premium AND no network voice is available).
 *
 * This gates the nudge so we don't nag users who already have good voices.
 */
export function shouldShowEnhancedVoiceTip(
  voices: SpeechSynthesisVoice[],
  lang?: string,
  isMac: boolean = isMacPlatform()
): boolean {
  if (!isMac) return false;
  if (!voices || voices.length === 0) return false;
  const q = defaultVoiceQuality(voices, lang);
  return q === 'compact' || q === 'standard';
}

function resolveVoice(
  wanted: SpeechSynthesisVoice | string | undefined,
  voices: SpeechSynthesisVoice[],
  fallback: SpeechSynthesisVoice | null
): SpeechSynthesisVoice | null {
  if (!wanted) return fallback;
  if (typeof wanted !== 'string') return wanted;
  const byURI = voices.find((v) => v.voiceURI === wanted);
  if (byURI) return byURI;
  const byName = voices.find((v) => v.name === wanted);
  return byName || fallback;
}

// ─── Framework-agnostic engine ──────────────────────────────────────────────
// All the imperative narration logic (chunking, sequential queueing, keepalive,
// pause/resume/stop) lives here so it can be unit-tested WITHOUT a React
// renderer. `useSpeech()` is a thin React wrapper over this. The engine takes
// its `speechSynthesis`, `SpeechSynthesisUtterance`, and timer functions by
// injection so tests can supply fakes.

export interface SpeechEngineDeps {
  synth: SpeechSynthesis;
  Utterance: typeof SpeechSynthesisUtterance;
  setInterval?: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearInterval?: (id: ReturnType<typeof setInterval>) => void;
  navigatorLang?: string;
}

export interface SpeechEngineConfig {
  maxChunkChars: number;
  defaultRate: number;
  defaultPitch: number;
  chromeKeepalive: boolean;
  /** Emits state changes so a consumer (the hook) can re-render. */
  onState?: (state: { speaking: boolean; paused: boolean; charIndex: number }) => void;
  getVoices: () => SpeechSynthesisVoice[];
  getDefaultVoice: () => SpeechSynthesisVoice | null;
}

export interface SpeechEngine {
  speak: (text: string, options?: SpeakOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function createSpeechEngine(
  deps: SpeechEngineDeps,
  config: SpeechEngineConfig
): SpeechEngine {
  const { synth, Utterance } = deps;
  const setIntervalFn = deps.setInterval || ((fn, ms) => setInterval(fn, ms));
  const clearIntervalFn = deps.clearInterval || ((id) => clearInterval(id));
  const navLang =
    deps.navigatorLang ||
    (typeof navigator !== 'undefined' ? navigator.language : 'en-US') ||
    'en-US';

  let chunks: string[] = [];
  let offsets: number[] = [];
  let index = 0;
  let opts: SpeakOptions = {};
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  // Chrome/Chromium GC bug: a SpeechSynthesisUtterance with NO JS-side
  // reference can be garbage-collected WHILE it is still speaking — the audio
  // stops after ~the first word/boundary and `onend` never fires, so the chunk
  // chain freezes on word one (exactly the "highlights one word, then freezes,
  // speechSynthesis.speaking is false" symptom). Holding the active utterance
  // on this closure variable — retained for the engine's whole lifetime via
  // engineRef — keeps a STRONG JS reference to the utterance AND its
  // onboundary/onend/onerror handlers so Chrome can't collect it mid-speech.
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  // Silent-start watchdog. On some setups synth.speak() resolves without error
  // but produces NO audio and never fires onstart/onboundary — classically a
  // voice/lang mismatch (e.g. a Danish default voice reading English text) or
  // Chrome stuck in an internal paused state. We arm a watchdog on the first
  // chunk: if nothing audible happens in time we do ONE clean retry, and if
  // that also stays silent we report 'no-audio' so the caller can react.
  let audible = false;
  let retried = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const clearWatchdog = () => {
    if (watchdog != null) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  };

  const emit = (speaking: boolean, paused: boolean, charIndex: number) =>
    config.onState?.({ speaking, paused, charIndex });

  const clearKeepalive = () => {
    if (keepalive != null) {
      clearIntervalFn(keepalive);
      keepalive = null;
    }
  };

  // Progress/stall watchdog. Some browser voices (notably Chrome's network
  // voices for non-English languages like Danish) speak ONE word, fire a single
  // `boundary`, then silently stall — `onend` never fires so the chunk chain
  // freezes on word one. Armed on every `boundary`; if the next boundary/end
  // doesn't arrive within STALL_MS while still speaking, we report 'stalled' so
  // the caller can warn or switch to a voice that handles the language. Voices
  // that never fire boundaries never arm this, so they can't false-positive.
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let pausedFlag = false;
  const STALL_MS = 6000;

  const clearStall = () => {
    if (stallTimer != null) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  };

  const armStall = () => {
    clearStall();
    stallTimer = setTimeout(() => {
      if (cancelled || pausedFlag || index >= chunks.length) return;
      // We were receiving boundaries, then they stopped with no onend — the
      // utterance has frozen mid-chunk. Halt cleanly and surface 'stalled'.
      cancelled = true;
      clearKeepalive();
      clearStall();
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
      emit(false, false, 0);
      opts.onError?.('stalled');
    }, STALL_MS);
  };

  const stop = () => {
    cancelled = true;
    pausedFlag = false;
    clearKeepalive();
    clearWatchdog();
    clearStall();
    chunks = [];
    offsets = [];
    index = 0;
    currentUtterance = null;
    try {
      synth.cancel();
    } catch {
      /* never throw */
    }
    emit(false, false, 0);
  };

  // Pick the voice that best MATCHES the utterance language. A voice/lang
  // mismatch is a common cause of totally silent Chrome speech, so when no
  // explicit voice is given we choose the best voice for opts.lang rather than
  // the locale default (which on a Danish machine would pick a Danish voice
  // even for English text → silence).
  const pickVoice = (): SpeechSynthesisVoice | null => {
    const voices = config.getVoices();
    const explicit = resolveVoice(opts.voice, voices, null);
    if (explicit) return explicit;
    const byLang = pickDefaultVoice(voices, opts.lang);
    return byLang || config.getDefaultVoice();
  };

  function speakChunk() {
    if (cancelled || index >= chunks.length) {
      clearKeepalive();
      clearWatchdog();
      clearStall();
      currentUtterance = null;
      if (!cancelled && index >= chunks.length && chunks.length > 0) {
        emit(false, false, 0);
        opts.onEnd?.();
      }
      return;
    }

    const utter = new Utterance(chunks[index]);
    // Retain the utterance (and its handlers) on the engine closure so Chrome
    // can't GC it mid-speech — see `currentUtterance` above. This is the fix
    // for the "one word then freeze" bug.
    currentUtterance = utter;
    utter.rate = opts.rate ?? config.defaultRate;
    utter.pitch = opts.pitch ?? config.defaultPitch;
    utter.volume = opts.volume ?? 1;

    const voice = pickVoice();
    if (voice) utter.voice = voice;
    // Keep lang CONSISTENT with the chosen voice to avoid the silent
    // voice/lang-mismatch bug; prefer the voice's own lang when we have one.
    utter.lang = voice?.lang || opts.lang || navLang;

    const chunkStart = offsets[index] ?? 0;

    utter.onstart = () => {
      audible = true;
      clearWatchdog();
    };
    utter.onboundary = (ev: SpeechSynthesisEvent) => {
      audible = true;
      armStall(); // reset the stall watchdog on every word boundary
      if (typeof ev.charIndex === 'number') emit(true, false, chunkStart + ev.charIndex);
    };
    utter.onend = () => {
      clearStall();
      if (cancelled) return;
      index += 1;
      // Subsequent chunks don't need the watchdog — audio is confirmed working.
      speakChunk();
    };
    utter.onerror = (ev: SpeechSynthesisErrorEvent) => {
      const err = ev.error;
      if (err && err !== 'interrupted' && err !== 'canceled') {
        clearKeepalive();
        clearWatchdog();
        clearStall();
        emit(false, false, 0);
        opts.onError?.(String(err));
      }
    };

    if (index === 0) opts.onStart?.();

    try {
      // Chrome can get stuck in an internal paused state (e.g. after a prior
      // keepalive pause/resume or a cancel), which makes speak() silent. A
      // resume() before speaking clears that state and is harmless otherwise.
      try {
        synth.resume();
      } catch {
        /* ignore */
      }
      synth.speak(utter);
      // Arm the silent-start watchdog only for the very first chunk.
      if (index === 0) {
        clearWatchdog();
        watchdog = setTimeout(() => {
          if (cancelled || audible) return;
          let speakingNow = false;
          try {
            speakingNow = !!synth.speaking;
          } catch {
            /* ignore */
          }
          if (audible || speakingNow) return;
          if (!retried) {
            // One clean retry: cancel, kick the engine out of any stuck state,
            // and re-speak the current chunk from scratch.
            retried = true;
            try {
              synth.cancel();
            } catch {
              /* ignore */
            }
            try {
              synth.resume();
            } catch {
              /* ignore */
            }
            setTimeout(() => {
              if (!cancelled) speakChunk();
            }, 60);
          } else {
            // Still silent after a retry — surface it so the caller can react.
            clearKeepalive();
            clearWatchdog();
            clearStall();
            emit(false, false, 0);
            opts.onError?.('no-audio');
          }
        }, 1400);
      }
    } catch (e) {
      clearKeepalive();
      clearWatchdog();
      clearStall();
      emit(false, false, 0);
      opts.onError?.(e instanceof Error ? e.message : 'speech synthesis failed');
    }
  }

  const speak = (text: string, spokenOptions: SpeakOptions = {}) => {
    const parts = chunkText(text, config.maxChunkChars);
    if (parts.length === 0) return;

    cancelled = false;
    audible = false;
    retried = false;
    pausedFlag = false;
    clearKeepalive();
    clearWatchdog();
    clearStall();

    // Chrome (and Chromium/Edge) have a long-standing bug: calling
    // synth.cancel() and then synth.speak() in the SAME tick frequently leaves
    // the synthesizer silent — the classic "Play does nothing the first time"
    // symptom. So:
    //   • If nothing is playing/queued, DON'T cancel at all. This lets the very
    //     first press speak synchronously inside the click gesture (which
    //     iOS/Safari REQUIRES) with no cancel-race.
    //   • If something IS in progress, cancel it and defer the new utterance a
    //     beat so cancel() fully settles before speak() runs.
    const wasActive = !!(synth.speaking || synth.pending);
    if (wasActive) {
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
    }

    const collapsed = (text || '').replace(/\s+/g, ' ').trim();
    const nextOffsets: number[] = [];
    let running = 0;
    for (const c of parts) {
      const at = collapsed.indexOf(c, running);
      const pos = at >= 0 ? at : running;
      nextOffsets.push(pos);
      running = pos + c.length;
    }

    chunks = parts;
    offsets = nextOffsets;
    index = 0;
    opts = spokenOptions;

    emit(true, false, 0);

    if (config.chromeKeepalive) {
      keepalive = setIntervalFn(() => {
        if (cancelled) return;
        try {
          if (synth.speaking && !synth.paused) {
            synth.pause();
            synth.resume();
          }
        } catch {
          /* ignore */
        }
      }, 10000);
    }

    if (wasActive) {
      // Give the interrupting cancel() a beat to settle before speaking,
      // dodging the Chrome cancel→speak silent-race.
      setTimeout(() => {
        if (!cancelled) speakChunk();
      }, 140);
    } else {
      // First/idle play — speak immediately inside the user gesture.
      speakChunk();
    }
  };

  const pause = () => {
    try {
      pausedFlag = true;
      clearStall();
      synth.pause();
      emit(true, true, -1);
    } catch {
      /* ignore */
    }
  };

  const resume = () => {
    try {
      pausedFlag = false;
      synth.resume();
      armStall();
      emit(true, false, -1);
    } catch {
      /* ignore */
    }
  };

  return { speak, pause, resume, stop };
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechResult {
  const {
    maxChunkChars = 300,
    defaultRate = 1,
    defaultPitch = 1,
    chromeKeepalive = true,
  } = options;

  const supported =
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [defaultVoice, setDefaultVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceQuality, setVoiceQuality] = useState<VoiceQuality | null>(null);
  const [showEnhancedVoiceTip, setShowEnhancedVoiceTip] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  // Latest voice/default readable from the engine's callbacks without
  // re-creating the engine on every voice update.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const defaultVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  voicesRef.current = voices;
  defaultVoiceRef.current = defaultVoice;

  const engineRef = useRef<SpeechEngine | null>(null);

  // A speak() requested BEFORE on-device voices finished loading. Desktop
  // Chrome/Edge return an empty getVoices() on the first call, and
  // synth.speak() with no voice loaded is SILENT — the "press Play, hear
  // nothing, works on the 2nd press" bug. We stash the request here and flush
  // it the moment voices arrive.
  const pendingSpeakRef = useRef<{ text: string; options: SpeakOptions } | null>(null);

  // ── Async voice loading ──────────────────────────────────────────────────
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const load = () => {
      const list = synth.getVoices();
      if (list && list.length) {
        setVoices(list);
        // Re-run the quality ranking every time voices populate/change (they
        // arrive lazily via onvoiceschanged, and enhanced voices sometimes
        // register a beat AFTER the compact defaults). We recompute the best
        // voice + its quality + the tip signal so the UI upgrades in place.
        const best = pickDefaultVoice(list);
        setDefaultVoice((prev) => prev || best);
        setVoiceQuality(best ? classifyVoiceQuality(best) : null);
        setShowEnhancedVoiceTip(shouldShowEnhancedVoiceTip(list));

        // Voices are ready now — flush a Play that fired before they loaded so
        // the first tap actually produces sound (no need to press twice).
        const pending = pendingSpeakRef.current;
        if (pending && engineRef.current) {
          pendingSpeakRef.current = null;
          // Update the refs synchronously so the engine's getVoices()/
          // getDefaultVoice() see the freshly-loaded list on THIS speak (the
          // React state setters above won't have re-rendered yet).
          voicesRef.current = list;
          if (!defaultVoiceRef.current) defaultVoiceRef.current = best;
          engineRef.current.speak(pending.text, pending.options);
        }
      }
    };

    load(); // some browsers have them ready synchronously
    synth.addEventListener?.('voiceschanged', load);
    // Fallback for browsers that only expose the on* property.
    const prevHandler = synth.onvoiceschanged;
    synth.onvoiceschanged = load;

    return () => {
      synth.removeEventListener?.('voiceschanged', load);
      synth.onvoiceschanged = prevHandler || null;
    };
  }, [supported]);

  // One engine per mount, wired to React state via onState.
  useEffect(() => {
    if (!supported) {
      engineRef.current = null;
      return;
    }
    engineRef.current = createSpeechEngine(
      {
        synth: window.speechSynthesis,
        Utterance: window.SpeechSynthesisUtterance,
      },
      {
        maxChunkChars,
        defaultRate,
        defaultPitch,
        chromeKeepalive,
        getVoices: () => voicesRef.current,
        getDefaultVoice: () => defaultVoiceRef.current,
        onState: ({ speaking: s, paused: p, charIndex: ci }) => {
          setSpeaking(s);
          setPaused(p);
          // charIndex === -1 is the engine's "leave charIndex unchanged" signal
          // (emitted by pause/resume). Only update on a real index.
          if (ci >= 0) setCharIndex(ci);
        },
      }
    );
    const engine = engineRef.current;
    // Cancel any in-flight speech on unmount so navigating away stops audio.
    return () => {
      engine?.stop();
      engineRef.current = null;
    };
  }, [supported, maxChunkChars, defaultRate, defaultPitch, chromeKeepalive]);

  const speak = useCallback(
    (text: string, spokenOptions: SpeakOptions = {}) => {
      if (!supported || !engineRef.current) {
        // NEVER throw — callers should gate on `supported`.
        spokenOptions.onError?.('speechSynthesis is not supported in this browser');
        return;
      }

      // Voices race: if the on-device voice list hasn't populated yet, speaking
      // now is silent on Chromium. Queue the request; it's flushed by the
      // voice-loading effect when `onvoiceschanged` fires. A short timeout
      // fallback covers browsers that never emit the event but do have voices a
      // moment later. (iOS/Safari populate voices synchronously AND enforce the
      // gesture requirement, so `haveVoices` is already true there and we speak
      // immediately inside the tap — this defer only affects desktop Chromium,
      // which has no gesture requirement.)
      const haveVoices = voicesRef.current && voicesRef.current.length > 0;
      if (!haveVoices) {
        pendingSpeakRef.current = { text, options: spokenOptions };
        window.setTimeout(() => {
          const pending = pendingSpeakRef.current;
          if (!pending || !engineRef.current) return;
          pendingSpeakRef.current = null;
          const list = window.speechSynthesis.getVoices();
          if (list && list.length) {
            voicesRef.current = list;
            if (!defaultVoiceRef.current) defaultVoiceRef.current = pickDefaultVoice(list);
          }
          engineRef.current.speak(pending.text, pending.options);
        }, 250);
        return;
      }

      engineRef.current.speak(text, spokenOptions);
    },
    [supported]
  );

  const pause = useCallback(() => engineRef.current?.pause(), []);
  const resume = useCallback(() => engineRef.current?.resume(), []);
  const stop = useCallback(() => {
    // Drop any queued (not-yet-flushed) speak so an explicit stop can't be
    // overtaken by a pending utterance once voices load.
    pendingSpeakRef.current = null;
    engineRef.current?.stop();
  }, []);

  return useMemo(
    () => ({
      supported,
      voices,
      defaultVoice,
      voiceQuality,
      showEnhancedVoiceTip,
      enhancedVoiceTip: ENHANCED_VOICE_TIP,
      speaking,
      paused,
      charIndex,
      speak,
      pause,
      resume,
      stop,
    }),
    [
      supported,
      voices,
      defaultVoice,
      voiceQuality,
      showEnhancedVoiceTip,
      speaking,
      paused,
      charIndex,
      speak,
      pause,
      resume,
      stop,
    ]
  );
}

export default useSpeech;
