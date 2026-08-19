import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdvisorEmail } from "@/lib/notify";

/** Sends Gatherwell a group-flight-quote lead with who wants in and their home airports. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId } = await request.json().catch(() => ({}));
  if (!groupId) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const admin = supabaseAdmin();
  const [{ data: group }, { data: members }, { data: polls }] = await Promise.all([
    admin.from("groups").select("id, name, owner_id, data").eq("id", groupId).maybeSingle(),
    admin.from("group_members").select("user_id, meta, profiles:user_id(name, email)").eq("group_id", groupId),
    admin.from("polls").select("id, question, poll_options(id, label), votes(option_id, user_id)").eq("group_id", groupId).eq("step_n", 6),
  ]);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.owner_id !== user.id) return NextResponse.json({ error: "Organizer only." }, { status: 403 });

  const bookingPoll = (polls ?? []).find((p) => p.question.toLowerCase().includes("booking flights"));
  const quoteOption = bookingPoll?.poll_options.find((o) => o.label.toLowerCase().includes("group quote"));
  const quoteVoters = quoteOption
    ? (bookingPoll!.votes ?? []).filter((v) => v.option_id === quoteOption.id).map((v) => v.user_id)
    : [];
  if (quoteVoters.length === 0) return NextResponse.json({ ok: false, seats: 0 });

  const rows = (members ?? [])
    .filter((m) => quoteVoters.includes(m.user_id))
    .map((m) => {
      const p = m.profiles as unknown as { name: string | null; email: string | null } | null;
      const meta = (m.meta ?? {}) as { answering_for?: string; partner_name?: string; home_airport?: string };
      const who = meta.answering_for === "couple" && meta.partner_name
        ? `${p?.name ?? "Traveler"} & ${meta.partner_name}`
        : p?.name || p?.email?.split("@")[0] || "Traveler";
      return { who, airport: meta.home_airport || "unknown", seats: meta.answering_for === "couple" ? 2 : 1 };
    });

  const seatCount = rows.reduce((s, r) => s + r.seats, 0);
  const byCity: Record<string, number> = {};
  for (const r of rows) byCity[r.airport] = (byCity[r.airport] ?? 0) + r.seats;
  const cityLine = Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${k} from ${c}`).join(" · ");
  const gd = (group.data ?? {}) as { destination?: string; tripLength?: number | string };

  await sendAdvisorEmail({
    subject: `[LEAD] Group flight quote · ${group.name} (${seatCount} seats)`,
    heading: `Group flight quote request`,
    body: `${group.name} wants a group air quote. ${seatCount} seats requested. ${cityLine || ""}<br/>Destination: ${gd.destination ?? "not decided"} · Trip length: ${gd.tripLength ?? "not set"}.`,
    extraHtml: `<table cellpadding="0" cellspacing="0" width="100%">
      ${rows.map((r) => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;">${r.who}</td>
        <td style="padding:6px 0 6px 12px;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;text-align:right;">${r.airport} · ${r.seats} seat${r.seats > 1 ? "s" : ""}</td>
      </tr>`).join("")}
    </table>
    <p style="margin:12px 0 0;font-size:13px;color:#6B6259;">Reminder: group quotes need 10+ from one departure city. Reply to this email to reach the organizer.</p>`,
    replyTo: (members ?? []).find((m) => m.user_id === group.owner_id)
      ? ((members ?? []).find((m) => m.user_id === group.owner_id)!.profiles as unknown as { email: string | null })?.email ?? undefined
      : undefined,
  });

  return NextResponse.json({ ok: true, seats: seatCount });
}
