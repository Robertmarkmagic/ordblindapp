// The warm, natural voices offered in the reader's audio bar.
//
// COST RULE (enforced in tts.ts): narration always uses ElevenLabs Flash v2.5.
// Flash v2.5 is MULTILINGUAL (Danish included), so the same curated voice IDs
// speak both English and Danish — we simply present two personalities per
// language. Voices are labelled by personality ("Calm — Emma"), never by
// technical voice IDs.
//
// Voice names are resolved by ReliefRead's own text-to-speech function.

export interface ReaderVoice {
  /** ElevenLabs voice id (curated allowlist). */
  id: string;
  /** Friendly personality label shown to the reader. */
  label: string;
  /** Language this personality is offered for. */
  lang: "en" | "da";
  /** BCP-47 tag used to pick a matching browser voice in the fallback engine. */
  browserLang: string;
}

export const READER_VOICES: ReaderVoice[] = [
  { id: "coral", label: "Calm, Emma", lang: "en", browserLang: "en-US" },
  { id: "onyx", label: "Clear, Daniel", lang: "en", browserLang: "en-US" },
  { id: "sage", label: "Rolig, Freja", lang: "da", browserLang: "da-DK" },
  { id: "ballad", label: "Tydelig, Mikkel", lang: "da", browserLang: "da-DK" },
];

export function voicesForLang(lang: string): ReaderVoice[] {
  const l = lang === "da" ? "da" : "en";
  return READER_VOICES.filter((v) => v.lang === l);
}

export function defaultVoiceForLang(lang: string): ReaderVoice {
  return voicesForLang(lang)[0];
}

export function findVoice(id: string | undefined): ReaderVoice | undefined {
  if (!id) return undefined;
  return READER_VOICES.find((v) => v.id === id);
}
