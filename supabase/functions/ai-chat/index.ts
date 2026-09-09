import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://reliefread.com",
  "https://www.reliefread.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://reliefread.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
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
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  if (!(await hasValidUser(req))) return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "AI is not configured yet" }), { status: 503, headers });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  const message = String(input.message || "").trim().slice(0, 32000);
  if (!message) return new Response(JSON.stringify({ error: "message_required" }), { status: 400, headers });
  const system = String(input.system_prompt || "You are Riley, ReliefRead's calm and practical reading and writing assistant.").slice(0, 12000);
  const history = Array.isArray(input.history)
    ? input.history.slice(-12).map((item: Record<string, unknown>) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: String(item.content || "").slice(0, 8000),
      }))
    : [];

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [{ role: "system", content: system }, ...history, { role: "user", content: message }],
    }),
  });
  const result = await upstream.json();
  if (!upstream.ok) {
    console.error("AI chat provider error", upstream.status);
    return new Response(JSON.stringify({ error: "AI request failed" }), { status: 502, headers });
  }
  const content = String(result?.choices?.[0]?.message?.content || "").trim();
  return new Response(JSON.stringify({ content }), { status: 200, headers });
});
