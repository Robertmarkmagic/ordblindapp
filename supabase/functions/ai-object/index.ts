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
  const prompt = String(input.prompt || "").trim().slice(0, 36000);
  const schema = input.schema;
  if (!prompt || !schema || typeof schema !== "object") {
    return new Response(JSON.stringify({ error: "prompt_and_schema_required" }), { status: 400, headers });
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
      temperature: Math.min(0.5, Math.max(0, Number(input.temperature ?? 0.2))),
      max_tokens: Math.min(4096, Math.max(128, Number(input.max_tokens ?? 2048))),
      messages: [
        { role: "system", content: String(input.system || "Return accurate JSON matching the supplied schema.").slice(0, 12000) },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "reliefread_response", strict: false, schema },
      },
    }),
  });
  const result = await upstream.json();
  if (!upstream.ok) {
    console.error("AI object provider error", upstream.status);
    return new Response(JSON.stringify({ error: "AI request failed" }), { status: 502, headers });
  }
  try {
    const object = JSON.parse(result?.choices?.[0]?.message?.content || "{}");
    return new Response(JSON.stringify({ success: true, object }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "AI returned invalid data" }), { status: 502, headers });
  }
});
