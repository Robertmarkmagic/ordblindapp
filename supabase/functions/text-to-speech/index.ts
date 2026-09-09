import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://reliefread.com",
  "https://www.reliefread.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);
const voices = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://reliefread.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

async function hasValidUser(req: Request): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const configured = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const key = configured.default || Deno.env.get("SUPABASE_ANON_KEY");
  if (!key) return false;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data.user);
}

Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });
  if (!(await hasValidUser(req))) return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "AI voice is not configured yet" }), { status: 503, headers: { ...headers, "Content-Type": "application/json" } });

  const input = await req.json().catch(() => ({}));
  const text = String(input.text || "").trim().slice(0, 10000);
  const requestedVoice = String(input.voice || "sage");
  if (!text) return new Response(JSON.stringify({ error: "text_required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts",
      voice: voices.has(requestedVoice) ? requestedVoice : "sage",
      input: text,
      response_format: "mp3",
    }),
  });
  if (!upstream.ok) {
    console.error("text-to-speech provider error", upstream.status);
    return new Response(JSON.stringify({ error: "AI voice request failed" }), { status: 502, headers: { ...headers, "Content-Type": "application/json" } });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { ...headers, "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" },
  });
});
