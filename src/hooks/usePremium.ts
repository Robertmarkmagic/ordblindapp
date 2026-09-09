import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { TESTER_MODE } from "@/lib/billing";
import { supabase } from "@/lib/supabase";

export function usePremium() {
  const { user, loading: authLoading } = useAuth();
  const [premium, setPremium] = useState(TESTER_MODE);
  const [loading, setLoading] = useState(!TESTER_MODE);

  const refresh = useCallback(async () => {
    if (TESTER_MODE) {
      setPremium(true);
      setLoading(false);
      return;
    }
    if (authLoading || !user) {
      setPremium(false);
      setLoading(authLoading);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan,status,trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setPremium(false);
    } else {
      const active = data?.status === "active" || data?.status === "trialing";
      const paidPlan = data?.plan === "premium" || data?.plan === "team" || data?.plan === "tester";
      const trialValid = !data?.trial_ends_at || new Date(data.trial_ends_at).getTime() > Date.now();
      setPremium(Boolean(active && paidPlan && trialValid));
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("reliefread:entitlement-changed", onChange);
    return () => window.removeEventListener("reliefread:entitlement-changed", onChange);
  }, [refresh]);

  return { premium, loading, refresh };
}

export default usePremium;
