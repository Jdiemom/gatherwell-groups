import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const code = String(body.code ?? "").trim().toLowerCase();
  if (!code) return NextResponse.json({ error: "Missing invite code." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: group } = await db
    .from("groups")
    .select("id, name, owner_id")
    .eq("join_code", code)
    .maybeSingle();
  if (!group) {
    return NextResponse.json({ error: "That invite link doesn't match any group." }, { status: 404 });
  }

  // traveler cap from the owner's plan
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan")
    .eq("user_id", group.owner_id)
    .maybeSingle();
  const limits = PLAN_LIMITS[sub?.plan ?? "solo"] ?? PLAN_LIMITS.solo;
  const { count } = await db
    .from("group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", group.id);
  if ((count ?? 0) >= limits.travelers) {
    return NextResponse.json(
      { error: "This group is at its plan's traveler limit. Ask the organizer to upgrade." },
      { status: 403 }
    );
  }

  const { error } = await db
    .from("group_members")
    .upsert({ group_id: group.id, user_id: user.id, role: "member" });
  if (error) {
    console.error("join failed:", error.message);
    return NextResponse.json({ error: "Couldn't join just now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: group.id, name: group.name });
}
