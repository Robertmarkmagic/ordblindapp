import { fetchFunction } from "@/lib/supabase";

export type ReadingVersion = "original" | "easy" | "very-easy" | "explain";

const MODEL = "gemini-3-flash-preview";
const MAX_CHUNK_LENGTH = 6500;

export function splitReadingText(text: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  maxLength = Math.max(1, maxLength);
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const push = (value: string) => {
    if (value.trim()) chunks.push(value.trim());
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      push(current);
      current = "";
      const sentences = paragraph.match(/[^.!?]+[.!?]+[\])}'\u2019\u201d"]*|[^.!?]+$/g) || [paragraph];
      let longPart = "";
      for (const sentence of sentences) {
        let remaining = sentence.trim();
        const pieces: string[] = [];
        while (remaining.length > maxLength) {
          const space = remaining.lastIndexOf(" ", maxLength);
          const cut = space > 0 ? space : maxLength;
          pieces.push(remaining.slice(0, cut).trim());
          remaining = remaining.slice(cut).trim();
        }
        if (remaining) pieces.push(remaining);

        for (const piece of pieces) {
          const next = longPart ? `${longPart} ${piece}` : piece;
          if (next.length > maxLength && longPart) {
            push(longPart);
            longPart = piece;
          } else {
            longPart = next;
          }
        }
      }
      push(longPart);
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxLength && current) {
      push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }
  push(current);
  return chunks.length ? chunks : [text.trim()].filter(Boolean);
}

function instructions(mode: Exclude<ReadingVersion, "original">, lang: "da" | "en"): { system: string; task: string } {
  const outputLanguage = lang === "da" ? "Danish" : "English";
  const shared = `Write in ${outputLanguage}. Preserve every fact, name, number, date, deadline and instruction. Do not invent information. Return only the rewritten text with paragraph breaks.`;
  if (mode === "easy") {
    return {
      system: `You make text easier to read without removing important meaning. ${shared}`,
      task: "Use familiar words and shorter sentences. Keep the same amount of useful information and a respectful adult tone.",
    };
  }
  if (mode === "very-easy") {
    return {
      system: `You make text very easy to read without changing its meaning. ${shared}`,
      task: "Use very common words, one idea per short sentence, and clear paragraph breaks. Explain unavoidable difficult words briefly.",
    };
  }
  return {
    system: `You are a kind teacher who explains difficult reading clearly. ${shared}`,
    task: "Explain what this means in plain language. State the main point first, then the important details and any action the reader must take.",
  };
}

async function transformChunk(text: string, mode: Exclude<ReadingVersion, "original">, lang: "da" | "en", part: number, total: number): Promise<string> {
  const prompt = instructions(mode, lang);
  const response = await fetchFunction("ai-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      system_prompt: prompt.system,
      message: `${prompt.task}\n\nThis is part ${part} of ${total}:\n\n${text}`,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Keep the reading tools useful even if the optional AI provider is not
    // configured or is temporarily unavailable. The original is never touched.
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      return createLocalReadingVersion(text, mode, lang);
    }
    throw new Error(body?.error || "Reading version request failed");
  }
  const body = await response.json();
  const result = String(body?.content || body?.message || body?.response || "").trim();
  if (!result) throw new Error("Reading version was empty");
  return result;
}

const DANISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bvedrørende\b/gi, "om"],
  [/\bangående\b/gi, "om"],
  [/\bfremsende\b/gi, "sende"],
  [/\bforetage\b/gi, "lave"],
  [/\bmodtage\b/gi, "få"],
  [/\bsåfremt\b/gi, "hvis"],
  [/\binden udgangen af\b/gi, "senest"],
  [/\bimplementere\b/gi, "føre ud i livet"],
];

const ENGLISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bregarding\b/gi, "about"],
  [/\bcommence\b/gi, "start"],
  [/\butilize\b/gi, "use"],
  [/\bapproximately\b/gi, "about"],
  [/\bsubsequently\b/gi, "later"],
  [/\bprior to\b/gi, "before"],
];

function sentences(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function shortenSentence(sentence: string, veryEasy: boolean): string[] {
  const maximum = veryEasy ? 72 : 115;
  if (sentence.length <= maximum) return [sentence];

  const parts = sentence
    .split(/[,;:]\s+|\s+(?:men|but|fordi|because|mens|while)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return [sentence];
  return parts.map((part) => /[.!?]$/.test(part) ? part : `${part}.`);
}

/** A safe on-device fallback used when the hosted AI service is unavailable. */
export function createLocalReadingVersion(
  text: string,
  mode: Exclude<ReadingVersion, "original">,
  lang: "da" | "en",
): string {
  const replacements = lang === "da" ? DANISH_REPLACEMENTS : ENGLISH_REPLACEMENTS;
  let plain = text.trim();
  for (const [pattern, replacement] of replacements) plain = plain.replace(pattern, replacement);

  const simplified = sentences(plain).flatMap((sentence) => shortenSentence(sentence, mode === "very-easy"));
  if (mode === "easy") return simplified.join(" ");
  if (mode === "very-easy") return simplified.join("\n\n");

  const lead = lang === "da" ? "Kort fortalt" : "In short";
  const details = lang === "da" ? "Det vigtigste" : "The important points";
  const first = simplified[0] || plain;
  const rest = simplified.slice(1, 6);
  return [
    `${lead}:\n${first}`,
    rest.length ? `${details}:\n${rest.map((item) => `• ${item}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export async function createReadingVersion(args: {
  text: string;
  mode: Exclude<ReadingVersion, "original">;
  lang: "da" | "en";
}): Promise<string> {
  const chunks = splitReadingText(args.text);
  const output: string[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    output.push(await transformChunk(chunks[index], args.mode, args.lang, index + 1, chunks.length));
  }
  return output.join("\n\n");
}
