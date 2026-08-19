import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendGroupEmail } from "@/lib/notify";
import { STEPS } from "@/lib/steps";

/** Organizer opened or reopened a step → email the group. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId, stepN, kind } = await request.json().catch(() => ({}));
  const n = Number(stepN);
  if (!groupId || !n || n < 1 || n > 9 || !["opened", "reopened"].includes(kind)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: group } = await admin.from("groups").select("id, name, owner_id").eq("id", groupId).maybeSingle();
  if (!group || group.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the organizer can send step emails." }, { status: 403 });
  }

  const { data: members } = await admin
    .from("group_members")
    .select("user_id, profiles:user_id(email)")
    .eq("group_id", groupId);
  const emails = (members ?? [])
    .filter((m) => m.user_id !== user.id)
    .map((m) => (m.profiles as unknown as { email: string | null } | null)?.email)
    .filter((e): e is string => !!e);

  const step = STEPS[n - 1];
  const url = `${request.nextUrl.origin}/app/group/${groupId}`;
  const reopened = kind === "reopened";
  await sendGroupEmail({
    to: emails,
    subject: reopened
      ? `${group.name}: Step ${n} was reopened. Vote again`
      : `${group.name}: Step ${n} is open. Your vote is needed`,
    heading: `Step ${n}: ${step.t}`,
    body: reopened
      ? `Your organizer reopened this decision for ${group.name}. Something changed, so the group votes again. It takes about two minutes.`
      : `Your group ${group.name} is ready for its next decision: ${step.s.toLowerCase()}. Cast your vote so the trip keeps moving. It takes about two minutes.`,
    ctaUrl: url,
    ctaText: "Cast your vote",
  });

  return NextResponse.json({ ok: true, sent: emails.length });
}
