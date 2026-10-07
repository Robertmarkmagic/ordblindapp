import { normalizePublicWebUrl, parseWebPageText, requireChapterUrl, WebImportError } from "../_shared/web-source.ts";

const origins = new Set(["https://reliefread.com", "https://www.reliefread.com", "http://localhost:8080", "http://127.0.0.1:8080"]);
const MAX_RESPONSE_BYTES = 2_000_000;

async function readLimitedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new WebImportError("web_unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new WebImportError("page_too_long");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new WebImportError("web_unavailable"); }
}

export function createWebImportHandler(options: {
  authenticate: (req: Request) => Promise<boolean>;
  fetchPage?: typeof fetch;
  readerApiKey?: string;
}) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin") || "";
    const headers = {
      "Access-Control-Allow-Origin": origins.has(origin) ? origin : "https://reliefread.com",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    };
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.has(origin)) return reply({ error: "origin_not_allowed" }, 403);
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
    try {
      if (!(await options.authenticate(req))) return reply({ error: "not_authenticated" }, 401);
    } catch { return reply({ error: "not_authenticated" }, 401); }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      let input: { url?: unknown };
      try {
        const body = await req.text();
        if (body.length > 4096) return reply({ error: "invalid_url" }, 400);
        input = JSON.parse(body);
      } catch { return reply({ error: "invalid_url" }, 400); }
      if (!input || typeof input.url !== "string") return reply({ error: "invalid_url" }, 400);
      const url = normalizePublicWebUrl(input.url);
      requireChapterUrl(url);
      // Fixed public relay origin. Never fetch the supplied host from our backend,
      // and never forward the user's Supabase token, cookies or request headers.
      const upstreamHeaders: Record<string, string> = { Accept: "application/json", "X-Return-Format": "text" };
      if (options.readerApiKey) upstreamHeaders.Authorization = `Bearer ${options.readerApiKey}`;
      const response = await (options.fetchPage || fetch)(`https://r.jina.ai/${url}`, {
        headers: upstreamHeaders, redirect: "error", signal: controller.signal,
      });
      if (response.status === 429) return reply({ error: "rate_limited" }, 429);
      if (!response.ok) return reply({ error: [401, 403, 451].includes(response.status) ? "page_blocked" : "web_unavailable" }, 502);
      const page = parseWebPageText(await readLimitedJson(response), url);
      return reply(page);
    } catch (error) {
      if (controller.signal.aborted) return reply({ error: "web_timeout" }, 504);
      const code = error instanceof WebImportError ? error.code : "web_unavailable";
      return reply({ error: code }, ["invalid_url", "chapter_link_required"].includes(code) ? 400 : 422);
    } finally { clearTimeout(timeout); }
  };
}
