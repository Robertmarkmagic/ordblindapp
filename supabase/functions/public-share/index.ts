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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });

  const slug = new URL(req.url).searchParams.get("slug") || "";
  if (!/^[A-Za-z0-9]{16,40}$/.test(slug)) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
  }

  const configuredSecrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const secretKey = configuredSecrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secretKey) return new Response(JSON.stringify({ error: "temporary_error" }), { status: 500, headers });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    secretKey,
    { auth: { persistSession: false } },
  );
  const { data, error } = await client
    .from("share_links")
    .select("title,content_raw,settings_json,language,sharer_premium,view_count")
    .eq("public_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("public share lookup failed", error.code);
    return new Response(JSON.stringify({ error: "temporary_error" }), { status: 500, headers });
  }
  if (!data) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });

  void client
    .from("share_links")
    .update({ view_count: Number(data.view_count || 0) + 1 })
    .eq("public_slug", slug);

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...headers, "Cache-Control": "private, max-age=30" },
  });
});
