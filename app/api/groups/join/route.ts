import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/lib/stripe";
import { sendPersonalEmails } from "@/lib/notify";

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

  // Tell the organizer someone arrived (best-effort; never blocks the join).
  try {
    if (user.id !== group.owner_id) {
      const [{ data: owner }, { data: joiner }] = await Promise.all([
        db.from("profiles").select("email").eq("id", group.owner_id).maybeSingle(),
        db.from("profiles").select("name, email").eq("id", user.id).maybeSingle(),
      ]);
      const joinerName = joiner?.name || joiner?.email?.split("@")[0] || "A traveler";
      if (owner?.email) {
        await sendPersonalEmails([{
          to: owner.email,
          subject: `${group.name}: ${joinerName} just joined`,
          heading: `${joinerName} is in`,
          body: `${joinerName} accepted your invite to ${group.name}. Once everyone's aboard, complete Step 1 and the first votes go out.`,
          ctaUrl: `${request.nextUrl.origin}/app/group/${group.id}`,
          ctaText: "See your crew",
        }]);
      }
    }
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, id: group.id, name: group.name });
}
