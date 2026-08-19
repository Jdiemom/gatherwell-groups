import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdvisorEmail } from "@/lib/notify";
import { STEPS } from "@/lib/steps";

/** Concierge-tier member asks their advisor a question → high-priority email to Gatherwell with full context. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId, stepN, message } = await request.json().catch(() => ({}));
  const n = Number(stepN);
  const text = String(message ?? "").slice(0, 2000).trim();
  if (!groupId || !n || n < 1 || n > 9 || !text) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const [{ data: group }, { data: members }, { data: progress }] = await Promise.all([
    admin.from("groups").select("id, name, owner_id, data").eq("id", groupId).maybeSingle(),
    admin.from("group_members").select("user_id, meta, profiles:user_id(name, email)").eq("group_id", groupId),
    admin.from("step_progress").select("step_n").eq("group_id", groupId),
  ]);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  const me = (members ?? []).find((m) => m.user_id === user.id);
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const { data: sub } = await admin.from("subscriptions").select("plan, status").eq("user_id", group.owner_id).maybeSingle();
  if (sub?.plan !== "concierge") {
    return NextResponse.json({ error: "Concierge support is part of the Concierge plan." }, { status: 403 });
  }

  const meP = me.profiles as unknown as { name: string | null; email: string | null } | null;
  const fromName = meP?.name || meP?.email?.split("@")[0] || "A traveler";
  const headcount = (members ?? []).reduce((s, m) => s + ((m.meta as { answering_for?: string } | null)?.answering_for === "couple" ? 2 : 1), 0);
  const doneSteps = (progress ?? []).map((p) => p.step_n).sort((a, b) => a - b).join(", ") || "none yet";
  const gd = (group.data ?? {}) as { destination?: string; tripLength?: number | string };

  await sendAdvisorEmail({
    subject: `[CONCIERGE] ${group.name} · Step ${n} question from ${fromName}`,
    heading: `Concierge question · ${group.name}`,
    body: `<b>${fromName}</b> asks, on Step ${n} (${STEPS[n - 1].t}):<br/><br/>&ldquo;${text}&rdquo;`,
    extraHtml: `<p style="margin:0;font-size:13px;color:#6B6259;">
      Group: ${group.name} · ${headcount} travelers<br/>
      Steps completed: ${doneSteps}<br/>
      Trip length: ${gd.tripLength ?? "not set"} · Destination: ${gd.destination ?? "not decided"}<br/>
      Reply directly to this email to reach ${fromName}.</p>`,
    replyTo: meP?.email ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
