export const MAX_WEB_TEXT_LENGTH = 100_000;

export class WebImportError extends Error {
  constructor(public code: string) { super(code); }
}

/** Only public web pages, never credentials, local hosts, raw IPs or custom ports. */
export function normalizePublicWebUrl(input: string): string {
  const value = input.trim();
  if (!value || value.length > 2048) throw new WebImportError("invalid_url");
  let url: URL;
  try { url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`); }
  catch { throw new WebImportError("invalid_url"); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') ||
      !/^[a-z\d.-]+$/.test(host) || /(^|\.)(localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(host) ||
      Array.from(url.searchParams.keys()).some((key) => /^(access_token|token|password|session|api_key|apikey)$/i.test(key))) {
    throw new WebImportError("invalid_url");
  }
  url.hostname = host;
  url.hash = '';
  return url.href;
}

export function safeWebSourceUrl(input?: string | null): string | null {
  try { return input ? normalizePublicWebUrl(input) : null; } catch { return null; }
}

export interface WebPageText {
  title: string;
  text: string;
  sourceUrl: string;
}

export function requireChapterUrl(url: string): void {
  const parsed = new URL(url);
  if (/(^|\.)wattpad\.com$/i.test(parsed.hostname) && /^\/story\//i.test(parsed.pathname)) {
    throw new WebImportError("chapter_link_required");
  }
}

/** Consume plain text only. Provider HTML is never sent to the app for rendering. */
export function parseWebPageText(payload: unknown, requestedUrl: string): WebPageText {
  if (!payload || typeof payload !== "object") throw new WebImportError("web_unavailable");
  const result = payload as { code?: number; data?: { title?: unknown; text?: unknown; url?: unknown; httpStatus?: number } };
  const data = result.data;
  if (!data || (result.code && result.code >= 400) || (data.httpStatus && data.httpStatus >= 400)) {
    throw new WebImportError("page_blocked");
  }
  const text = typeof data.text === "string" ? data.text.replace(/\r\n?/g, '\n').trim() : '';
  const title = typeof data.title === "string" ? data.title.trim().slice(0, 250) : '';
  if (/^(just a moment|access denied|attention required|security verification|sign in|log in|login|log ind)\b/i.test(title) ||
      (text.length < 2000 && /enable javascript and cookies|checking your browser|verify you are human|sign in to (read|continue)|log in to (read|continue)|log ind for at (læse|fortsætte)/i.test(text))) {
    throw new WebImportError("page_blocked");
  }
  if (text.length < 120 || text.split(/\s+/).length < 20) throw new WebImportError("no_readable_text");
  if (text.length > MAX_WEB_TEXT_LENGTH) throw new WebImportError("page_too_long");
  const sourceUrl = normalizePublicWebUrl(typeof data.url === "string" ? data.url : requestedUrl);
  return { title: title || new URL(sourceUrl).hostname, text, sourceUrl };
}
