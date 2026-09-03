# ReliefRead Stripe rollout

## Current tester phase

ReliefRead is running with `VITE_TESTER_MODE=true` and
`VITE_BILLING_PROVIDER=none`. Signed-in testers can use premium features with
no payment details and no subscription.

Before opening payments, set tester mode to `false` and enable Stripe only
after the checkout endpoint and webhook described below are live.

## Stripe products to create

Create one product named **ReliefRead Premium** with two recurring prices:

| Price | Billing period | Suggested launch price |
| --- | --- | --- |
| Premium Monthly | Monthly | 49 DKK |
| Premium Annual | Yearly | 490 DKK |

Save the two Stripe Price IDs. They are safe to use in browser build
configuration, but Stripe secret keys are not.

## Required secure backend

GitHub Pages is static, so it cannot safely create checkout sessions or verify
webhooks. Add a small server-side endpoint before enabling billing:

1. `POST /api/stripe/create-checkout-session` accepts a selected Price ID and
   the signed-in ReliefRead user ID.
2. The endpoint creates a Stripe Checkout subscription session and returns its URL.
3. `POST /api/stripe/webhook` verifies Stripe's signature.
4. The webhook updates the user's ReliefRead plan when payment or subscription
   status changes.
5. The Stripe secret key and webhook secret live only in that backend's secret store.

## Frontend configuration after the backend exists

```text
VITE_TESTER_MODE=false
VITE_BILLING_PROVIDER=stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
VITE_STRIPE_PRICE_PREMIUM_ANNUAL=price_...
VITE_STRIPE_CHECKOUT_ENDPOINT=https://api.reliefread.com/api/stripe/create-checkout-session
```

Use Stripe test mode first with `pk_test_...` and test Price IDs. Verify that a
successful payment grants Premium and cancellation returns the user to Free at
the end of the paid period.
