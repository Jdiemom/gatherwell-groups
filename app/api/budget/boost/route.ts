import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendGroupEmail, sendAdvisorEmail } from "@/lib/notify";

const fmt = (x: number) => "$" + Math.round(x).toLocaleString("en-US");

/** A traveler pledges to boost the trip budget. Announces to the group exactly as previewed. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId, mode, amount, anonymous } = await request.json().catch(() => ({}));
  const amt = Math.round(Number(amount));
  if (!groupId || !["lump", "perPerson", "cover"].includes(mode) || (mode !== "cover" && (!amt || amt <= 0 || amt > 1000000))) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const [{ data: group }, { data: members }] = await Promise.all([
    admin.from("groups").select("id, name, owner_id, data").eq("id", groupId).maybeSingle(),
    admin.from("group_members").select("user_id, meta, profiles:user_id(name, email)").eq("group_id", groupId),
  ]);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  const me = (members ?? []).find((m) => m.user_id === user.id);
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const meP = me.profiles as unknown as { name: string | null; email: string | null } | null;
  const donor = anonymous ? "A generous member of your group" : meP?.name || meP?.email?.split("@")[0] || "A traveler";
  const headcount = (members ?? []).reduce((s, m) => s + ((m.meta as { answering_for?: string } | null)?.answering_for === "couple" ? 2 : 1), 0);
  const emails = (members ?? [])
    .map((m) => (m.profiles as unknown as { email: string | null } | null)?.email)
    .filter((e): e is string => !!e);
  const url = `${request.nextUrl.origin}/app/group/${groupId}`;

  // Record the pledge on the group
  const gdata = (group.data ?? {}) as Record<string, unknown>;
  const boosts = Array.isArray(gdata.boosts) ? (gdata.boosts as unknown[]) : [];
  await admin.from("groups").update({
    data: { ...gdata, boosts: [...boosts, { mode, amount: mode === "cover" ? null : amt, by: user.id, anonymous: !!anonymous }] },
  }).eq("id", groupId);

  const body =
    mode === "cover"
      ? `${donor} is covering the entire cost of this trip. Everything the group has planned is now fully funded. Say thank you, and start packing.`
      : mode === "perPerson"
      ? `${donor} just added ${fmt(amt)} per traveler to the trip budget. That's ${fmt(amt * headcount)} across your group of ${headcount}. The budget worksheet has room to breathe now.`
      : `${donor} just added ${fmt(amt)} to the trip fund. Spread across ${headcount} travelers, that's about ${fmt(amt / headcount)} more per person to play with.`;

  await sendGroupEmail({
    to: emails,
    subject: mode === "cover" ? `${group.name}: this trip is covered in full` : `${group.name}: the budget just went up`,
    heading: mode === "cover" ? `The whole trip is covered` : `A boost for the budget`,
    body,
    ctaUrl: url,
    ctaText: "See your trip",
  });

  // A full-coverage pledge is the highest-intent Full Service lead there is.
  if (mode === "cover") {
    await sendAdvisorEmail({
      subject: `[HOT LEAD] ${group.name}: one traveler covering the entire trip (${headcount} travelers)`,
      heading: `Full-coverage pledge in ${group.name}`,
      body: `${anonymous ? "An anonymous member" : donor} pledged to cover the whole trip for ${headcount} travelers. This is a Full Service conversation. Reply-to reaches them directly.`,
      replyTo: meP?.email ?? undefined,
    });
  }

  return NextResponse.json({ ok: true, donor, headcount });
}
