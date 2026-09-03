import { getAuthToken } from "@/lib/auth";

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
  const token = getAuthToken();
  const prompt = instructions(mode, lang);
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      system_prompt: prompt.system,
      message: `${prompt.task}\n\nThis is part ${part} of ${total}:\n\n${text}`,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || "Reading version request failed");
  }
  const body = await response.json();
  const result = String(body?.content || body?.message || body?.response || "").trim();
  if (!result) throw new Error("Reading version was empty");
  return result;
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
