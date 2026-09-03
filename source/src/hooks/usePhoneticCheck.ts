import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import {
  splitSentences,
  currentSentenceIndex,
  sentenceKey,
  buildFlagged,
  type Correction,
  type FlaggedRange,
} from "@/lib/phonetics";

/**
 * usePhoneticCheck — gentle, dyslexia-friendly spelling help.
 *
 * Live behaviour (per spec): debounce 1.5s after a typing pause, then send ONLY
 * the sentence the caret is in to the cheapest/fastest AI model. Every result
 * is cached by the EXACT sentence string, so revisiting or re-checking
 * unchanged text costs nothing. Underlines are derived synchronously from the
 * cache, so accepting a suggestion or keeping a word updates instantly.
 */

const MODEL = "gemini-3-flash-preview"; // fastest/cheapest schema-capable model — this is spelling, not reasoning

const SYSTEM =
  "You are a gentle spelling assistant for dyslexic writers. The user may spell words phonetically in Danish or English (example: 'åvessættelse' means 'oversættelse', 'enuff' means 'enough'). Return a JSON object with a 'corrections' array of {original, suggestion, confidence}. Only include words you are confident are misspellings. Never comment on grammar or style. Never rewrite the user's voice.";

const SCHEMA = {
  type: "object",
  properties: {
    corrections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string", description: "the misspelled word exactly as the user wrote it" },
          suggestion: { type: "string", description: "the correctly spelled word" },
          confidence: { type: "number", description: "0..1 how sure this is a misspelling" },
        },
        required: ["original", "suggestion", "confidence"],
      },
    },
  },
  required: ["corrections"],
} as const;

/** Check one sentence. Never throws — returns [] on any failure. */
async function checkSentence(sentence: string, lang: "en" | "da"): Promise<Correction[]> {
  try {
    const token = getAuthToken();
    const res = await fetch("/api/ai/object", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt: `Language: ${lang === "da" ? "Danish" : "English"}\nSentence: ${sentence}`,
        schema: SCHEMA,
        system: SYSTEM,
        model: MODEL,
        temperature: 0.1,
        max_tokens: 512,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const arr = data && data.object && data.object.corrections;
    return Array.isArray(arr) ? (arr as Correction[]) : [];
  } catch (err) {
    console.warn("[phonetics] sentence check failed:", err);
    return [];
  }
}

export interface UsePhoneticCheckArgs {
  text: string;
  caret: number;
  lang: "en" | "da";
  dictionary: Set<string>;
  enabled: boolean;
}

export interface UsePhoneticCheckResult {
  suggestions: FlaggedRange[];
  checking: boolean;
  /** Batch mode: check every sentence, then return all suggestions. */
  checkAll: () => Promise<FlaggedRange[]>;
}

export function usePhoneticCheck({
  text,
  caret,
  lang,
  dictionary,
  enabled,
}: UsePhoneticCheckArgs): UsePhoneticCheckResult {
  const cacheRef = useRef<Map<string, Correction[]>>(new Map());
  const inflightRef = useRef<Set<string>>(new Set());
  const [version, setVersion] = useState(0);
  const [checking, setChecking] = useState(false);

  // Underlines are derived synchronously from the cache (bumping `version`
  // whenever a new sentence result lands re-derives them).
  const suggestions = useMemo(
    () => (enabled ? buildFlagged(text, cacheRef.current, dictionary) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, dictionary, version, enabled]
  );

  // Live check: after a 1.5s pause, check ONLY the current sentence if new.
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(async () => {
      const sentences = splitSentences(text);
      const idx = currentSentenceIndex(sentences, caret);
      if (idx < 0) return;
      const key = sentenceKey(sentences[idx].text);
      if (!key || !/\p{L}/u.test(key)) return;
      if (cacheRef.current.has(key) || inflightRef.current.has(key)) return;

      inflightRef.current.add(key);
      setChecking(true);
      const corr = await checkSentence(key, lang);
      cacheRef.current.set(key, corr);
      inflightRef.current.delete(key);
      setChecking(inflightRef.current.size > 0);
      setVersion((v) => v + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [text, caret, lang, enabled]);

  const checkAll = useCallback(async (): Promise<FlaggedRange[]> => {
    const sentences = splitSentences(text);
    const todo = Array.from(
      new Set(
        sentences
          .map((s) => sentenceKey(s.text))
          .filter((k) => k && /\p{L}/u.test(k) && !cacheRef.current.has(k))
      )
    );
    if (todo.length) {
      setChecking(true);
      await Promise.all(
        todo.map(async (k) => {
          const c = await checkSentence(k, lang);
          cacheRef.current.set(k, c);
        })
      );
      setChecking(false);
      setVersion((v) => v + 1);
    }
    return buildFlagged(text, cacheRef.current, dictionary);
  }, [text, lang, dictionary]);

  return { suggestions, checking, checkAll };
}

export default usePhoneticCheck;
