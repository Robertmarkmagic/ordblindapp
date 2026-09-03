// HD narration generation + caching for ReliefRead.
//
// Uses the built-in platform audio gateway (/api/ai/audio/tts → ElevenLabs).
// Two layers of caching mean a student who replays the same text 5 times before
// a test costs exactly ONE generation:
//
//   1. Local (this browser): we store the presigned clip URL keyed by
//      document + voice + text-hash. A replay within the URL's ~1h lifetime is
//      served with ZERO network calls.
//   2. Platform gateway: it ALSO caches server-side by text+voice+model, so
//      even after the local URL expires, a re-request returns the same clip at
//      cost 0 (data.cached === true). We only count TTS seconds toward usage on
//      a genuinely fresh generation (see useReadAloud).
//
// Speed is applied client-side to the cached clip (audio.playbackRate) — never
// by regenerating.

import { getAuthToken } from "@/lib/auth";

// COST RULE: always Flash v2.5. Half the credits of Multilingual, supports
// Danish, and the quality difference for reading text aloud is negligible.
// NEVER use eleven_multilingual_v2 in production.
const MODEL_ID = "eleven_flash_v2_5";

const CACHE_PREFIX = "rr_tts_v1:";
const URL_TTL_MS = 55 * 60 * 1000; // refresh a little before the ~1h presign

export interface HdAudioResult {
  url: string;
  /** True when NO fresh generation happened (gateway cache hit or local cache). */
  cachedFree: boolean;
}

function hashText(text: string): string {
  // Small stable djb2-ish hash so the cache key survives edits to other docs.
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function cacheKey(documentId: string, voiceId: string, text: string): string {
  return `${CACHE_PREFIX}${documentId}:${voiceId}:${hashText(text)}`;
}

interface CacheEntry {
  url: string;
  expiresAt: number;
}

function readCache(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.url || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, url: string) {
  try {
    const entry: CacheEntry = { url, expiresAt: Date.now() + URL_TTL_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Generate (or reuse) HD narration for a document + voice.
 * Throws on failure so the caller can fall back to the browser voice.
 */
export async function generateHdAudio(params: {
  documentId: string;
  voiceId: string;
  text: string;
}): Promise<HdAudioResult> {
  const { documentId, voiceId, text } = params;
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("Nothing to read aloud yet.");

  const key = cacheKey(documentId, voiceId, trimmed);

  // 1. Local cache — no network, no cost.
  const cached = readCache(key);
  if (cached) return { url: cached.url, cachedFree: true };

  // 2. Gateway (which itself caches server-side).
  const token = getAuthToken();
  const res = await fetch("/api/ai/audio/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: trimmed, voice_id: voiceId, model_id: MODEL_ID }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.hint || `HD voice unavailable (${res.status})`);
  }

  const data = await res.json();
  if (!data?.url) throw new Error("HD voice returned no audio.");

  writeCache(key, data.url);
  return { url: data.url, cachedFree: Boolean(data.cached) };
}
