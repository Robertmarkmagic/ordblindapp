import { useCallback, useEffect, useState } from "react";
import { useEntitlement } from "overskill-sdk";
import { useAuth } from "@/lib/auth";
import { loadReadingSettings } from "@/lib/reading-settings";

/**
 * usePremium — the single source of truth for "is this user Premium?".
 *
 * A reader is Premium if EITHER:
 *   • their user_setting.plan === "premium" (set by the demo code, or a future
 *     server-side upgrade), OR
 *   • they hold an active paid entitlement (a real Overskill Payments
 *     subscription — recognised via useEntitlement without any webhook plumbing).
 *
 * The auth guard prevents a 401 flash before the OAuth token settles.
 */
export function usePremium() {
  const { user, loading: authLoading } = useAuth();
  const ent = useEntitlement();
  const [planPremium, setPlanPremium] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      const s = await loadReadingSettings();
      setPlanPremium(s.plan === "premium");
    } catch {
      setPlanPremium(false);
    } finally {
      setLoadingPlan(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    setLoadingPlan(true);
    loadReadingSettings()
      .then((s) => active && setPlanPremium(s.plan === "premium"))
      .catch(() => active && setPlanPremium(false))
      .finally(() => active && setLoadingPlan(false));

    // Refresh when a demo code / checkout flips entitlement mid-session.
    const onChange = () => void refresh();
    window.addEventListener("overskill:entitlement-changed", onChange);
    return () => {
      active = false;
      window.removeEventListener("overskill:entitlement-changed", onChange);
    };
  }, [authLoading, user, refresh]);

  const entitled = !ent.isLoading && !!ent.activePlan();
  const premium = planPremium || entitled;

  return { premium, loading: loadingPlan || ent.isLoading, refresh };
}

export default usePremium;
