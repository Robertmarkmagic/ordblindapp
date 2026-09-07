export interface WritingDraft {
  title: string;
  text: string;
}

const DRAFT_KEY = "reliefread-writing-draft-v1";
const PENDING_DRAFT_KEY = "reliefread-writing-incoming-v1";

function read(storage: Storage | undefined, key: string): WritingDraft | null {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(key) || "null") as Partial<WritingDraft> | null;
    if (!parsed || typeof parsed.text !== "string") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      text: parsed.text,
    };
  } catch {
    return null;
  }
}

export function loadWritingDraft(): WritingDraft {
  if (typeof window === "undefined") return { title: "", text: "" };
  return read(window.localStorage, DRAFT_KEY) || { title: "", text: "" };
}

export function saveWritingDraft(draft: WritingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The editor still works when device storage is unavailable.
  }
}

export function clearWritingDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function queueIncomingWritingDraft(draft: WritingDraft) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function loadIncomingWritingDraft(): WritingDraft | null {
  if (typeof window === "undefined") return null;
  return read(window.sessionStorage, PENDING_DRAFT_KEY);
}

export function clearIncomingWritingDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_DRAFT_KEY);
}
