import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdvisorEmail } from "@/lib/notify";

const fmt = (x: number) => "$" + Math.round(x).toLocaleString("en-US");

/** Organizer asks Gatherwell to pull villa/cruise options. Arrives with the group's full context. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId, preferences } = await request.json().catch(() => ({}));
  if (!groupId) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const admin = supabaseAdmin();
  const [{ data: group }, { data: members }] = await Promise.all([
    admin.from("groups").select("id, name, owner_id, data").eq("id", groupId).maybeSingle(),
    admin.from("group_members").select("user_id, meta, profiles:user_id(name, email)").eq("group_id", groupId),
  ]);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.owner_id !== user.id) return NextResponse.json({ error: "Organizer only." }, { status: 403 });

  type Meta = { answering_for?: string; kids?: number; kid_ages?: string };
  const seats = (members ?? []).reduce((s, m) => {
    const meta = (m.meta ?? {}) as Meta;
    return s + (meta.answering_for === "couple" ? 2 : 1) + (meta.kids ?? 0);
  }, 0);
  const adults = (members ?? []).reduce((s, m) => s + (((m.meta ?? {}) as Meta).answering_for === "couple" ? 2 : 1), 0);
  const kids = seats - adults;
  const ages = (members ?? [])
    .map((m) => ((m.meta ?? {}) as Meta).kid_ages)
    .filter(Boolean)
    .join(", ");

  const gd = (group.data ?? {}) as {
    destination?: string;
    tripLength?: number | string;
    dates?: { start: string; nights: number };
    budget?: { flights: number; stay: number; activities: number; food: number };
  };
  const b = gd.budget;
  const perPerson = b ? Math.round((b.flights + b.stay + b.activities + b.food) * 1.1) : null;
  const stayBudget = b ? b.stay : null;

  const ownerP = (members ?? []).find((m) => m.user_id === group.owner_id)?.profiles as unknown as { name: string | null; email: string | null } | null;

  await sendAdvisorEmail({
    subject: `[HOT LEAD] Stay options request · ${group.name} (${seats} travelers)`,
    heading: `${group.name} wants stay options`,
    body: `The organizer tapped &ldquo;Request options from Gatherwell.&rdquo; Reply to this email to reach them directly.`,
    extraHtml: `<table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;">Travelers</td><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;text-align:right;">${seats} (${adults} adults${kids > 0 ? `, ${kids} kids: ${ages || "ages n/a"}` : ""})</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;">Dates</td><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;text-align:right;">${gd.dates ? `${gd.dates.start} · ${gd.dates.nights} nights` : `not locked (length: ${gd.tripLength ?? "not set"})`}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;">Destination</td><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;text-align:right;">${gd.destination ?? "not decided"}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;">Budget</td><td style="padding:6px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;text-align:right;">${perPerson ? `${fmt(perPerson)}/person all-in · ${fmt(stayBudget!)}/person for the stay` : "not set"}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#6B6259;">Preferences</td><td style="padding:6px 0;font-size:14px;color:#332E29;text-align:right;">${String(preferences ?? "").slice(0, 500) || "none given"}</td></tr>
    </table>`,
    replyTo: ownerP?.email ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
