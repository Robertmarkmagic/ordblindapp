// Tap-to-Understand lookups (Prompt 5).
//
// Explain-simply + translate for a selected fragment, backed by a SHARED cache:
// the `lookup` entity stores every result keyed by (document + exact text +
// kind + target language). If any reader of the same document looks up the same
// text again, we serve the stored answer with ZERO AI cost. The same rows also
// power each user's "Looked up" history (scoped by `looked_up_by`).
//
// Model: the cheapest/fastest available model for these short lookups.

import { overskill, getAuthToken } from "@/lib/auth";
import { detectLanguage } from "@/lib/reader-tokens";

export type LookupKind = "explain" | "translate";
export type Lang = "en" | "da";

export interface LookupRow {
  id: string;
  document_id: string;
  source_text: string;
  source_lang?: string;
  target_lang?: string;
  kind?: LookupKind;
  result_text?: string;
  looked_up_by?: string;
  author_id?: string;
  created_at?: string;
}

export interface LookupResult {
  kind: LookupKind;
  sourceText: string;
  sourceLang: Lang;
  targetLang: Lang;
  resultText: string;
  /** True when served from the shared cache (no AI cost this time). */
  cached: boolean;
}

const CHEAP_MODEL = "gemini-3-flash-preview";

const EXPLAIN_SYSTEM =
  "Explain like a kind teacher. Short sentences. Everyday words. One concrete example if helpful. Never condescending.";
const TRANSLATE_SYSTEM =
  "You are a careful translator between Danish and English. Reply with ONLY the translation — preserve meaning and tone, add no notes, labels, or quotation marks.";

function langName(lang: Lang): string {
  return lang === "da" ? "Danish" : "English";
}

function explainPrompt(text: string, target: Lang): string {
  // The explanation must come back in the DOCUMENT'S language.
  return `Explain the following text in ${langName(target)}, at a 10-year-old reading level, in one or two short sentences. Reply with ONLY the explanation.\n\nText: ${text}`;
}

function translatePrompt(text: string, source: Lang, target: Lang): string {
  return `Translate this from ${langName(source)} to ${langName(target)}:\n\n${text}`;
}

async function callModel(system: string, user: string): Promise<string> {
  const token = getAuthToken();
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: CHEAP_MODEL,
      message: user,
      system_prompt: system,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "AI request failed");
  }
  const data = await res.json();
  const content = data?.content || data?.message || data?.response || "";
  return String(content).trim();
}

function targetLangFor(kind: LookupKind, sourceLang: Lang, docLang: Lang): Lang {
  if (kind === "translate") return sourceLang === "da" ? "en" : "da";
  return docLang; // explanations stay in the document's language
}

/**
 * Look up a fragment. Shared-cache first (zero AI cost), then the cheap model.
 * A row is always recorded for the current user so it appears in their history,
 * but the model is only ever called on a genuine cache miss.
 */
export async function lookupText(args: {
  documentId: string;
  text: string;
  kind: LookupKind;
  docLang: Lang;
  userId: string;
}): Promise<LookupResult> {
  const { documentId, kind, docLang, userId } = args;
  const source_text = args.text.trim();
  const sourceLang = detectLanguage(source_text);
  const targetLang = targetLangFor(kind, sourceLang, docLang);

  // 1. Shared cache: any row for this document + exact text + kind + target.
  let existing: LookupRow[] = [];
  try {
    existing = (await overskill.entities.lookup.filter({
      document_id: documentId,
      source_text,
      kind,
    })) as LookupRow[];
  } catch {
    existing = [];
  }
  const keyed = existing.filter((r) => (r.target_lang || "") === targetLang && !!r.result_text);

  // Already in MY history → return it, don't duplicate.
  const mine = keyed.find((r) => r.looked_up_by === userId);
  if (mine) {
    return {
      kind,
      sourceText: source_text,
      sourceLang,
      targetLang,
      resultText: mine.result_text || "",
      cached: true,
    };
  }

  // Cache hit from another reader → reuse the answer (no AI), record for me.
  if (keyed.length) {
    const resultText = keyed[0].result_text || "";
    void overskill.entities.lookup
      .create({
        document_id: documentId,
        source_text,
        source_lang: sourceLang,
        target_lang: targetLang,
        kind,
        result_text: resultText,
        looked_up_by: userId,
      })
      .catch(() => {});
    return { kind, sourceText: source_text, sourceLang, targetLang, resultText, cached: true };
  }

  // 2. Miss → cheapest model, then store for everyone.
  const resultText =
    kind === "explain"
      ? await callModel(EXPLAIN_SYSTEM, explainPrompt(source_text, targetLang))
      : await callModel(TRANSLATE_SYSTEM, translatePrompt(source_text, sourceLang, targetLang));

  void overskill.entities.lookup
    .create({
      document_id: documentId,
      source_text,
      source_lang: sourceLang,
      target_lang: targetLang,
      kind,
      result_text: resultText,
      looked_up_by: userId,
    })
    .catch(() => {});

  return { kind, sourceText: source_text, sourceLang, targetLang, resultText, cached: false };
}

/** The current user's look-ups for a document, newest first. */
export async function listLookups(documentId: string, userId: string): Promise<LookupRow[]> {
  try {
    const rows = (await overskill.entities.lookup.filter({
      document_id: documentId,
      looked_up_by: userId,
    })) as LookupRow[];
    return rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  } catch {
    return [];
  }
}
