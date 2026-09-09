/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_TESTER_MODE?: string;
  readonly VITE_BILLING_PROVIDER?: "none" | "stripe";
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICE_PREMIUM_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_PREMIUM_ANNUAL?: string;
  readonly VITE_STRIPE_CHECKOUT_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
