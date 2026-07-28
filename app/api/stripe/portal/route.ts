import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const stripe = stripeClient();
  if (!stripe) return NextResponse.redirect(new URL("/app?billing=unconfigured", url.origin));

  const db = supabaseAdmin();
  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/app", url.origin));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${url.origin}/app`,
  });
  return NextResponse.redirect(session.url, { status: 303 });
}
