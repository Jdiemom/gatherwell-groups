import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/lib/stripe";
import { DEFAULT_POLLS } from "@/lib/steps";

function makeJoinCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let body: { name?: string; trip_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim().slice(0, 80);
  const tripType = String(body.trip_type ?? "").slice(0, 40);
  if (!name) return NextResponse.json({ error: "Give your trip a name." }, { status: 400 });

  const db = supabaseAdmin();

  // subscription check
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();
  const active = sub && ["active", "trialing"].includes(sub.status ?? "");
  if (!active) {
    return NextResponse.json(
      { error: "An active subscription is needed to start a group.", code: "no_subscription" },
      { status: 402 }
    );
  }
  const limits = PLAN_LIMITS[sub!.plan ?? "solo"] ?? PLAN_LIMITS.solo;

  const { count } = await db
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((count ?? 0) >= limits.groups) {
    return NextResponse.json(
      { error: `Your plan includes ${limits.groups} active trip${limits.groups > 1 ? "s" : ""}. Upgrade to add more.` },
      { status: 403 }
    );
  }

  // create group + membership + seeded polls
  const { data: group, error: gErr } = await db
    .from("groups")
    .insert({ name, trip_type: tripType, owner_id: user.id, join_code: makeJoinCode() })
    .select()
    .single();
  if (gErr || !group) {
    console.error("group create failed:", gErr?.message);
    return NextResponse.json({ error: "Couldn't create the group just now." }, { status: 500 });
  }

  await db.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "organizer" });

  for (const p of DEFAULT_POLLS) {
    const { data: poll } = await db
      .from("polls")
      .insert({ group_id: group.id, step_n: p.step_n, kind: p.kind, question: p.question })
      .select()
      .single();
    if (poll) {
      await db.from("poll_options").insert(
        p.options.map((o, i) => ({ poll_id: poll.id, label: o.label, meta: o.meta ?? null, sort: i }))
      );
    }
  }

  return NextResponse.json({ ok: true, id: group.id });
}
