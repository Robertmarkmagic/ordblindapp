import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useDictation — hands-free voice typing via the browser's SpeechRecognition
 * API. Language-aware (da-DK / en-US, following the document), returns live
 * INTERIM text separately from finalized text so the UI can show interim in a
 * lighter gray and commit finals to the note in normal color.
 *
 * PERMISSION-FIRST: SpeechRecognition on its own does NOT reliably prompt for
 * the microphone — if the permission is in the "prompt" state (never decided)
 * or was previously dismissed, `recognition.start()` fails with `not-allowed`
 * and the user hits a dead end. So before starting recognition we explicitly
 * call `getUserMedia({ audio: true })` from inside the click gesture. That is
 * the standard, reliable way to surface the browser's Allow dialog. We track
 * the real permission state (`prompt` | `granted` | `denied`) and expose a
 * `retry()` so the UI can offer a calm "Try again" after the user flips the
 * setting in their address bar.
 *
 * CONTINUOUS BY DESIGN: Chrome's SpeechRecognition auto-ends after a few
 * seconds of silence even with `continuous = true`. Without a restart that
 * makes dictation feel broken — "Listening…" flips off after one sentence or a
 * breath. We track the user's INTENT to listen (`wantRef`) and auto-restart on
 * a natural/no-speech end, so dictation stays live until the user presses stop.
 *
 * Never throws: unsupported browsers return `supported: false`; permission and
 * runtime errors surface as gentle, shame-free `error` messages, and hard
 * errors stop cleanly (no restart loop).
 */
export interface UseDictationOptions {
  /** BCP-47 language tag, e.g. "da-DK" or "en-US". */
  lang: string;
  /** Called with each finalized phrase (trimmed, non-empty). */
  onFinal: (text: string) => void;
}

export type MicPermission = "unknown" | "prompt" | "granted" | "denied";

export interface UseDictationResult {
  supported: boolean;
  listening: boolean;
  /** The current interim (not-yet-final) transcript, or "". */
  interim: string;
  error: string | null;
  /** Best-effort microphone permission state, kept in sync when the browser reports it. */
  permission: MicPermission;
  /** True while the mic Allow prompt / getUserMedia request is in flight. */
  requesting: boolean;
  start: () => void;
  stop: () => void;
  /** Re-request microphone access and start (use for a "Try again" button). */
  retry: () => void;
}

const BLOCKED_MESSAGE =
  "Microphone access is turned off for this site. Click the microphone (or lock) icon in your browser's address bar, set it to Allow, then press Try again.";

export function useDictation({ lang, onFinal }: UseDictationOptions): UseDictationResult {
  const [supported] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<MicPermission>("unknown");
  const [requesting, setRequesting] = useState(false);

  const recRef = useRef<any>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  // The user's INTENT to be listening. Chrome auto-stops recognition on silence;
  // we use this to decide whether an `onend` should auto-restart or truly stop.
  const wantRef = useRef(false);
  // True only while a hard start is in flight (guards double-start races).
  const startingRef = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  const restartTimer = useRef<number | null>(null);

  const clearRestart = () => {
    if (restartTimer.current != null) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
  };

  // Best-effort: read the current mic permission on mount and keep it in sync.
  // Not all browsers support permissions.query for "microphone" — guarded.
  useEffect(() => {
    if (!supported) return;
    const anyNav = navigator as any;
    if (!anyNav.permissions?.query) return;
    let status: any = null;
    let active = true;
    anyNav.permissions
      .query({ name: "microphone" as PermissionName })
      .then((s: any) => {
        if (!active) return;
        status = s;
        setPermission((prev) => (prev === "granted" ? prev : (s.state as MicPermission)));
        s.onchange = () => setPermission(s.state as MicPermission);
      })
      .catch(() => {
        /* permissions API unavailable for microphone — ignore */
      });
    return () => {
      active = false;
      if (status) status.onchange = null;
    };
  }, [supported]);

  // Attach all handlers to a recognition instance. Declared as a ref so `onend`
  // can rebuild a fresh instance without a circular useCallback dependency.
  const wireRef = useRef<(r: any) => any>();
  wireRef.current = (r: any) => {
    r.lang = langRef.current;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      startingRef.current = false;
      setListening(true);
      setError(null);
      setPermission("granted");
    };

    r.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = (res[0] && res[0].transcript) || "";
        if (res.isFinal) {
          const clean = txt.trim();
          if (clean) onFinalRef.current?.(clean);
        } else {
          live += txt;
        }
      }
      setInterim(live);
    };

    r.onerror = (e: any) => {
      startingRef.current = false;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        // Permission blocked — stop and point the user at the fix.
        wantRef.current = false;
        setPermission("denied");
        setError(BLOCKED_MESSAGE);
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // Benign — a pause or a manual stop. Let onend auto-restart if still wanted.
      } else {
        // Network / audio-capture / unknown — stop cleanly so we never hot-loop.
        wantRef.current = false;
        setError("Dictation paused. Press Dictate to pick up again whenever you like.");
      }
    };

    r.onend = () => {
      setInterim("");
      if (wantRef.current) {
        // Chrome ended on silence but the user still wants to dictate — restart
        // shortly so listening feels continuous.
        clearRestart();
        restartTimer.current = window.setTimeout(() => {
          if (!wantRef.current) return;
          try {
            r.start();
          } catch {
            // Instance is spent; build a fresh one and start that.
            try {
              const SR: any =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
              const fresh = wireRef.current!(new SR());
              recRef.current = fresh;
              fresh.start();
            } catch {
              wantRef.current = false;
              setListening(false);
            }
          }
        }, 200) as unknown as number;
      } else {
        setListening(false);
      }
    };

    return r;
  };

  // Actually spin up recognition (assumes mic access is granted / being asked).
  const launchRecognition = useCallback(() => {
    if (wantRef.current || startingRef.current) return; // already listening / starting
    try {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const r = wireRef.current!(new SR());
      recRef.current = r;
      wantRef.current = true;
      startingRef.current = true;
      setError(null);
      setInterim("");
      r.start();
      setListening(true); // optimistic; onstart confirms
    } catch {
      wantRef.current = false;
      startingRef.current = false;
      setError("We couldn't start dictation just now. Please try again.");
      setListening(false);
    }
  }, []);

  // Permission-first start: ask the browser for the mic (reliable Allow prompt),
  // then launch recognition. Kicked off from a click gesture so the prompt shows.
  const begin = useCallback(async () => {
    if (!supported) {
      setError("Dictation isn't available in this browser — try Chrome or Edge on desktop.");
      return;
    }
    if (wantRef.current || startingRef.current) return;

    const md = (navigator as any)?.mediaDevices;
    if (md?.getUserMedia) {
      setRequesting(true);
      try {
        // This surfaces the browser's Allow dialog when permission is "prompt",
        // and confirms access when already granted.
        const stream: MediaStream = await md.getUserMedia({ audio: true });
        // We don't need the raw stream — SpeechRecognition opens its own.
        stream.getTracks().forEach((t) => t.stop());
        setPermission("granted");
        setError(null);
      } catch (err: any) {
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          // User dismissed/denied, or the site is blocked in browser settings.
          setPermission("denied");
          setError(BLOCKED_MESSAGE);
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No microphone was found. Please connect a microphone, then press Try again.");
        } else {
          setError("We couldn't reach your microphone just now. Please try again.");
        }
        setRequesting(false);
        return;
      }
      setRequesting(false);
    }

    launchRecognition();
  }, [supported, launchRecognition]);

  const start = useCallback(() => {
    void begin();
  }, [begin]);

  // Same as start — used by a "Try again" button after the user flips the setting.
  const retry = useCallback(() => {
    setError(null);
    void begin();
  }, [begin]);

  const stop = useCallback(() => {
    wantRef.current = false; // prevent auto-restart
    clearRestart();
    const r = recRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
    setInterim("");
  }, []);

  // Keep the language current on a live instance (rarely changes mid-note).
  useEffect(() => {
    if (recRef.current) {
      try {
        recRef.current.lang = lang;
      } catch {
        /* ignore */
      }
    }
  }, [lang]);

  // Stop cleanly on unmount.
  useEffect(
    () => () => {
      wantRef.current = false;
      clearRestart();
      const r = recRef.current;
      if (r) {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  return { supported, listening, interim, error, permission, requesting, start, stop, retry };
}

export default useDictation;
