// ReliefRead public sharing — the growth loop.
//
// A share_link is a SNAPSHOT of a document: its raw text + the sharer's chosen
// formatting, keyed by an unguessable slug. The public reading page fetches it
// anonymously through the /api/share-view server endpoint (which exposes ONLY
// presentation fields — never document_id, author_id, or any user data).
//
// Creating / listing / revoking links happens here through the authenticated
// client SDK (the sharer is always signed in when managing shares).

import { overskill } from "@/lib/auth";
import type { FontChoice, TintChoice } from "@/lib/reading-settings";

/** The exact formatting a share was created with — the recipient's starting point. */
export interface ShareSnapshot {
  font: FontChoice;
  tint: TintChoice;
  speed: number;
  bionic: boolean;
  fontSize: number; // px
  lineHeight: number; // unitless multiplier
  letterSpacing: number; // em
  wordSpacing: number; // em
}

export const DEFAULT_SHARE_SNAPSHOT: ShareSnapshot = {
  font: "lexend",
  tint: "cream",
  speed: 1,
  bionic: false,
  fontSize: 18,
  lineHeight: 1.7,
  letterSpacing: 0,
  wordSpacing: 0,
};

export interface ShareLinkRow {
  id: string;
  document_id: string;
  public_slug: string;
  settings_json?: string;
  title?: string;
  content_raw?: string;
  language?: string;
  sharer_premium?: boolean;
  view_count?: number;
  author_id?: string;
  created_at?: string;
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * ~20 chars of crypto-random base62 ≈ 119 bits of entropy — unguessable, so a
 * public reading can only be reached by someone the sharer handed the link to.
 */
export function generateSlug(len = 20): string {
  const bytes = new Uint8Array(len);
  const c = typeof crypto !== "undefined" ? crypto : (window as any).crypto;
  c.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

/** Parse a stored snapshot, always returning a complete object (fills gaps with defaults). */
export function parseSnapshot(json?: string | null): ShareSnapshot {
  if (!json) return { ...DEFAULT_SHARE_SNAPSHOT };
  try {
    const parsed = JSON.parse(json) as Partial<ShareSnapshot>;
    return { ...DEFAULT_SHARE_SNAPSHOT, ...parsed };
  } catch {
    return { ...DEFAULT_SHARE_SNAPSHOT };
  }
}

/** The public URL handed to teachers/parents (reliefread.com/r/{slug}). */
export function publicShareUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/r/${slug}`;
}

/** Create a new public share, snapshotting the current formatting + document text. */
export async function createShareLink(args: {
  documentId: string;
  title: string;
  contentRaw: string;
  language: string;
  snapshot: ShareSnapshot;
  sharerPremium: boolean;
}): Promise<ShareLinkRow> {
  const slug = generateSlug();
  const created = await overskill.entities.share_link.create({
    document_id: args.documentId,
    public_slug: slug,
    settings_json: JSON.stringify(args.snapshot),
    title: args.title,
    content_raw: args.contentRaw,
    language: args.language,
    sharer_premium: args.sharerPremium,
    view_count: 0,
  });
  return created as ShareLinkRow;
}

/**
 * Active links for ONE document. share_link is public_with_author (no scope
 * filter on read), but filtering by document_id naturally scopes to the owner's
 * own content — no other user has this (user_scoped) document's id.
 */
export async function listShareLinksForDocument(documentId: string): Promise<ShareLinkRow[]> {
  const rows = await overskill.entities.share_link.filter({ document_id: documentId });
  const list = (Array.isArray(rows) ? rows : []) as ShareLinkRow[];
  return list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

/**
 * All of the current user's share links, for the dashboard "shared" badge.
 * Best-effort: returns [] on any error so the dashboard never breaks over a badge.
 * Callers should still intersect with their OWN document ids (public_with_author
 * has no tenant boundary on read).
 */
export async function listMyShareLinks(userId: string): Promise<ShareLinkRow[]> {
  try {
    const rows = await overskill.entities.share_link.filter({ author_id: userId });
    return (Array.isArray(rows) ? rows : []) as ShareLinkRow[];
  } catch {
    return [];
  }
}

/** Revoke (delete) a share link — the public route returns 404 immediately after. */
export async function revokeShareLink(id: string): Promise<void> {
  await overskill.entities.share_link.delete(id);
}

export interface PublicShareData {
  title: string;
  content_raw: string;
  settings_json: string;
  language: string;
  sharer_premium: boolean;
  view_count: number;
}

/**
 * Anonymous fetch of a public share by slug — no auth token, goes through the
 * safe server endpoint. Returns null when the link is missing or was revoked
 * (so the public page can show a calm "no longer available" state, never an error).
 */
export async function fetchPublicShare(slug: string): Promise<PublicShareData | null> {
  const res = await fetch(`/api/share-view?slug=${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404 || res.status === 410) return null;
  if (res.status === 429) throw new Error("rate_limited");
  if (!res.ok) throw new Error(`share_fetch_failed_${res.status}`);
  return (await res.json()) as PublicShareData;
}
