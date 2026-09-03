// PLATFORM-MANAGED: CheckoutDialog — the ONLY supported way to open the
// Whop checkout in a modal/dialog/popup. Prefer a full checkout PAGE when
// the design allows (see payments-basics Section 2); use this when the
// design genuinely calls for an in-page purchase modal.
//
// WHY THIS EXISTS (QA run 2846c3d3, pre_signup_then_buy, Jun 2026 — the
// "modal Join-click trap"): putting <WhopCheckoutEmbed> directly inside a
// generic <Dialog> (or a hand-rolled `fixed inset-0` overlay with an
// onClick-to-close backdrop) silently eats purchases:
//
//   1. The embed's iframe resizes and re-centers ITSELF mid-interaction
//      (postMessage "resize"/"center" events from the checkout). A click
//      aimed at the Join button can land on the dialog OVERLAY where the
//      iframe used to be — Radix's default pointer-down-outside behavior
//      then DISMISSES the dialog. Modal closes, iframe unmounts, purchase
//      never happens, zero feedback to the buyer.
//   2. @whop/checkout locks the iframe URL at mount and does NOT support
//      prop updates ("Updating props on the checkout embed is not
//      supported"). Any remount — unstable key, conditional re-render,
//      open-state flicker — creates a FRESH iframe and wipes everything
//      the buyer already typed (email, card, pending submit).
//
// This wrapper therefore:
//   - disables outside-click/backdrop dismissal entirely. A purchase
//     modal must never close by accident — explicit X or Escape only.
//   - renders the embed in a memoized subtree whose props are all
//     identity-stable, so parent re-renders (auth state, entitlement
//     polling, page state) can NEVER remount the iframe. The embed
//     remounts only when `planId` changes (intentional, via key).
//   - bakes in the required returnUrl + onIdentityCaptured wiring and a
//     default onComplete that navigates to the canonical /checkout/complete
//     route — the SAME place returnUrl points — so the in-SPA completion and
//     Whop's top-window redirect converge on one purchase-confirmation page
//     (which then bridges into purchase → login/signup → access). Also
//     refreshes entitlements on completion.
//
// Usage:
//   const [open, setOpen] = useState(false);
//   <Button onClick={() => setOpen(true)}>Join — $29/mo</Button>
//   <CheckoutDialog
//     open={open}
//     onOpenChange={setOpen}
//     planId={import.meta.env.VITE_PLAN_PRO}
//     title="Join Pro"
//   />

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { captureCheckoutEmail, resolvePostPurchaseDestination } from "@/lib/whop";
import { useCheckoutSession } from "@/hooks/useCheckoutSession";

export interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whop plan id — ALWAYS from import.meta.env.VITE_PLAN_*, never a literal. */
  planId: string;
  title?: string;
  description?: string;
  theme?: "light" | "dark" | "system";
  /**
   * Post-purchase destination for the default redirect — the app's REAL
   * primary authenticated surface (the route that renders the paid feature,
   * e.g. `/studio`). When omitted it's resolved via
   * `resolvePostPurchaseDestination`: `VITE_POST_LOGIN_ROUTE`, else
   * `/dashboard`. Pass it explicitly (or set `VITE_POST_LOGIN_ROUTE`) so
   * buyers never land on a placeholder `/dashboard` (#2524).
   */
  destination?: string;
  /**
   * Optional override for the post-purchase handler (e.g. funnels that
   * navigate to an upsell page). Read through a ref — passing an inline
   * arrow here is safe and will NOT remount the iframe. When omitted,
   * the default routes through postPurchaseRedirect (signed-in buyer →
   * destination; signed-out buyer → /login with claim + email prefill).
   */
  onComplete?: (planId?: string, receiptId?: string) => void;
}

type CompleteHandler = (planId?: string, receiptId?: string) => void;

interface StableEmbedProps {
  planId: string;
  /**
   * Whop checkout-configuration session id (`ch_xxx`) — REQUIRED by Whop's
   * v3 embed protocol (mounting with only planId throws "`sessionKey` is a
   * required property"). Minted server-side via useCheckoutSession before
   * this subtree renders, so it's a stable string at mount time.
   */
  sessionId: string;
  theme: "light" | "dark" | "system";
  /** Buyer email at OPEN time — locked at iframe mount (see below). */
  email?: string;
  returnUrl: string;
  /** Ref holding the latest complete handler — ref identity is stable. */
  onCompleteRef: React.MutableRefObject<CompleteHandler>;
}

// The iframe boundary. Every prop the embed receives is identity-stable
// across parent re-renders, and React.memo stops re-renders from reaching
// the embed at all. The Whop iframe locks its URL at mount, so prefill is
// also locked here (initial-value ref) instead of tracking later auth
// changes — updating it post-mount is unsupported by @whop/checkout anyway.
const StableCheckoutEmbed = React.memo(function StableCheckoutEmbed({
  planId,
  sessionId,
  theme,
  email,
  returnUrl,
  onCompleteRef,
}: StableEmbedProps) {
  const initialEmailRef = React.useRef(email);
  const prefill = React.useMemo(
    () =>
      initialEmailRef.current ? { email: initialEmailRef.current } : undefined,
    []
  );

  // Identity-stable callback; always invokes the LATEST handler via ref.
  const handleComplete = React.useCallback(
    (completedPlanId?: string, receiptId?: string) => {
      onCompleteRef.current(completedPlanId, receiptId);
    },
    [onCompleteRef]
  );

  return (
    <WhopCheckoutEmbed
      key={planId}
      planId={planId}
      sessionId={sessionId}
      theme={theme}
      adaptivePricing
      // Save the buyer's card for later off-session charges (one-click
      // OTO/upsells via chargeUpsell() — see @/lib/whop). Matches the raw
      // <WhopCheckoutEmbed> funnel examples; without it a post-purchase OTO
      // has no saved paymentMethodId and can't be one-click.
      setupFutureUsage="off_session"
      prefill={prefill}
      returnUrl={returnUrl}
      onIdentityCaptured={captureCheckoutEmail}
      onComplete={handleComplete}
    />
  );
});

export function CheckoutDialog({
  open,
  onOpenChange,
  planId,
  title,
  description,
  theme = "system",
  destination,
  onComplete,
}: CheckoutDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Latest-value refs keep the embed's callbacks identity-stable while
  // still seeing fresh user/onComplete/destination values at fire time.
  const onCompleteRef = React.useRef<CompleteHandler>(() => {});
  React.useEffect(() => {
    onCompleteRef.current = (completedPlanId, receiptId) => {
      // Let useEntitlement() consumers refetch immediately (the SDK
      // listens for this event).
      window.dispatchEvent(new Event("overskill:entitlement-changed"));
      onOpenChange(false);
      if (onComplete) {
        onComplete(completedPlanId, receiptId);
      } else {
        // Converge with the returnUrl path: send the buyer to the canonical
        // /checkout/complete route, which shows purchase confirmation,
        // resolves the checkout email, and bridges into purchase →
        // login/signup → access (postPurchaseRedirect with the email
        // prefilled). Navigating straight to /login here instead would
        // drop the buyer on a bare auth page with no confirmation — the
        // bolt-buy QA bug (#1604/#1660).
        // Resolve the app's REAL primary surface (explicit destination →
        // VITE_POST_LOGIN_ROUTE → /dashboard) so the buyer never lands on a
        // placeholder /dashboard that isn't wired to the paid feature (#2524).
        const resolvedDestination = resolvePostPurchaseDestination(destination);
        navigate(
          `/checkout/complete?status=success&redirect=${encodeURIComponent(resolvedDestination)}`
        );
      }
    };
  });

  const returnUrl = React.useMemo(
    () => `${window.location.origin}/checkout/complete`,
    []
  );

  // Whop's v3 embed protocol REQUIRES a server-created checkout session;
  // mounting the embed with only a planId throws "`sessionKey` is a required
  // property" and the pay button no-ops. Mint the session (keyed on planId)
  // only while the dialog is open, then mount the embed with sessionId.
  const { sessionId, status, retry } = useCheckoutSession(planId, {
    enabled: open,
    redirectUrl: returnUrl,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        // CRITICAL: a purchase modal must NEVER dismiss from a backdrop /
        // outside-pointer event. The checkout iframe resizes itself while
        // the buyer interacts, so a tap aimed at Join can land on the
        // overlay — without these guards that click CLOSES the modal and
        // destroys the in-progress checkout (the Jun 2026 silent-purchase
        // -loss bug). Close is explicit only: the X button or Escape.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title ?? "Complete your purchase"}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {status === "error" || (status === "ready" && !sessionId) ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              We couldn't start the checkout. Please try again.
            </p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : sessionId ? (
          <StableCheckoutEmbed
            planId={planId}
            sessionId={sessionId}
            theme={theme}
            email={user?.email}
            returnUrl={returnUrl}
            onCompleteRef={onCompleteRef}
          />
        ) : (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading secure checkout…</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CheckoutDialog;
