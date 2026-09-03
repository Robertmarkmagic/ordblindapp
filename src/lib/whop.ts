// Whop funnel primitives (provided by OverSkill template).
//
// Thin client-side helpers wrapping the most common operations a Whop-backed
// funnel needs. Import from here rather than reinventing the wheel each time.
//
// Architecture:
//   - createCheckoutSession() — mints a Whop checkout-configuration session
//     (`ch_xxx`) for a plan_id via the OverSkill worker. The browser MUST
//     pass that id to the embed as `sessionId` — Whop's current (v3) embed
//     protocol throws "`sessionKey` is a required property" when the embed
//     mounts with only a planId. Use the useCheckoutSession() hook
//     (@/hooks/useCheckoutSession) to fetch it; or CheckoutDialog /
//     pre-built components that do it for you.
//   - The browser embeds Whop's checkout via @whop/checkout (see
//     <WhopCheckoutEmbed planId="..." sessionId="...">). The embed fires
//     postMessage events when checkout completes.
//   - completeCheckout() — runs once the embed reports a receiptId. Hits the
//     OverSkill worker at /api/whop/checkout-complete which looks up the
//     payment + saved card via the app's sub-merchant API key (server-side
//     only, never exposed to the browser).
//   - chargeUpsell() — runs off-session charges for upsell pages later in the
//     funnel using the saved paymentMethodId. When the generated-app Whop
//     capability canary is enabled, pass the signed checkout/session
//     capability returned by completeCheckout().
//
// Server-side: see app/services/deployment/worker_api_template.rb for the
// /api/whop/checkout-complete and /api/whop/charge route handlers. The app's
// per-merchant whop_api_key (ak_xxx) lives in worker env as WHOP_API_KEY and
// is never sent to the browser.

export interface CheckoutCompletePayload {
  // Optional: the returnUrl top-redirect path only has the receipt
  // identifier from the query string — no plan in memory. Pass planId
  // when you have it (the in-SPA onComplete path).
  planId?: string;
  receiptId: string;
}

export interface CheckoutCompleteResult {
  memberId: string;
  paymentMethodId: string | null;
  // The buyer's email collected at checkout. For an ANONYMOUS buyer
  // (no app login) this is what you forward to /login?email=... so the
  // signup/login prefills the SAME email the purchase was made under —
  // letting the platform reconcile the entitlement to the new account
  // by email (the default purchase -> login/signup -> access flow).
  // null when the worker couldn't resolve it from the payment record.
  memberEmail: string | null;
  // Echoed back so callers don't have to thread state separately.
  planId?: string;
  receiptId: string;
  // Short-lived signed checkout/session capability. Present only when the
  // generated-app Whop capability canary is enabled for this app/team.
  capability: string | null;
}

export interface ChargeUpsellOptions {
  memberId: string;
  paymentMethodId: string;
  // Either an existing plan (preferred — supports recurring) OR an inline
  // one-time price in whole dollars (or a fractional dollar amount).
  planId?: string;
  inlinePrice?: number;
  // Free-form data attached to the resulting payment record on Whop. Keep
  // keys short; values must be JSON-scalar.
  metadata?: Record<string, string | number | boolean>;
  // Optional human-readable description shown on receipts.
  description?: string;
  // Signed checkout/session capability returned by completeCheckout().
  // Required only when VITE_WHOP_CAPABILITY_AUTHZ_ENABLED is true.
  capability?: string | null;
  // Idempotency key for this charge attempt. The helper derives a stable key
  // when omitted, but explicit keys are best for multi-button flows.
  idempotencyKey?: string;
}

export interface ChargeUpsellResult {
  success: boolean;
  paymentId?: string;
  error?: string;
  // Echoed for caller convenience.
  memberId?: string;
}

// ---------------------------------------------------------------------------
// createCheckoutSession — REQUIRED before mounting <WhopCheckoutEmbed>
// ---------------------------------------------------------------------------

export interface CreateCheckoutSessionOptions {
  // Retained for source compatibility. Protected checkout metadata and the
  // destination are derived by OverSkill from the authenticated app.
  metadata?: Record<string, string | number | boolean>;
  redirectUrl?: string;
}

/**
 * Mint a Whop checkout-configuration SESSION for a plan and return its id
 * (`ch_xxx`). You MUST pass this id to the embed as `sessionId`:
 *
 * ```tsx
 * <WhopCheckoutEmbed planId={planId} sessionId={sessionId} />
 * ```
 *
 * WHY: Whop's current (v3) embedded-checkout protocol requires a
 * server-created session. Mounting `<WhopCheckoutEmbed>` with only a
 * `planId` makes the iframe throw "`sessionKey` is a required property" and
 * the pay button silently no-ops — checkout is completely broken. Creating
 * the session server-side (where the app's sub-merchant key lives, never
 * exposed to the browser) and handing the id to the embed is the fix.
 *
 * Most callers should use the `useCheckoutSession(planId)` hook from
 * `@/hooks/useCheckoutSession` (handles loading/error/retry) rather than
 * calling this directly. Hits the OverSkill worker route
 * `/api/whop/checkout-session`.
 *
 * @throws if planId is missing, the worker errors, or no session id is
 *   returned. Callers should surface a retry affordance (the hook does).
 */
export class CheckoutSessionRateLimitError extends Error {
  readonly status = 429;
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("checkout_rate_limited");
    this.name = "CheckoutSessionRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export async function createCheckoutSession(
  planId: string,
  _opts: CreateCheckoutSessionOptions = {}
): Promise<string> {
  if (!planId) throw new Error("createCheckoutSession: planId is required");

  const res = await fetch("/api/whop/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });

  // A 429 is transient back-pressure (per-IP session-mint cap), NOT a broken
  // checkout. Surface it as a typed error so the hook can auto-retry after
  // the server-provided Retry-After window instead of showing a hard
  // failure. See useCheckoutSession's backoff handling.
  if (res.status === 429) {
    const retryAfterMs = parseRetryAfterMs(res);
    throw new CheckoutSessionRateLimitError(retryAfterMs);
  }

  if (!res.ok) {
    const body = await safeText(res);
    throw new Error(
      `createCheckoutSession failed: HTTP ${res.status} ${body || res.statusText}`
    );
  }

  const json = (await res.json()) as {
    session_id?: string;
    sessionId?: string;
  };
  const sessionId = json.sessionId ?? json.session_id ?? "";
  if (!sessionId) {
    throw new Error("createCheckoutSession: worker returned no sessionId");
  }
  return sessionId;
}

// ---------------------------------------------------------------------------
// completeCheckout
// ---------------------------------------------------------------------------

/**
 * Resolve a Whop checkout that just finished into the {memberId, paymentMethodId}
 * pair needed for follow-on off-session charges.
 *
 * Call this from the WhopCheckoutEmbed's `onComplete` handler. The receiptId
 * comes from the postMessage payload (see WhopCheckoutEmbed docs).
 *
 * The worker looks up the underlying Whop payment + member, lists payment
 * methods, and returns the saved card. If no card was saved (rare), the
 * paymentMethodId comes back as null — upsells won't be possible without
 * collecting a method, so funnels typically branch on that.
 *
 * @example
 * ```tsx
 * // Always reference plan IDs via env vars — never hardcode strings.
 * <WhopCheckoutEmbed
 *   planId={import.meta.env.VITE_PLAN_PRO}
 *   onComplete={async (e) => {
 *     const { memberId, paymentMethodId, capability } = await completeCheckout({
 *       planId: e.planId,
 *       receiptId: e.receiptId,
 *     });
 *     funnel.setIdentity({ memberId, paymentMethodId, whopCapability: capability });
 *     funnel.recordPurchase({ planId: e.planId });
 *     navigate("/upsell-1");
 *   }}
 * />
 * ```
 */
export async function completeCheckout(
  payload: CheckoutCompletePayload
): Promise<CheckoutCompleteResult> {
  // planId is intentionally NOT required — the returnUrl top-redirect
  // path resolves a checkout from just the receipt identifier.
  if (!payload.receiptId) throw new Error("completeCheckout: receiptId is required");

  const res = await fetch("/api/whop/checkout-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await safeText(res);
    throw new Error(
      `completeCheckout failed: HTTP ${res.status} ${body || res.statusText}`
    );
  }

  const json = (await res.json()) as {
    member_id?: string;
    memberId?: string;
    payment_method_id?: string | null;
    paymentMethodId?: string | null;
    member_email?: string | null;
    memberEmail?: string | null;
    capability?: string | null;
    whop_capability?: string | null;
  };

  const memberId = json.memberId ?? json.member_id ?? "";
  if (!memberId) {
    throw new Error("completeCheckout: worker returned no memberId");
  }

  const capability = json.capability ?? json.whop_capability ?? null;
  rememberWhopCapability(capability);

  return {
    memberId,
    paymentMethodId: json.paymentMethodId ?? json.payment_method_id ?? null,
    memberEmail: json.memberEmail ?? json.member_email ?? null,
    planId: payload.planId,
    receiptId: payload.receiptId,
    capability,
  };
}

// ---------------------------------------------------------------------------
// captureCheckoutEmail / resolveCheckoutEmail — anonymous-buyer email bridge
// for the returnUrl top-redirect path.
// ---------------------------------------------------------------------------

// sessionStorage key shared by the capture + resolve pair (and read by the
// canonical /checkout/complete route guidance).
const CHECKOUT_EMAIL_KEY = "checkout_email";
const WHOP_CAPABILITY_KEY = "whop_capability";

// Query-param names a payment provider may use for the receipt/payment
// identifier on the returnUrl redirect. Whop documents ONLY `?status=` on
// the redirect, so none of these are guaranteed — resolveCheckoutEmail
// scans them opportunistically and degrades gracefully when absent.
const RECEIPT_PARAM_NAMES = [
  "receipt_id",
  "receiptId",
  "receipt",
  "payment_id",
  "session_id",
];

/**
 * Stash the buyer's checkout email the moment they type it INSIDE the
 * checkout iframe — pass this directly to the embed's `onIdentityCaptured`
 * prop:
 *
 * ```tsx
 * <WhopCheckoutEmbed
 *   planId={import.meta.env.VITE_PLAN_PRO}
 *   returnUrl={`${window.location.origin}/checkout/complete`}
 *   onIdentityCaptured={captureCheckoutEmail}
 *   onComplete={() => postPurchaseRedirect(navigate, user, { destination: "/dashboard" })}
 * />
 * ```
 *
 * WHY: an anonymous buyer types their email inside the provider's iframe,
 * and after purchase the provider TOP-WINDOW-redirects to /checkout/complete
 * WITHOUT carrying that email. `onIdentityCaptured` is the provider's
 * documented parent-page callback for "email entered or login" — capturing
 * here (sessionStorage survives the same-tab redirect) is what lets
 * /checkout/complete prefill signup with the SAME email the purchase was
 * made under, so the platform reconciles the purchase to the new account
 * by email match.
 */
export function captureCheckoutEmail(data: { email?: string; user_id?: string }): void {
  try {
    if (data && data.email) sessionStorage.setItem(CHECKOUT_EMAIL_KEY, data.email);
  } catch {
    // sessionStorage unavailable (privacy mode) — prefill is best-effort.
  }
}

/**
 * Synchronously read the checkout email captured by `captureCheckoutEmail`
 * (the embed's `onIdentityCaptured` callback). Returns null when none is
 * stored or sessionStorage is unavailable — NEVER throws.
 *
 * This is the sync companion to `resolveCheckoutEmail` (which also does the
 * async server-side receipt lookup). `postPurchaseRedirect` uses it as a
 * fallback so the buyer's checkout email always rides along to login/signup
 * even when the caller forgot to pass `opts.email` — that omission is what
 * left the anonymous-buyer sign-in/sign-up forms blank (#1604/#1660;
 * bolt-buy QA: the captured email was stranded in sessionStorage and the
 * default onComplete never forwarded it).
 */
export function readCapturedCheckoutEmail(): string | null {
  try {
    return sessionStorage.getItem(CHECKOUT_EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

export function readWhopCapability(): string | null {
  try {
    return sessionStorage.getItem(WHOP_CAPABILITY_KEY) || null;
  } catch {
    return null;
  }
}

function rememberWhopCapability(capability?: string | null): void {
  if (!capability) return;
  try {
    sessionStorage.setItem(WHOP_CAPABILITY_KEY, capability);
  } catch {
    // sessionStorage unavailable — callers can still pass capability directly.
  }
}

/**
 * Resolve the buyer's checkout email on the /checkout/complete return route.
 * NEVER throws; returns null when no email is resolvable (callers fall back
 * to the plain login flow — same behavior as before this helper existed).
 *
 * Resolution order:
 *   1. sessionStorage (captured via `onIdentityCaptured={captureCheckoutEmail}`
 *      on the embed — survives the provider's same-tab top-window redirect).
 *   2. Server-side lookup: when the redirect carried a receipt/payment
 *      identifier (e.g. `?receipt_id=...` — not guaranteed by the provider),
 *      POST /api/whop/checkout-complete resolves the buyer email from the
 *      payment record using the app's server-side key.
 *
 * ```tsx
 * const [params] = useSearchParams();
 * const email = (await resolveCheckoutEmail(params)) || undefined;
 * postPurchaseRedirect(navigate, user, { destination: "/dashboard", email });
 * ```
 */
export async function resolveCheckoutEmail(
  params?: URLSearchParams | null
): Promise<string | null> {
  try {
    const stored = sessionStorage.getItem(CHECKOUT_EMAIL_KEY);
    if (stored) return stored;
  } catch {
    // sessionStorage unavailable — fall through to the server lookup.
  }

  const search = params ?? new URLSearchParams(window.location.search);
  let receiptId: string | null = null;
  for (const name of RECEIPT_PARAM_NAMES) {
    const value = search.get(name);
    if (value) {
      receiptId = value;
      break;
    }
  }
  if (!receiptId) return null;

  try {
    const { memberEmail } = await completeCheckout({ receiptId });
    return memberEmail || null;
  } catch (err) {
    // Lookup is best-effort: the buyer can still sign up manually with the
    // same email and the claim reconciles. Don't break the return route.
    console.warn(
      "[whop] resolveCheckoutEmail lookup failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// resolvePostPurchaseDestination — where the buyer lands once they're IN.
// ---------------------------------------------------------------------------

/**
 * Resolve the post-purchase / post-signup destination: the app's PRIMARY
 * authenticated surface — the route that actually renders the feature the
 * buyer paid for.
 *
 * Resolution order (mirrors the OAuth callback's post-login route in
 * `src/routes/callback.tsx` — `storedRedirect || VITE_POST_LOGIN_ROUTE ||
 * '/dashboard'` — so the page a buyer lands on after a PURCHASE is the SAME
 * one they'd reach after a normal login, never a divergent hardcoded
 * literal):
 *   1. An explicit `destination` the caller passed (the offer page knows
 *      exactly where its paid feature lives — strongly preferred).
 *   2. `import.meta.env.VITE_POST_LOGIN_ROUTE` — the app's configured
 *      primary authenticated route. Setting this makes the fallback follow
 *      the app's REAL main surface (e.g. `/studio`, `/workspace`) instead of
 *      a hardcoded `/dashboard`.
 *   3. `/dashboard` — last-resort literal (the template's default protected
 *      route).
 *
 * WHY (issue #2524, app eVPKEj / "Thumbnail Studio"): the old hardcoded
 * `/dashboard` fallback dropped a paying buyer on a leftover PLACEHOLDER
 * `/dashboard` route that was never wired to the app's actual feature
 * (`/studio`) — a real dead-end after a real purchase, even though checkout
 * AND auth both succeeded. Tie the fallback to `VITE_POST_LOGIN_ROUTE` so
 * the destination follows the app's configured primary surface, and pass an
 * explicit `destination` from the offer page whenever the feature route is
 * known.
 */
export function resolvePostPurchaseDestination(explicit?: string | null): string {
  if (explicit) return explicit;

  const envRoute = import.meta.env.VITE_POST_LOGIN_ROUTE;
  if (envRoute) return envRoute;

  // Neither an explicit destination nor a configured primary route — we're
  // about to fall back to the bare `/dashboard` literal, which may be inert
  // template scaffolding (#2524). Leave a dev-only breadcrumb so this shows
  // up in local/QA consoles; NEVER throw (checkout must not break).
  if (import.meta.env.DEV) {
    console.warn(
      "[whop] post-purchase destination fell back to /dashboard. Pass an " +
        "explicit `destination` (the route that renders the paid feature) or " +
        "set VITE_POST_LOGIN_ROUTE, so buyers don't land on a placeholder page."
    );
  }
  return "/dashboard";
}

// ---------------------------------------------------------------------------
// postPurchaseRedirect — the canonical post-checkout routing helper.
// ---------------------------------------------------------------------------

/**
 * Route the buyer correctly AFTER a successful checkout — the single
 * canonical helper every `onComplete` should call.
 *
 * OverSkill's default purchase flow is purchase -> login/signup ->
 * access. The post-purchase destination (e.g. /dashboard) is ALWAYS
 * auth-gated (wrapped in <ProtectedRoute> or VITE_APP_VISIBILITY). So
 * `onComplete` must NEVER blind-navigate a signed-OUT buyer straight
 * into protected content — they'd just bounce to /login with no email
 * context and the purchase wouldn't reconcile to an account.
 *
 * The `destination` is resolved via `resolvePostPurchaseDestination`:
 * an explicit `opts.destination` wins, else `VITE_POST_LOGIN_ROUTE`,
 * else `/dashboard`. Pass the app's REAL primary route (the page that
 * renders the paid feature — e.g. `/studio`) as `destination` — do NOT
 * rely on the bare `/dashboard` literal, which may be a placeholder that
 * isn't wired to the feature the buyer paid for (#2524).
 *
 * This helper resolves that:
 *   - Signed-IN buyer  → navigate(destination) directly.
 *   - Signed-OUT buyer → navigate(/login?redirect=<destination>&claim=1
 *                        [&email=<buyer email>]). After they create /
 *                        sign into their account (with the prefilled
 *                        checkout email), the platform reconciles the
 *                        anonymous purchase to their new account by
 *                        email and <ProtectedRoute> lets them in.
 *
 * Pass the `user` from `useAuth()` (or null). Pass the buyer's
 * `email` (from `completeCheckout(...).memberEmail`) when you have it
 * so signup prefills the matching address — strongly recommended for
 * anonymous checkouts, since email-match is how the claim works.
 *
 * Always pair the embed with `returnUrl={`${window.location.origin}/checkout/complete`}`
 * (REQUIRED — without it Whop strands the buyer on its own hub after
 * purchase) plus a public `/checkout/complete` route that calls this
 * helper on `?status=success`. `onComplete` is the in-SPA happy path;
 * `returnUrl` is the guaranteed fallback when Whop does a full
 * top-window redirect.
 *
 * @example
 * ```tsx
 * const navigate = useNavigate();
 * const { user } = useAuth();
 *
 * // Pass the app's REAL primary route (the page that renders the paid
 * // feature) as `destination` — here `/studio`, not a placeholder.
 * <WhopCheckoutEmbed
 *   planId={import.meta.env.VITE_PLAN_PRO}
 *   returnUrl={`${window.location.origin}/checkout/complete`}
 *   onComplete={() => postPurchaseRedirect(navigate, user, { destination: "/studio" })}
 * />
 *
 * // With email prefill for the anonymous-buyer claim (recommended):
 * <WhopCheckoutEmbed
 *   planId={import.meta.env.VITE_PLAN_PRO}
 *   returnUrl={`${window.location.origin}/checkout/complete`}
 *   onComplete={async (planId, receiptId) => {
 *     const { memberEmail } = await completeCheckout({ planId, receiptId });
 *     postPurchaseRedirect(navigate, user, { destination: "/studio", email: memberEmail });
 *   }}
 * />
 * ```
 */
export function postPurchaseRedirect(
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  user: { email?: string } | null | undefined,
  opts: { destination?: string; email?: string | null } = {}
): void {
  // Resolve the app's real primary authenticated surface (explicit →
  // VITE_POST_LOGIN_ROUTE → /dashboard). NEVER a bare "/dashboard" literal
  // that might be placeholder scaffolding (#2524).
  const destination = resolvePostPurchaseDestination(opts.destination);

  // Signed-in buyer: go straight to the (auth-gated) destination.
  if (user) {
    navigate(destination);
    return;
  }

  // Signed-out buyer: send to login/signup with a return path + claim
  // marker, prefilling the checkout email when we have it so signup
  // matches the email the purchase was made under.
  const params = new URLSearchParams();
  params.set("redirect", destination);
  params.set("claim", "1");
  if (opts.email) {
    params.set("email", opts.email);
  } else {
    // Fallback: pull the email captured at checkout (onIdentityCaptured →
    // captureCheckoutEmail → sessionStorage) when the caller didn't thread
    // it explicitly. Without this, an anonymous buyer landed on a BLANK
    // sign-in/sign-up form — the captured email was stranded in
    // sessionStorage and never forwarded as the OAuth login_hint
    // (#1604/#1660; bolt-buy QA).
    const captured = readCapturedCheckoutEmail();
    if (captured) params.set("email", captured);
  }

  navigate(`/login?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// chargeUpsell
// ---------------------------------------------------------------------------

/**
 * Fire an off-session upsell charge against a saved payment method.
 *
 * Call this from upsell pages AFTER the user clicks "Yes, add it". The user
 * never sees a payment form — the saved card runs in the background.
 *
 * Provide EITHER `planId` (existing Whop plan — supports recurring) OR
 * `inlinePrice` (dollar amount for a one-time charge). Passing both is
 * an error.
 *
 * The worker returns `{success: true, paymentId}` on success or
 * `{success: false, error}` on decline / failure — this method does NOT
 * throw on payment failure, because most funnel flows treat a decline as
 * "skip the upsell" rather than an exceptional condition. It DOES throw
 * on network errors or 5xx from the worker.
 *
 * @example
 * ```tsx
 * const result = await chargeUpsell({
 *   memberId: funnel.memberId!,
 *   paymentMethodId: funnel.paymentMethodId!,
 *   planId: "plan_yyy",
 *   capability: funnel.whopCapability,
 *   metadata: { funnel_step: "upsell_1" },
 * });
 * if (result.success) {
 *   funnel.recordPurchase({ planId: "plan_yyy", paymentId: result.paymentId });
 *   navigate("/upsell-2");
 * } else {
 *   navigate("/downsell-1");
 * }
 * ```
 */
export async function chargeUpsell(
  opts: ChargeUpsellOptions
): Promise<ChargeUpsellResult> {
  if (!opts.memberId) throw new Error("chargeUpsell: memberId is required");
  if (!opts.paymentMethodId) {
    throw new Error("chargeUpsell: paymentMethodId is required");
  }
  if (!opts.planId && opts.inlinePrice == null) {
    throw new Error("chargeUpsell: provide either planId or inlinePrice");
  }
  if (opts.planId && opts.inlinePrice != null) {
    throw new Error("chargeUpsell: pass planId OR inlinePrice, not both");
  }
  const capability = opts.capability ?? readWhopCapability();
  if (whopCapabilityAuthzEnabled() && !capability) {
    throw new Error("chargeUpsell: capability is required");
  }

  const res = await fetch("/api/whop/charge", {
    method: "POST",
    headers: whopRequestHeaders(capability),
    body: JSON.stringify({
      member_id: opts.memberId,
      payment_method_id: opts.paymentMethodId,
      plan_id: opts.planId,
      inline_price: opts.inlinePrice,
      metadata: opts.metadata ?? {},
      description: opts.description,
      idempotency_key: opts.idempotencyKey ?? defaultChargeIdempotencyKey(opts),
    }),
  });

  if (res.status >= 500) {
    const body = await safeText(res);
    throw new Error(`chargeUpsell: server error ${res.status} ${body || ""}`);
  }

  const json = (await res.json()) as {
    success?: boolean;
    payment_id?: string;
    paymentId?: string;
    error?: string;
  };

  return {
    success: !!json.success,
    paymentId: json.paymentId ?? json.payment_id,
    error: json.error,
    memberId: opts.memberId,
  };
}

// ---------------------------------------------------------------------------
// listMemberships / cancelMembership — the upgrade double-billing fix.
//
// When a buyer upgrades (e.g. buys the ¥49,800 BREAKTHROUGH plan), their
// OLD plans (¥19,800 VSL/LP/WEBINAR) keep auto-renewing unless you cancel
// them. Whop treats every subscription as independent — there is no
// automatic stop. Use these to cancel the prior plan(s) at_period_end so
// the current period is honored (no refund) and the next renewal stops.
//
// Typical upgrade flow:
// ```ts
// const { memberId, capability } = await completeCheckout({ planId: BREAKTHROUGH, receiptId });
// // stop the old single-tier plans for THIS buyer, next renewal only:
// await cancelMembershipsForPlans({
//   userId: memberId,
//   planIds: [VSL_SCRIPT, LP_OFFER, WEBINAR],
//   capability,
// });
// ```
// Requires the app to have OverSkill Payments enabled (os-enable-payments
// + KYC). Without it these return a 503-backed error.
// ---------------------------------------------------------------------------

export interface Membership {
  id: string;
  status?: string;
  planId?: string;
  valid?: boolean;
  cancelAtPeriodEnd?: boolean;
  capability?: string | null;
}

/**
 * List the buyer's memberships under this app's sub-merchant. Pass a
 * `planId` to filter to a single plan. Used to resolve the membership id
 * to cancel on upgrade.
 */
export async function listMemberships(opts: {
  userId: string;
  planId?: string;
  capability?: string | null;
}): Promise<Membership[]> {
  if (!opts.userId) throw new Error("listMemberships: userId is required");
  const capability = opts.capability ?? readWhopCapability();
  if (whopCapabilityAuthzEnabled() && !capability) {
    throw new Error("listMemberships: capability is required");
  }
  const qs = new URLSearchParams({ user_id: opts.userId });
  if (opts.planId) qs.set("plan_id", opts.planId);

  const res = await fetch(`/api/whop/memberships?${qs.toString()}`, {
    method: "GET",
    headers: whopRequestHeaders(capability, { contentType: false }),
  });
  if (!res.ok) {
    const body = await safeText(res);
    throw new Error(`listMemberships: ${res.status} ${body || res.statusText}`);
  }
  const json = (await res.json()) as {
    memberships?: Array<{
      id: string;
      status?: string;
      plan_id?: string;
      valid?: boolean;
      cancel_at_period_end?: boolean;
      capability?: string | null;
      whop_capability?: string | null;
    }>;
  };
  return (json.memberships ?? []).map((m) => ({
    id: m.id,
    status: m.status,
    planId: m.plan_id,
    valid: m.valid,
    cancelAtPeriodEnd: m.cancel_at_period_end,
    capability: m.capability ?? m.whop_capability ?? null,
  }));
}

export interface CancelMembershipResult {
  success: boolean;
  membershipId?: string;
  status?: string;
  error?: string;
}

/**
 * Cancel a single membership. Defaults to period-end (stops the next
 * renewal, keeps access through the current paid period, NO refund of the
 * current period). Pass `immediate: true` to revoke access now.
 */
export async function cancelMembership(opts: {
  membershipId: string;
  immediate?: boolean;
  capability?: string | null;
}): Promise<CancelMembershipResult> {
  if (!opts.membershipId) {
    throw new Error("cancelMembership: membershipId is required");
  }
  const capability = opts.capability ?? readWhopCapability();
  if (whopCapabilityAuthzEnabled() && !capability) {
    throw new Error("cancelMembership: capability is required");
  }
  const res = await fetch("/api/whop/cancel", {
    method: "POST",
    headers: whopRequestHeaders(capability),
    body: JSON.stringify({
      membership_id: opts.membershipId,
      immediate: !!opts.immediate,
    }),
  });
  if (res.status >= 500) {
    const body = await safeText(res);
    throw new Error(`cancelMembership: server error ${res.status} ${body || ""}`);
  }
  const json = (await res.json()) as {
    success?: boolean;
    membership_id?: string;
    membershipId?: string;
    status?: string;
    error?: string;
  };
  return {
    success: !!json.success,
    membershipId: json.membershipId ?? json.membership_id ?? opts.membershipId,
    status: json.status,
    error: json.error,
  };
}

/**
 * Convenience: cancel ALL of a buyer's active memberships that match any of
 * `planIds`, at period-end. This is the one-liner for "on upgrade, stop the
 * old single-tier plans." Returns the per-membership results.
 */
export async function cancelMembershipsForPlans(opts: {
  userId: string;
  planIds: string[];
  immediate?: boolean;
  capability?: string | null;
}): Promise<CancelMembershipResult[]> {
  if (!opts.userId) throw new Error("cancelMembershipsForPlans: userId is required");
  const capability = opts.capability ?? readWhopCapability();
  if (whopCapabilityAuthzEnabled() && !capability) {
    throw new Error("cancelMembershipsForPlans: capability is required");
  }
  const wanted = new Set((opts.planIds ?? []).filter(Boolean));
  if (wanted.size === 0) return [];

  const memberships = await listMemberships({ userId: opts.userId, capability });
  const targets = memberships.filter(
    (m) =>
      m.planId &&
      wanted.has(m.planId) &&
      m.valid !== false &&
      !m.cancelAtPeriodEnd
  );

  const results: CancelMembershipResult[] = [];
  for (const m of targets) {
    try {
      results.push(
        await cancelMembership({
          membershipId: m.id,
          immediate: opts.immediate,
          capability: m.capability || capability,
        })
      );
    } catch (e) {
      results.push({
        success: false,
        membershipId: m.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// listenCheckoutMessages — helper for funnels that want to read the embed's
// raw postMessage stream (e.g. analytics on form interactions). Most funnels
// can use WhopCheckoutEmbed's `onComplete` prop and don't need this.
// ---------------------------------------------------------------------------

export interface CheckoutCompleteMessage {
  planId: string;
  receiptId: string;
}

export type CheckoutEventHandler = (e: CheckoutCompleteMessage) => void;

/**
 * Subscribe to Whop checkout completion postMessage events at the window
 * level. Returns an unsubscribe function. Filters out unrelated postMessages
 * automatically — handlers only fire for Whop checkout completions.
 *
 * Useful when you can't (or don't want to) wire onComplete directly on the
 * WhopCheckoutEmbed — e.g. an embed that lives in a third-party component.
 */
export function listenCheckoutMessages(handler: CheckoutEventHandler): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    // Whop's embed emits `event: "checkout-complete"` with planId + receiptId.
    if (data.event !== "checkout-complete") return;
    if (!data.planId || !data.receiptId) return;
    handler({ planId: data.planId, receiptId: data.receiptId });
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

// ---------------------------------------------------------------------------
// internal
// ---------------------------------------------------------------------------

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

// Resolve how long to wait before retrying a 429'd checkout-session mint.
// Prefers the standard `Retry-After` header (seconds), then a `retry_after`
// field the worker echoes in the JSON body, then a safe default. Clamped to
// 1..15s so a bad value can never hang the buyer on a spinner.
function parseRetryAfterMs(res: Response): number {
  const DEFAULT_MS = 2000;
  const MIN_MS = 1000;
  const MAX_MS = 15000;
  const clamp = (ms: number) => Math.min(MAX_MS, Math.max(MIN_MS, ms));

  const header = res.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return clamp(seconds * 1000);
  }
  return clamp(DEFAULT_MS);
}

function whopRequestHeaders(
  capability?: string | null,
  opts: { contentType?: boolean } = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (capability) headers["X-Whop-Capability"] = capability;
  if (opts.contentType !== false) headers["Content-Type"] = "application/json";

  try {
    const token = localStorage.getItem("overskill_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // localStorage unavailable — capability auth is enough for these calls.
  }

  return headers;
}

function whopCapabilityAuthzEnabled(): boolean {
  return import.meta.env.VITE_WHOP_CAPABILITY_AUTHZ_ENABLED === "true";
}

function defaultChargeIdempotencyKey(opts: ChargeUpsellOptions): string {
  const target = opts.planId
    ? `plan:${opts.planId}`
    : `inline:${Math.round(Number(opts.inlinePrice) * 100)}`;
  return stableIdempotencyKey([
    "whop-charge",
    opts.memberId,
    opts.paymentMethodId,
    target,
    opts.description || "",
  ].join("|"));
}

function stableIdempotencyKey(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  }
  return `idem_${h.toString(16)}`;
}
