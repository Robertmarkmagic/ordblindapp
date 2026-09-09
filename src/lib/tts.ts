import { fetchFunction } from "@/lib/supabase";

export interface HdAudioResult {
  url: string;
  cachedFree: boolean;
}

const memoryCache = new Map<string, string>();

function hashText(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export async function generateHdAudio(params: {
  documentId: string;
  voiceId: string;
  text: string;
}): Promise<HdAudioResult> {
  const text = params.text.trim();
  if (!text) throw new Error("Nothing to read aloud yet.");
  const key = `${params.documentId}:${params.voiceId}:${hashText(text)}`;
  const cached = memoryCache.get(key);
  if (cached) return { url: cached, cachedFree: true };

  const response = await fetchFunction("text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: params.voiceId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "HD voice is unavailable");
  }
  const audio = await response.blob();
  const url = URL.createObjectURL(audio);
  memoryCache.set(key, url);
  return { url, cachedFree: false };
}
