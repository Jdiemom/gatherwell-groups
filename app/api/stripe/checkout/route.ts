import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { stripeClient, PLAN_PRICES } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const plan = url.searchParams.get("plan") || "group";

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?plan=${plan}`, url.origin));
  }

  const stripe = stripeClient();
  const price = PLAN_PRICES[plan];
  if (!stripe || !price) {
    return NextResponse.redirect(new URL(`/app?billing=unconfigured`, url.origin));
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
}
