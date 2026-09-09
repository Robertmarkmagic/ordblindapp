import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "http://127.0.0.1:54321";
const fallbackKey = "sb_publishable_reliefread_local_development";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackKey;

export const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "reliefread-auth",
  },
  global: {
    headers: {
      "X-Client-Info": "reliefread-web",
    },
  },
});

export function functionUrl(name: string): string {
  return `${supabaseUrl}/functions/v1/${name}`;
}

export async function fetchFunction(
  name: string,
  init: RequestInit = {},
  options: { anonymous?: boolean } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabasePublishableKey);
  if (!options.anonymous) {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw error || new Error("not_authenticated");
    }
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return fetch(functionUrl(name), { ...init, headers });
}
