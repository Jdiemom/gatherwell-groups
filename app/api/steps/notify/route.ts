import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendGroupEmail } from "@/lib/notify";
import { STEPS } from "@/lib/steps";

/** Organizer opened or reopened a step → email the group (only when there's something to do). */
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
    .select("user_id, role, profiles:user_id(name, email)")
    .eq("group_id", groupId);
  const people = (members ?? []).map((m) => {
    const p = m.profiles as unknown as { name: string | null; email: string | null } | null;
    return {
      user_id: m.user_id,
      role: m.role,
      name: p?.name || p?.email?.split("@")[0] || "Traveler",
      email: p?.email ?? null,
    };
  });
  const emails = people
    .filter((p) => p.user_id !== user.id)
    .map((p) => p.email)
    .filter((e): e is string => !!e);

  const { count: pollCount } = await admin
    .from("polls")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("step_n", n);
  const hasPolls = (pollCount ?? 0) > 0;
  const reopened = kind === "reopened";

  // Reopening a step with nothing to vote on is an organizer housekeeping move; no email.
  if (reopened && !hasPolls) return NextResponse.json({ ok: true, sent: 0 });

  const step = STEPS[n - 1];
  const url = `${request.nextUrl.origin}/app/group/${groupId}`;

  // Step 2 opening means Step 1 (the crew) just closed: send the roster with it.
  let extraHtml = "";
  let heading = `Step ${n}: ${step.t}`;
  let body = reopened
    ? `Your organizer reopened this decision for ${group.name}. Something changed, so the group votes again. It takes about two minutes.`
    : `Your group ${group.name} is ready for its next decision: ${step.s.toLowerCase()}. ${hasPolls ? "Cast your vote so the trip keeps moving. It takes about two minutes." : "Take a look so the trip keeps moving."}`;

  if (!reopened && n === 2) {
    heading = `Your crew is set. Now the fun part`;
    body = `Everyone is in for ${group.name}. Here's who's coming, and the first real decision is open: what kind of trip is this? Cast your votes.`;
    extraHtml = `<div style="font-family:Georgia,serif;font-size:16px;color:#332E29;margin-bottom:10px;">The crew (${people.length})</div>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${people
          .map(
            (p) => `<tr><td style="padding:7px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;">${p.name}${p.role === "organizer" ? ' <span style="color:#B08A3E;font-size:11px;letter-spacing:1px;">ORGANIZER</span>' : ""}</td></tr>`
          )
          .join("")}
      </table>`;
  }

  await sendGroupEmail({
    to: emails,
    subject: reopened
      ? `${group.name}: Step ${n} was reopened. Vote again`
      : n === 2
      ? `${group.name}: the crew is set. First votes are open`
      : `${group.name}: Step ${n} is open${hasPolls ? ". Your vote is needed" : ""}`,
    heading,
    body,
    ctaUrl: url,
    ctaText: hasPolls ? "Cast your vote" : "Open your trip",
    extraHtml,
  });

  return NextResponse.json({ ok: true, sent: emails.length });
}
