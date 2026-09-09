import { useCallback, useEffect, useState } from "react";
import {
  applyAppPreferences,
  loadAppPreferences,
  PREFERENCES_EVENT,
  saveAppPreferences,
  type AppPreferences,
} from "@/lib/app-preferences";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function useAppPreferences() {
  const { user } = useAuth();
  const [preferences, setState] = useState<AppPreferences>(() => loadAppPreferences());

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("user_settings")
      .select("app_preferences")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!active || !data?.app_preferences) return;
        setState(saveAppPreferences(data.app_preferences as Partial<AppPreferences> as AppPreferences));
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const sync = (event: Event) => {
      const custom = event as CustomEvent<AppPreferences>;
      setState(custom.detail || loadAppPreferences());
    };
    const storage = () => {
      const next = loadAppPreferences();
      applyAppPreferences(next);
      setState(next);
    };
    window.addEventListener(PREFERENCES_EVENT, sync);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(PREFERENCES_EVENT, sync);
      window.removeEventListener("storage", storage);
    };
  }, []);

  const setPreferences = useCallback((next: AppPreferences | ((current: AppPreferences) => AppPreferences)) => {
    setState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      const saved = saveAppPreferences(resolved);
      if (user) {
        void supabase
          .from("user_settings")
          .update({ app_preferences: saved })
          .eq("user_id", user.id);
      }
      return saved;
    });
  }, [user]);

  return { preferences, setPreferences };
}
