import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import {
  ReadingSettings,
  DEFAULT_READING_SETTINGS,
  loadReadingSettings,
  saveReadingSettings,
} from "@/lib/reading-settings";

/**
 * Loads the signed-in user's reading preferences and exposes a save function.
 *
 * The auth guard (`if (authLoading || !user) return`) is required: after an
 * OAuth callback the token is stored at module level, and without this guard
 * the fetch can fire before the token is ready → a 401 on first load.
 */
export function useReadingSettings() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_READING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    setLoading(true);
    loadReadingSettings()
      .then((s) => {
        if (!active) return;
        setSettings(s);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || "We couldn't load your settings just now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const save = useCallback(async (next: ReadingSettings) => {
    const saved = await saveReadingSettings(next);
    setSettings(saved);
    return saved;
  }, []);

  return { settings, setSettings, save, loading, error };
}
