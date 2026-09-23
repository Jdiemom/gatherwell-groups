import { NextResponse, type NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Which plan is this group on?
 *
 * The group's tier is the organizer's subscription, and it decides what the step
 * screens show: the Concierge advisor panel, and the Solo upgrade prompts. On the
 * website a server component reads it with the service role, because row level
 * security only ever lets someone read their OWN subscription row. The mobile app
 * talks to Supabase directly and so cannot read the organizer's row at all, which
 * is why it asks here instead.
 *
 * Only a member of the group gets an answer, and the answer is only the plan name.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseRoute(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { groupId } = await request.json().catch(() => ({ groupId: "" }));
  if (!groupId) return NextResponse.json({ error: "Missing group." }, { status: 400 });

  const db = supabaseAdmin();

  // Membership is checked before anything is disclosed.
  const { data: membership } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not your group." }, { status: 403 });
  }

  const { data: group } = await db
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", group.owner_id)
    .maybeSingle();

  // Same default the website uses when there is no subscription row yet.
  return NextResponse.json({ plan: sub?.plan ?? "group" });
}
