import Stripe from "stripe";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const PLAN_PRICES: Record<string, string | undefined> = {
  solo: process.env.STRIPE_PRICE_SOLO,
  group: process.env.STRIPE_PRICE_GROUP,
  concierge: process.env.STRIPE_PRICE_CONCIERGE,
};

export function planFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  for (const [plan, id] of Object.entries(PLAN_PRICES)) {
    if (id === priceId) return plan;
  }
  return null;
}

export const PLAN_LIMITS: Record<string, { groups: number; travelers: number }> = {
  solo: { groups: 1, travelers: 8 },
  group: { groups: 3, travelers: 100 },
  concierge: { groups: 3, travelers: 100 },
};
