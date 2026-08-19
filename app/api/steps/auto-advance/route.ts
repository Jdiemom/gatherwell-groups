import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendGroupEmail } from "@/lib/notify";
import { tripVisionHtml } from "@/lib/synopsis";
import { STEPS } from "@/lib/steps";

type PollRow = {
  id: string;
  kind: string;
  question: string;
  poll_options: { id: string; label: string }[];
  votes: { option_id: string; user_id: string }[];
  date_votes: { option_id: string; user_id: string; answer: string }[];
};

/**
 * Called after a member votes. If EVERY member has answered EVERY poll in the step
 * (for date polls: every date), the step completes itself and the whole group is
 * emailed the results plus the next step's opening bell. Server-verified; the
 * client is not trusted.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId, stepN } = await request.json().catch(() => ({}));
  const n = Number(stepN);
  if (!groupId || !n || n < 1 || n > 9) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: members } = await admin
    .from("group_members")
    .select("user_id, profiles:user_id(email)")
    .eq("group_id", groupId);
  const memberIds = (members ?? []).map((m) => m.user_id);
  if (!memberIds.includes(user.id)) {
    return NextResponse.json({ error: "Not a member of this group." }, { status: 403 });
  }

  const { data: done } = await admin
    .from("step_progress")
    .select("step_n")
    .eq("group_id", groupId)
    .eq("step_n", n)
    .maybeSingle();
  if (done) return NextResponse.json({ advanced: false });

  const { data: pollsRaw } = await admin
    .from("polls")
    .select("id, kind, question, poll_options(id, label), votes(option_id, user_id), date_votes(option_id, user_id, answer)")
    .eq("group_id", groupId)
    .eq("step_n", n);
  const polls = (pollsRaw ?? []) as unknown as PollRow[];
  if (polls.length === 0) return NextResponse.json({ advanced: false });

  const everyoneVoted = polls.every((p) => {
    if (p.kind === "dates") {
      return memberIds.every((id) =>
        p.poll_options.every((o) => (p.date_votes ?? []).some((v) => v.user_id === id && v.option_id === o.id))
      );
    }
    const voters = new Set((p.votes ?? []).map((v) => v.user_id));
    return memberIds.every((id) => voters.has(id));
  });
  if (!everyoneVoted) return NextResponse.json({ advanced: false });

  const { data: group } = await admin.from("groups").select("id, name, owner_id").eq("id", groupId).maybeSingle();
  if (!group) return NextResponse.json({ advanced: false });

  const { error } = await admin
    .from("step_progress")
    .upsert({ group_id: groupId, step_n: n, completed_by: group.owner_id });
  if (error) return NextResponse.json({ error: "Couldn't complete the step." }, { status: 500 });

  /* ---------- results the group actually wants to see ---------- */
  let extraHtml = "";

  if (n === 2) {
    // Dream & Align → the Trip Vision synopsis
    extraHtml = tripVisionHtml(
      group.name,
      polls.filter((p) => p.kind !== "dates").map((p) => ({ question: p.question, options: p.poll_options, votes: p.votes ?? [] })),
      memberIds.length
    );
  } else {
    const sections: string[] = [];
    for (const p of polls) {
      if (p.kind === "dates") {
        const rows = p.poll_options
          .map((o) => {
            const dv = (p.date_votes ?? []).filter((v) => v.option_id === o.id);
            const yes = dv.filter((v) => v.answer === "yes").length;
            const maybe = dv.filter((v) => v.answer === "maybe").length;
            const no = dv.filter((v) => v.answer === "no").length;
            return { o, yes, maybe, no };
          })
          .sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no);
        const best = rows[0];
        sections.push(
          `<div style="font-family:Georgia,serif;font-size:16px;color:#332E29;margin-bottom:10px;">${p.question}</div>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;">
            ${rows
              .map(
                (r) => `<tr>
                <td style="padding:7px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;${r === best ? "font-weight:bold;" : ""}">${r.o.label}${r === best ? ' <span style="color:#5C6E4E;font-size:11px;letter-spacing:1px;">WINNER</span>' : ""}</td>
                <td style="padding:7px 0 7px 14px;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;white-space:nowrap;text-align:right;">${r.yes} yes · ${r.maybe} maybe · ${r.no} no</td>
              </tr>`
              )
              .join("")}
          </table>`
        );
      } else {
        const counts = p.poll_options
          .map((o) => ({ o, c: (p.votes ?? []).filter((v) => v.option_id === o.id).length }))
          .sort((a, b) => b.c - a.c);
        const win = counts[0];
        if (win && win.c > 0) {
          sections.push(
            `<p style="margin:0 0 10px;"><span style="color:#6B6259;">${p.question}</span><br/><b style="color:#332E29;">${win.o.label}</b> <span style="color:#6B6259;font-size:13px;">(${win.c} of ${memberIds.length} votes)</span></p>`
          );
        }
      }
    }
    extraHtml = sections.join("");
  }

  const emails = (members ?? [])
    .map((m) => (m.profiles as unknown as { email: string | null } | null)?.email)
    .filter((e): e is string => !!e);
  const url = `${request.nextUrl.origin}/app/group/${groupId}`;
  const next = n < 9 ? STEPS[n] : null;

  await sendGroupEmail({
    to: emails,
    subject:
      n === 2
        ? `${group.name}: your Trip Vision is in`
        : next
        ? `${group.name}: everyone voted! Step ${n + 1} is open`
        : `${group.name}: Step 9 is decided`,
    heading:
      n === 2
        ? `${group.name} knows what it wants`
        : next
        ? `Step ${n} is decided. On to Step ${n + 1}: ${next.t}`
        : `Step ${n} is decided`,
    body:
      n === 2
        ? `Every traveler has weighed in on the dream. Here is what your group said, and what it means for the trip.`
        : next
        ? `Every traveler voted on Step ${n} (${STEPS[n - 1].t}), so it locked in automatically. Here are the results. The next decision is already open.`
        : `Every traveler has voted. Your organizer can now generate the final outputs.`,
    ctaUrl: url,
    ctaText: next ? "Vote on the next step" : "See your trip",
    extraHtml,
  });

  return NextResponse.json({ advanced: true, nextStep: n < 9 ? n + 1 : null });
}
