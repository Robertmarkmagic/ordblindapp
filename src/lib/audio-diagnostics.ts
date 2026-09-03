/**
 * audio-diagnostics — real, in-browser checks that explain WHY the Listen
 * button might be silent. Pure functions (no React) so they're easy to reason
 * about and reuse. Every check degrades gracefully and NEVER throws.
 *
 * These map to the actual silent-audio causes for on-device Web Speech TTS:
 *  1. Browser has no speechSynthesis at all (rare — very old/embedded browsers).
 *  2. No voices installed / loaded for the reading language.
 *  3. The AudioContext is "suspended" (needs a user gesture to make sound).
 *  4. No audio output device (no speakers/headphones connected).
 *  5. System/tab volume muted (we can only *hint* at this — the OS volume is
 *     not readable from the browser — so we surface it as a suggestion).
 */
import {
  pickDefaultVoice,
  classifyVoiceQuality,
  isMacPlatform,
  ENHANCED_VOICE_TIP,
  type VoiceQuality,
} from "@/hooks/useSpeech";

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

export interface DiagnosticCheck {
  id: string;
  /** Short, plain-language label for the row. */
  label: string;
  status: CheckStatus;
  /** One calm sentence describing what we found. */
  detail: string;
  /** Optional concrete fix suggestion shown when status is warn/fail. */
  suggestion?: string;
}

export interface AudioDiagnostics {
  checks: DiagnosticCheck[];
  /** True when nothing blocks audio (everything pass, warns allowed). */
  overallOk: boolean;
  /** The single most likely reason for silence, in plain language. */
  headline: string;
}

/** True when the Web Speech API exists in this browser. */
export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Fetch on-device voices, waiting briefly for the async list to populate
 * (Chrome/Edge return [] on the first synchronous call). Resolves with whatever
 * is available after `timeoutMs`.
 */
export function getVoicesAsync(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!speechSupported()) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const immediate = synth.getVoices();
    if (immediate && immediate.length) {
      resolve(immediate);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.("voiceschanged", onChange);
      resolve(synth.getVoices() || []);
    };
    const onChange = () => finish();
    synth.addEventListener?.("voiceschanged", onChange);
    window.setTimeout(finish, timeoutMs);
  });
}

/** Count audio OUTPUT devices (speakers/headphones). -1 when undetectable. */
export async function countAudioOutputs(): Promise<number> {
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return -1;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((d) => d.kind === "audiooutput");
    // Some browsers hide audiooutput entirely (Firefox) — treat as undetectable
    // rather than "no speakers", to avoid a false alarm.
    if (outputs.length === 0 && !devices.some((d) => d.kind === "audiooutput")) {
      return -1;
    }
    return outputs.length;
  } catch {
    return -1;
  }
}

type AC = typeof AudioContext;
function getAudioContextCtor(): AC | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AC; webkitAudioContext?: AC };
  return w.AudioContext || w.webkitAudioContext || null;
}

/** Whether an AudioContext can be created and its current state. */
export function inspectAudioContext(): { supported: boolean; state: string | null } {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return { supported: false, state: null };
  try {
    const ctx = new Ctor();
    const state = ctx.state;
    // Close asynchronously; we only needed the state snapshot.
    ctx.close?.().catch(() => {});
    return { supported: true, state };
  } catch {
    return { supported: false, state: null };
  }
}

/**
 * Play a short, gentle test tone through the Web Audio API. Returns true if the
 * tone started (audio pipeline is alive). MUST be called from a user gesture so
 * the AudioContext can resume. Never throws.
 */
export async function playTestTone(durationMs = 550): Promise<boolean> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return false;
  try {
    const ctx = new Ctor();
    if (ctx.state === "suspended" && ctx.resume) {
      await ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440; // gentle A4
    // Soft attack/release so it's a calm chime, not a harsh beep.
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
    osc.onended = () => ctx.close?.().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * The single most important audio check: actually SPEAK a one-word probe and
 * require the browser voice to START. This replaces the old "everything green"
 * fiction that told users the fault was their own device while Play produced no
 * sound. Resolves { started, error }:
 *   • started:true       — onstart fired (the reader engine actually works).
 *   • error:"no-voices"  — no on-device voices are loaded yet.
 *   • error:"no-start"   — nothing happened within `timeoutMs` (the freeze bug,
 *     or a first user gesture is still required on iOS/Safari).
 *   • error:<other>      — the engine reported an explicit synthesis error.
 * Never throws. The probe utterance is held on a local variable until we settle
 * so Chrome can't garbage-collect it (and its onstart handler) mid-probe — the
 * same GC guard the reader engine now uses.
 */
export async function probeSpeechStart(
  lang: "en" | "da" = "en",
  timeoutMs = 2200
): Promise<{ started: boolean; error: string | null }> {
  if (!speechSupported()) return { started: false, error: "no-speech-api" };
  const voices = await getVoicesAsync();
  if (!voices.length) return { started: false, error: "no-voices" };

  const synth = window.speechSynthesis;
  return new Promise((resolve) => {
    let settled = false;
    // Held here (not just handed to synth.speak) so V8 keeps a strong JS
    // reference to the utterance + its handlers for the whole probe window.
    let probe: SpeechSynthesisUtterance | null = new window.SpeechSynthesisUtterance("test");
    const base = lang === "da" ? "da" : "en";
    const voice = pickDefaultVoice(voices, base === "da" ? "da-DK" : "en-US");
    if (voice) probe.voice = voice;
    probe.lang = voice?.lang || (base === "da" ? "da-DK" : "en-US");
    probe.rate = 1;
    probe.volume = 1;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (started: boolean, error: string | null) => {
      if (settled) return;
      settled = true;
      if (timer != null) clearTimeout(timer);
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
      probe = null;
      resolve({ started, error });
    };

    probe.onstart = () => finish(true, null);
    probe.onerror = (ev: SpeechSynthesisErrorEvent) => {
      const err = ev.error;
      // Our own finish()/cancel() emits interrupted/canceled — not a real fault.
      if (err === "interrupted" || err === "canceled") return;
      finish(false, String(err || "speech-error"));
    };

    timer = setTimeout(() => finish(false, "no-start"), timeoutMs);

    try {
      // Chrome can get stuck in an internal paused state; a resume() first
      // clears it and is harmless otherwise.
      try {
        synth.resume();
      } catch {
        /* ignore */
      }
      synth.speak(probe);
    } catch (e) {
      finish(false, e instanceof Error ? e.message : "speak-threw");
    }
  });
}

/**
 * Build the full diagnostic report from the current environment. `lang` is the
 * reader's reading language ('en'|'da') so we can check for a matching voice.
 */
export async function runAudioDiagnostics(lang: "en" | "da" = "en"): Promise<AudioDiagnostics> {
  const checks: DiagnosticCheck[] = [];

  // 1. Web Speech support
  const supported = speechSupported();
  checks.push(
    supported
      ? {
          id: "speech-support",
          label: "Read-aloud engine",
          status: "pass",
          detail: "Your browser supports built-in text-to-speech.",
        }
      : {
          id: "speech-support",
          label: "Read-aloud engine",
          status: "fail",
          detail: "This browser doesn't include a built-in read-aloud voice.",
          suggestion:
            "Try Chrome, Edge, or Safari — they include speech built in. Or switch to a Natural voice from the voice menu, which doesn't rely on your browser.",
        }
  );

  // 2. Voice availability (only meaningful if supported)
  let voices: SpeechSynthesisVoice[] = [];
  if (supported) {
    voices = await getVoicesAsync();
    const base = lang === "da" ? "da" : "en";
    const langVoices = voices.filter((v) => (v.lang || "").toLowerCase().startsWith(base));
    const best = pickDefaultVoice(voices, base === "da" ? "da-DK" : "en-US");
    const quality: VoiceQuality | null = best ? classifyVoiceQuality(best) : null;

    if (voices.length === 0) {
      checks.push({
        id: "voices",
        label: "Installed voices",
        status: "fail",
        detail: "No speech voices have loaded yet.",
        suggestion:
          "Press Play once more — voices often load a moment after the page opens. If it's still silent, restart your browser, or pick a Natural voice from the voice menu.",
      });
    } else if (langVoices.length === 0) {
      checks.push({
        id: "voices",
        label: "Installed voices",
        status: "warn",
        detail: `No ${base === "da" ? "Danish" : "English"} voice is installed, so a different-language voice may be used.`,
        suggestion:
          base === "da"
            ? "Add a Danish voice in your system settings, or choose a Natural voice — it reads Danish clearly without any setup."
            : "Choose a Natural voice from the voice menu for reliable English narration.",
      });
    } else if (quality === "compact" || quality === "standard") {
      checks.push({
        id: "voices",
        label: "Installed voices",
        status: "warn",
        detail: `${langVoices.length} voice${langVoices.length === 1 ? "" : "s"} found, but only a basic-quality one.`,
        suggestion: isMacPlatform()
          ? ENHANCED_VOICE_TIP
          : "For warmer narration, switch to a Natural voice from the voice menu.",
      });
    } else {
      checks.push({
        id: "voices",
        label: "Installed voices",
        status: "pass",
        detail: `${langVoices.length} ${base === "da" ? "Danish" : "English"} voice${langVoices.length === 1 ? "" : "s"} ready.`,
      });
    }

    // 2b. REAL functional test — actually try to speak and assert the voice
    // STARTS within ~2s. This is the check that used to be missing: the panel
    // reported everything green while Play produced no sound. Now a dead reader
    // shows a clear failure here instead of blaming the user's device.
    const probe = await probeSpeechStart(lang);
    if (probe.started) {
      checks.push({
        id: "voice-start",
        label: "Reading voice test",
        status: "pass",
        detail: "We spoke a quick test and the reading voice started correctly.",
      });
    } else if (probe.error === "no-voices") {
      checks.push({
        id: "voice-start",
        label: "Reading voice test",
        status: "fail",
        detail: "The reading voice couldn't start because no voices are ready yet.",
        suggestion:
          "Wait a moment and run the checks again, or switch to a Natural voice — it reads without relying on your browser's built-in voices.",
      });
    } else if (probe.error === "no-start") {
      checks.push({
        id: "voice-start",
        label: "Reading voice test",
        status: "fail",
        detail: "The reading voice didn't start within 2 seconds — this is the same thing that stops Play.",
        suggestion:
          "First tap “Play a test sound” below (that also wakes audio on iPhone/iPad), then run the checks again. If it still won't start, switch to a Natural voice, which doesn't depend on your browser's voices.",
      });
    } else {
      checks.push({
        id: "voice-start",
        label: "Reading voice test",
        status: "fail",
        detail: "The reading voice reported a problem starting.",
        suggestion:
          "Try switching to a Natural voice, which reads reliably without your browser's built-in voices.",
      });
    }
  }

  // 3. AudioContext state (gesture requirement)
  const ac = inspectAudioContext();
  if (!ac.supported) {
    checks.push({
      id: "audio-context",
      label: "Audio output pipeline",
      status: "unknown",
      detail: "We couldn't inspect the audio pipeline in this browser.",
    });
  } else if (ac.state === "suspended") {
    checks.push({
      id: "audio-context",
      label: "Audio output pipeline",
      status: "warn",
      detail: "Audio is waiting for a tap before it can make sound.",
      suggestion:
        "Tap the “Play a test sound” button below — a single tap wakes the audio, then Play will work.",
    });
  } else {
    checks.push({
      id: "audio-context",
      label: "Audio output pipeline",
      status: "pass",
      detail: "The audio pipeline is active and ready.",
    });
  }

  // 4. Output device detection
  const outputs = await countAudioOutputs();
  if (outputs === -1) {
    checks.push({
      id: "output-device",
      label: "Speakers / headphones",
      status: "unknown",
      detail: "Your browser doesn't share output-device details, so we can't check this directly.",
      suggestion: "Make sure headphones or speakers are connected and selected.",
    });
  } else if (outputs === 0) {
    checks.push({
      id: "output-device",
      label: "Speakers / headphones",
      status: "fail",
      detail: "No audio output device was found.",
      suggestion: "Connect headphones or speakers, then press Play again.",
    });
  } else {
    checks.push({
      id: "output-device",
      label: "Speakers / headphones",
      status: "pass",
      detail: `${outputs} output device${outputs === 1 ? "" : "s"} detected.`,
    });
  }

  // 5. Volume hint (never readable — always a gentle suggestion)
  checks.push({
    id: "volume",
    label: "Volume",
    status: "unknown",
    detail: "We can't read your device volume from the browser.",
    suggestion:
      "Check that your device volume is turned up and this tab isn't muted (look for a mute icon on the browser tab).",
  });

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const overallOk = !hasFail;

  let headline: string;
  if (hasFail) {
    headline = checks.find((c) => c.status === "fail")?.detail ?? "Something is blocking audio.";
  } else if (hasWarn) {
    headline = "Audio should work — one setting could be improved.";
  } else {
    headline = "Everything checks out. Try the test sound below to confirm.";
  }

  return { checks, overallOk, headline };
}
