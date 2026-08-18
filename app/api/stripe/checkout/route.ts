import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { stripeClient, PLAN_PRICES } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const plan = url.searchParams.get("plan") || "group";

  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL(`/login?plan=${plan}`, url.origin));
    }

    const stripe = stripeClient();
    const price = PLAN_PRICES[plan];
    if (!stripe) {
      return NextResponse.json({ error: "Billing is not configured: STRIPE_SECRET_KEY is missing." }, { status: 500 });
    }
    if (!price) {
      return NextResponse.json({ error: `Billing is not configured: no price ID found for plan "${plan}".` }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      allow_promotion_codes: true,
      success_url: `${url.origin}/app?welcome=1`,
      cancel_url: `${url.origin}/#pricing`,
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("checkout failed:", message);

    const key = process.env.STRIPE_SECRET_KEY || "";
    const keyMode = key.startsWith("sk_test_") ? "test"
      : key.startsWith("sk_live_") ? "LIVE"
      : key.startsWith("rk_") ? "restricted"
      : key ? "unrecognized" : "missing";
    let keyIsLiveMode: boolean | null = null;
    try {
      const stripe2 = stripeClient();
      if (stripe2) keyIsLiveMode = (await stripe2.balance.retrieve()).livemode;
    } catch { /* ignore */ }

    return NextResponse.json(
      {
        error: "Checkout could not start.",
        reason: message,
        diagnostics: {
          key_type: keyMode,
          key_label: key.slice(0, 8),
          key_length: key.length,
          key_reaches_live_mode: keyIsLiveMode,
          price_attempted: PLAN_PRICES[plan] ?? null,
        },
      },
      { status: 500 }
    );
  }
}
