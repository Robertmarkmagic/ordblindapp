// ReliefRead plans, limits, and the demo unlock.
//
// Tone rule (from the brief): the paywall is an INVITATION, never a punishment.
// Nothing here ever hard-blocks the app — free limits show a warm full-state
// with BOTH "upgrade" and "come back on the 1st" equally weighted, and the
// premium TTS fair-use gate silently falls back to the standard browser voice
// with a kind note. Saved audio always replays free.

import { overskill } from "@/lib/auth";
import {
  loadReadingSettings,
  saveReadingSettings,
  type PlanChoice,
} from "@/lib/reading-settings";
import { getMonthlyUsage } from "@/lib/usage";

export type BillingProvider = "none" | "overskill" | "stripe";

const configuredProvider = import.meta.env.VITE_BILLING_PROVIDER as BillingProvider | undefined;

/**
 * Test mode grants signed-in testers all premium features without collecting
 * payment details. It is intentionally controlled at build time, so it can be
 * switched off before the public paid launch.
 */
export const TESTER_MODE = import.meta.env.VITE_TESTER_MODE === "true";

/**
 * Stripe is only enabled once a server-side Checkout endpoint exists. Secret
 * keys and webhook secrets must never be added to this browser application.
 */
export const BILLING_PROVIDER: BillingProvider =
  configuredProvider === "stripe" || configuredProvider === "overskill"
    ? configuredProvider
    : "none";

export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined,
  monthlyPriceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY as string | undefined,
  annualPriceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL as string | undefined,
  checkoutEndpoint: import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT as string | undefined,
} as const;

export const stripeCheckoutReady =
  BILLING_PROVIDER === "stripe" &&
  Boolean(
    STRIPE_CONFIG.publishableKey &&
      STRIPE_CONFIG.monthlyPriceId &&
      STRIPE_CONFIG.annualPriceId &&
      STRIPE_CONFIG.checkoutEndpoint
  );

/** Free plan: 3 fresh documents per calendar month. */
export const FREE_MONTHLY_DOCUMENTS = 3;
/** Free plan: 1 active public share link at a time. */
export const FREE_ACTIVE_SHARE_LINKS = 1;
/** Premium fair use: 90 minutes of FRESH AI-voice generation per month. */
export const PREMIUM_TTS_SECONDS = 5400;
/** The discreet competition unlock code. */
export const DEMO_CODE = "DEMO2026";

export const PRICING = {
  monthly: { price: "$7", cadence: "/month" },
  annual: { price: "$59", cadence: "/year", note: "2 months free" },
} as const;

export interface PlanUsage {
  plan: PlanChoice;
  settingsId?: string;
  documentsCreated: number;
  ttsSecondsUsed: number;
}

/** Load the current user's plan + this month's usage in one call. */
export async function loadPlanUsage(): Promise<PlanUsage> {
  const [settings, usage] = await Promise.all([loadReadingSettings(), getMonthlyUsage()]);
  return {
    plan: settings.plan,
    settingsId: settings.id,
    documentsCreated: usage.documentsCreated,
    ttsSecondsUsed: usage.ttsSecondsUsed,
  };
}

/** Premium is unlimited; free is capped at 3 fresh documents / month. */
export function canCreateDocument(u: Pick<PlanUsage, "plan" | "documentsCreated">): boolean {
  if (u.plan === "premium") return true;
  return u.documentsCreated < FREE_MONTHLY_DOCUMENTS;
}

/** How many free documents remain this month (never negative). */
export function documentsRemaining(documentsCreated: number): number {
  return Math.max(0, FREE_MONTHLY_DOCUMENTS - documentsCreated);
}

/** Whole minutes of fresh AI narration left this month (premium fair use). */
export function aiMinutesRemaining(ttsSecondsUsed: number): number {
  return Math.max(0, Math.floor((PREMIUM_TTS_SECONDS - ttsSecondsUsed) / 60));
}

/**
 * True once a PREMIUM user has spent this month's 90 minutes of fresh AI voice.
 * Fresh generations then fall back to the browser voice; cached replays stay
 * free and unlimited, so this never applies to already-generated audio.
 */
export function isFreshTtsExhausted(plan: PlanChoice, ttsSecondsUsed: number): boolean {
  return plan === "premium" && ttsSecondsUsed >= PREMIUM_TTS_SECONDS;
}

/** The 1st of next month, phrased warmly for reset copy. */
export function nextResetLabel(): string {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/**
 * Redeem the demo code. On a match: flip the user's plan to premium (stored on
 * their user_setting row) and log the activation. Returns { ok } so the caller
 * can show a warm success or a gentle "that code didn't work".
 */
export async function redeemDemoCode(code: string): Promise<{ ok: boolean }> {
  const normalized = (code || "").trim().toUpperCase();
  if (normalized !== DEMO_CODE) return { ok: false };

  const settings = await loadReadingSettings();
  await saveReadingSettings({ ...settings, plan: "premium" });

  // Log the activation (best-effort — never block the unlock over the log).
  try {
    await overskill.entities.demo_activation.create({
      code: normalized,
      activated_plan: "premium",
    });
  } catch (err) {
    console.warn("[billing] demo activation log failed:", err);
  }

  // Let entitlement-aware surfaces refresh immediately.
  try {
    window.dispatchEvent(new Event("overskill:entitlement-changed"));
  } catch {
    /* SSR / non-browser — ignore */
  }
  return { ok: true };
}

/**
 * Self-serve downgrade — the calm "cancel" path for the demo/plan-flag unlock.
 * Sets the user back to Free (their saved audio and readings are untouched).
 * A real paid subscription is cancelled by the buyer from their account; this
 * covers the competition/demo flow and satisfies "a cancellation path exists".
 */
export async function downgradeToFree(): Promise<void> {
  const settings = await loadReadingSettings();
  await saveReadingSettings({ ...settings, plan: "free" });
  try {
    window.dispatchEvent(new Event("overskill:entitlement-changed"));
  } catch {
    /* SSR / non-browser — ignore */
  }
}
