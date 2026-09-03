import { useCallback, useEffect, useState } from "react";
import {
  applyAppPreferences,
  loadAppPreferences,
  PREFERENCES_EVENT,
  saveAppPreferences,
  type AppPreferences,
} from "@/lib/app-preferences";

export function useAppPreferences() {
  const [preferences, setState] = useState<AppPreferences>(() => loadAppPreferences());

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
      return saveAppPreferences(resolved);
    });
  }, []);

  return { preferences, setPreferences };
}
