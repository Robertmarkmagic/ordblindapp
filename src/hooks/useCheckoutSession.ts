// useCheckoutSession — fetch a Whop checkout-configuration session for a plan
// so you can mount <WhopCheckoutEmbed sessionId={...}>.
//
// REQUIRED: Whop's current (v3) embed protocol throws
// "`sessionKey` is a required property" when <WhopCheckoutEmbed> mounts with
// only a `planId`. You must first create a server-side session and pass its
// id as `sessionId`. This hook does that, with loading / error / retry state.
//
// ```tsx
// import { WhopCheckoutEmbed } from "@whop/checkout/react";
// import { useCheckoutSession } from "@/hooks/useCheckoutSession";
// import { captureCheckoutEmail } from "@/lib/whop";
//
// function Paywall() {
//   const planId = import.meta.env.VITE_PLAN_PRO;
//   const { sessionId, status, retry } = useCheckoutSession(planId);
//   if (status === "loading") return <div>Loading checkout…</div>;
//   if (status === "error" || !sessionId) {
//     return <button onClick={retry}>Couldn't load checkout — retry</button>;
//   }
//   return (
//     <WhopCheckoutEmbed
//       planId={planId}
//       sessionId={sessionId}
//       returnUrl={`${window.location.origin}/checkout/complete`}
//       onIdentityCaptured={captureCheckoutEmail}
//     />
//   );
// }
// ```
//
// To force a NEW session when the plan changes (e.g. an order bump toggling
// planId), pass the changing planId in — the hook re-fetches automatically.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCheckoutSession,
  CheckoutSessionRateLimitError,
  type CreateCheckoutSessionOptions,
} from "@/lib/whop";

export type CheckoutSessionStatus = "idle" | "loading" | "ready" | "error";

export interface UseCheckoutSessionResult {
  /** The Whop checkout-configuration session id (`ch_xxx`), or null until ready. */
  sessionId: string | null;
  status: CheckoutSessionStatus;
  /** Convenience: true while the session is being created. */
  loading: boolean;
  /** Error message when the session couldn't be created, else null. */
  error: string | null;
  /** Re-attempt session creation (e.g. wire to a "Retry" button). */
  retry: () => void;
}

export interface UseCheckoutSessionOptions extends CreateCheckoutSessionOptions {
  // Defer fetching until true. Useful when the embed is in a modal that
  // hasn't opened yet — pass `enabled={open}`. Defaults to true.
  enabled?: boolean;
}

export function useCheckoutSession(
  planId: string | null | undefined,
  options: UseCheckoutSessionOptions = {}
): UseCheckoutSessionResult {
  const { enabled = true, metadata, redirectUrl } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckoutSessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Stabilize the effect deps: metadata is an object literal callers will
  // often pass inline, so key off its JSON to avoid refetching every render.
  const metadataKey = metadata ? JSON.stringify(metadata) : "";

  // DEDUPE: remember the session we already minted for a given
  // (plan, metadata, redirect) tuple so we DON'T re-mint on every re-render,
  // React StrictMode double-mount, or repeated enable toggle. Re-minting on
  // every mount is what drove the per-IP session-mint cap into 429s and
  // surfaced as an intermittent "couldn't load checkout" (issue #3107). We
  // only mint a fresh session when the tuple actually changes or the caller
  // explicitly retries.
  const mintKey = `${planId ?? ""}|${metadataKey}|${redirectUrl ?? ""}`;
  const mintedRef = useRef<{ key: string; sessionId: string } | null>(null);

  useEffect(() => {
    if (!enabled || !planId) {
      setStatus("idle");
      setError(null);
      // Do NOT clear a session we already minted for this plan — clearing it
      // here caused a re-mint the moment `enabled` flipped back on.
      if (!planId) {
        setSessionId(null);
        mintedRef.current = null;
      }
      return;
    }

    // Reuse the already-minted session for this exact tuple — no network call.
    if (mintedRef.current && mintedRef.current.key === mintKey) {
      setSessionId(mintedRef.current.sessionId);
      setStatus("ready");
      setError(null);
      return;
    }

    let cancelled = false;
    let backoffTimer: ReturnType<typeof setTimeout> | undefined;
    setStatus("loading");
    setError(null);
    setSessionId(null);

    // Auto-retry a transient 429 (per-IP mint cap) after the server's
    // Retry-After window instead of surfacing a hard failure. Bounded to a
    // couple of attempts so a genuinely rate-limited buyer still gets a
    // retry affordance rather than an infinite spinner.
    const MAX_BACKOFF_ATTEMPTS = 2;
    const mint = (backoffAttempt: number) => {
      createCheckoutSession(planId, { metadata, redirectUrl })
        .then((id) => {
          if (cancelled) return;
          mintedRef.current = { key: mintKey, sessionId: id };
          setSessionId(id);
          setStatus("ready");
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          if (
            e instanceof CheckoutSessionRateLimitError &&
            backoffAttempt < MAX_BACKOFF_ATTEMPTS
          ) {
            backoffTimer = setTimeout(
              () => mint(backoffAttempt + 1),
              e.retryAfterMs
            );
            return;
          }
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        });
    };
    mint(0);

    return () => {
      cancelled = true;
      if (backoffTimer) clearTimeout(backoffTimer);
    };
    // metadataKey (via mintKey) stands in for `metadata`; attempt drives
    // manual retries (which force a fresh mint below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, enabled, mintKey, attempt]);

  const retry = useCallback(() => {
    // Force a fresh mint on the next effect run (bypass the dedupe cache).
    mintedRef.current = null;
    setAttempt((n) => n + 1);
  }, []);

  return {
    sessionId,
    status,
    loading: status === "loading",
    error,
    retry,
  };
}
