import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  imageUrl?: string;
  has_active_subscription?: boolean;
}

export interface AccessResult {
  allowed: boolean;
  redirect?: string;
  reason?: string;
}

type EntityName =
  | "document"
  | "note"
  | "dictionary_word"
  | "lookup"
  | "share_link"
  | "user_setting"
  | "usage_counter";

const TABLES: Record<EntityName, string> = {
  document: "documents",
  note: "notes",
  dictionary_word: "dictionary_words",
  lookup: "lookups",
  share_link: "share_links",
  user_setting: "user_settings",
  usage_counter: "usage_counters",
};

let currentSession: Session | null = null;

function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const email = user.email || "";
  return {
    id: user.id,
    email,
    name: metadata.full_name || metadata.name || email.split("@")[0] || undefined,
    image: metadata.avatar_url || metadata.picture,
    imageUrl: metadata.avatar_url || metadata.picture,
  };
}

function normalizePayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.author_id;
  delete next.looked_up_by;
  delete next.organization_id;
  delete next.app_id;
  delete next.created_by;
  delete next.updated_by;
  return next;
}

function normalizeFilter(filter: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key === "author_id" || key === "looked_up_by") {
      next.user_id = value;
    } else {
      next[key] = value;
    }
  }
  return next;
}

function normalizeRow<T extends Record<string, unknown>>(row: T): T {
  if (!row) return row;
  const userId = row.user_id;
  return {
    ...row,
    ...(userId ? { author_id: userId, looked_up_by: userId } : {}),
  } as T;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) throw error || new Error("not_authenticated");
  currentSession = data.session;
  return data.session.user.id;
}

function entity(name: EntityName) {
  const table = TABLES[name];
  return {
    async list(order = "-created_at", limit?: number) {
      let query = supabase.from(table).select("*");
      if (order) {
        const descending = order.startsWith("-");
        query = query.order(descending ? order.slice(1) : order, { ascending: !descending });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row) => normalizeRow(row));
    },
    async filter(values: Record<string, unknown>) {
      let query = supabase.from(table).select("*");
      for (const [key, value] of Object.entries(normalizeFilter(values))) {
        query = value === null ? query.is(key, null) : query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row) => normalizeRow(row));
    },
    async get(id: string) {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) throw error;
      return normalizeRow(data);
    },
    async create(values: Record<string, unknown>) {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from(table)
        .insert({ ...normalizePayload(values), user_id: userId })
        .select("*")
        .single();
      if (error) throw error;
      return normalizeRow(data);
    },
    async update(id: string, values: Record<string, unknown>) {
      const { data, error } = await supabase
        .from(table)
        .update(normalizePayload(values))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return normalizeRow(data);
    },
    async delete(id: string) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
  };
}

export const backend = {
  auth: {
    async checkSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      currentSession = data.session;
      return toAppUser(data.session?.user);
    },
    async me() {
      return this.checkSession();
    },
    isAuthenticated() {
      return Boolean(currentSession?.user);
    },
    getToken() {
      return currentSession?.access_token || null;
    },
    async refresh() {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      currentSession = data.session;
      return toAppUser(data.user);
    },
    login(returnTo = "/dashboard") {
      sessionStorage.setItem("reliefread_post_login_redirect", returnTo);
      window.location.assign(`/login?redirect=${encodeURIComponent(returnTo)}`);
    },
    async logout() {
      const { error } = await supabase.auth.signOut();
      currentSession = null;
      if (error) throw error;
    },
  },
  entities: {
    document: entity("document"),
    note: entity("note"),
    dictionary_word: entity("dictionary_word"),
    lookup: entity("lookup"),
    share_link: entity("share_link"),
    user_setting: entity("user_setting"),
    usage_counter: entity("usage_counter"),
  },
};

export async function requireAuth(): Promise<AppUser | null> {
  return backend.auth.checkSession();
}

export async function checkAppAccess(): Promise<AccessResult> {
  const user = await backend.auth.checkSession();
  return user
    ? { allowed: true }
    : { allowed: false, redirect: "/login", reason: "not_authenticated" };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  return backend.auth.checkSession();
}

export function isAuthenticated(): boolean {
  return backend.auth.isAuthenticated();
}

export function getAuthToken(): string | null {
  return backend.auth.getToken();
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      currentSession = data.session;
      setUser(toAppUser(data.session?.user));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
      setUser(toAppUser(session?.user));
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback((returnTo = "/dashboard") => backend.auth.login(returnTo), []);
  const logout = useCallback(() => backend.auth.logout(), []);
  const refresh = useCallback(async () => {
    const next = await backend.auth.refresh();
    setUser(next);
    return next;
  }, []);

  return { user, loading, login, logout, refresh };
}
