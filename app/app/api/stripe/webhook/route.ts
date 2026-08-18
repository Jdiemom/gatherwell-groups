import Stripe from "stripe";
import { stripeClient, planFromPriceId } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return Response.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, secret);
  } catch (err) {
    console.error("webhook signature verification failed:", (err as Error).message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  async function upsertFromSubscription(sub: Stripe.Subscription) {
    const userId = (sub.metadata && sub.metadata.user_id) || null;
    if (!userId) return;
    const item = sub.items.data[0];
    const plan =
      planFromPriceId(item?.price?.id) || (sub.metadata && sub.metadata.plan) || null;
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null;
    await db.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          if (!sub.metadata?.user_id && session.metadata?.user_id) {
            sub.metadata = { ...sub.metadata, user_id: session.metadata.user_id, plan: session.metadata.plan };
          }
          await upsertFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("webhook handling failed:", (err as Error).message);
    return Response.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}
