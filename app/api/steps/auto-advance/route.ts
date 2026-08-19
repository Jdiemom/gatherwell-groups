import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendGroupEmail, sendPersonalEmails, sendAdvisorEmail } from "@/lib/notify";
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
type MemberRow = {
  user_id: string;
  role: string;
  meta: { answering_for?: string; partner_name?: string; home_airport?: string } | null;
  profiles: { name: string | null; email: string | null } | null;
};
type GroupData = {
  decisions?: Record<string, string>;
  discuss?: { whatsapp?: string; video?: string };
  destination?: string;
  _notified?: Record<string, number>;
  [k: string]: unknown;
};

const clean = (s: string) => s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { groupId, stepN } = await request.json().catch(() => ({}));
  const n = Number(stepN);
  if (!groupId || !n || n < 1 || n > 9) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  // Flights (6) stays open forever; steps without polls never auto-complete anyway.
  if (n === 6) return NextResponse.json({ advanced: false });

  const admin = supabaseAdmin();

  const [{ data: membersRaw }, { data: group }, { data: done }, { data: pollsRaw }] = await Promise.all([
    admin.from("group_members").select("user_id, role, meta, profiles:user_id(name, email)").eq("group_id", groupId),
    admin.from("groups").select("id, name, owner_id, data").eq("id", groupId).maybeSingle(),
    admin.from("step_progress").select("step_n").eq("group_id", groupId).eq("step_n", n).maybeSingle(),
    admin.from("polls").select("id, kind, question, poll_options(id, label), votes(option_id, user_id), date_votes(option_id, user_id, answer)").eq("group_id", groupId).eq("step_n", n),
  ]);
  const members = (membersRaw ?? []) as unknown as MemberRow[];
  const memberIds = members.map((m) => m.user_id);
  if (!memberIds.includes(user.id)) return NextResponse.json({ error: "Not a member." }, { status: 403 });
  if (!group || done) return NextResponse.json({ advanced: false });

  const polls = (pollsRaw ?? []) as unknown as PollRow[];
  if (polls.length === 0) return NextResponse.json({ advanced: false });

  const gdata: GroupData = (group.data as GroupData) ?? {};
  const weight = (uid: string) => (members.find((m) => m.user_id === uid)?.meta?.answering_for === "couple" ? 2 : 1);
  const nameOf = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.profiles?.name || m?.profiles?.email?.split("@")[0] || "Traveler";
  };
  const headcount = members.reduce((s, m) => s + (m.meta?.answering_for === "couple" ? 2 : 1), 0);
  const url = `${request.nextUrl.origin}/app/group/${groupId}`;
  const discussUrl = gdata.discuss?.whatsapp || null;

  /* ---------- participation ---------- */
  const everyoneVoted = polls.every((p) => {
    if (p.kind === "dates") {
      return memberIds.every((id) => p.poll_options.every((o) => (p.date_votes ?? []).some((v) => v.user_id === id && v.option_id === o.id)));
    }
    if (p.kind === "multi") {
      return memberIds.every((id) => (p.date_votes ?? []).some((v) => v.user_id === id && v.answer === "yes"));
    }
    const voters = new Set((p.votes ?? []).map((v) => v.user_id));
    return memberIds.every((id) => voters.has(id));
  });
  if (!everyoneVoted) return NextResponse.json({ advanced: false });

  /* ---------- tallies (couples count twice) ---------- */
  const choiceCounts = (p: PollRow) =>
    p.poll_options
      .map((o) => ({ o, c: (p.votes ?? []).filter((v) => v.option_id === o.id).reduce((s, v) => s + weight(v.user_id), 0) }))
      .sort((a, b) => b.c - a.c);
  const rankedForWinner = (p: PollRow) => {
    const override = gdata.decisions?.[p.id];
    const counts = choiceCounts(p).filter((r) => !r.o.label.toLowerCase().includes("flexible"));
    if (override) {
      const w = p.poll_options.find((o) => o.id === override);
      if (w) return { winner: w, counts, tie: false };
    }
    const tie = counts.length > 1 && counts[0].c > 0 && counts[0].c === counts[1].c;
    return { winner: counts[0]?.c > 0 ? counts[0].o : null, counts, tie };
  };

  // Signature dedupe: only email once per state of the votes.
  const sig = polls.reduce((s, p) => s + (p.votes?.length ?? 0) + (p.date_votes?.length ?? 0), 0);
  const notified = gdata._notified ?? {};
  const flag = async (key: string) => {
    await admin.from("groups").update({ data: { ...gdata, _notified: { ...notified, [key]: sig } } }).eq("id", groupId);
  };

  const allEmails = members.map((m) => m.profiles?.email).filter((e): e is string => !!e);
  const organizer = members.find((m) => m.user_id === group.owner_id);
  const organizerEmail = organizer?.profiles?.email ?? "hello@gatherwelltravel.com";

  /* ---------- STEP 3: dates never auto-lock; personalized results ---------- */
  if (n === 3) {
    if (notified[`dates3`] === sig) return NextResponse.json({ advanced: false });
    const datePoll = polls.find((p) => p.kind === "dates");
    if (!datePoll) return NextResponse.json({ advanced: false });

    const scored = datePoll.poll_options
      .map((o) => {
        const dv = (datePoll.date_votes ?? []).filter((v) => v.option_id === o.id);
        const w = (ans: string) => dv.filter((v) => v.answer === ans).reduce((s, v) => s + weight(v.user_id), 0);
        return { o, yes: w("yes"), maybe: w("maybe"), no: w("no"), raw: dv };
      })
      .sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no);
    const front = scored[0];
    const tallyHtml = `<div style="font-family:Georgia,serif;font-size:16px;color:#332E29;margin-bottom:10px;">How the dates stack up</div>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;">
        ${scored.map((r) => `<tr>
          <td style="padding:7px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;${r === front ? "font-weight:bold;" : ""}">${r.o.label}${r === front ? ' <span style="color:#5C6E4E;font-size:11px;letter-spacing:1px;">FRONT-RUNNER</span>' : ""}</td>
          <td style="padding:7px 0 7px 14px;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;white-space:nowrap;text-align:right;">${r.yes} yes · ${r.maybe} maybe · ${r.no} no</td>
        </tr>`).join("")}
      </table>`;

    const messages = members
      .filter((m) => !!m.profiles?.email)
      .map((m) => {
        const mine = front.raw.find((v) => v.user_id === m.user_id)?.answer ?? "maybe";
        const isOrg = m.user_id === group.owner_id;
        let body: string;
        if (isOrg) {
          const conflicts = members
            .filter((x) => {
              const a = front.raw.find((v) => v.user_id === x.user_id)?.answer;
              return a === "no" || a === "maybe";
            })
            .map((x) => `${nameOf(x.user_id)} (${front.raw.find((v) => v.user_id === x.user_id)?.answer})`);
          body = conflicts.length === 0
            ? `Green light: every traveler can make the front-runner (${front.o.label}). Lock the dates whenever you're ready.`
            : `Everyone has answered. The front-runner is ${front.o.label}, but it's not clean: ${conflicts.join(", ")}. Worth a conversation before you lock anything.`;
        } else if (mine === "yes") {
          body = `Everyone has answered, and the leading date (${front.o.label}) works for you. Sit tight while your organizer locks it in.`;
        } else if (mine === "maybe") {
          body = `Everyone has answered. The leading date is ${front.o.label}, which you marked maybe. If there's a real blocker, tell your organizer now, before anything gets booked.`;
        } else {
          body = `Everyone has answered, and the leading date (${front.o.label}) is one you can't make. Speak up today: reply to your organizer before flights and houses get booked around it.`;
        }
        return {
          to: m.profiles!.email!,
          subject: `${group.name}: the date votes are in`,
          heading: `Dates: the votes are in`,
          body,
          extraHtml: tallyHtml,
          ctaUrl: isOrg ? url : (mine === "no" || mine === "maybe")
            ? (discussUrl || `mailto:${organizerEmail}?subject=${encodeURIComponent(`${group.name}: about the dates`)}`)
            : url,
          ctaText: isOrg ? "Review and lock the dates" : (mine === "no" || mine === "maybe") ? (discussUrl ? "Discuss with the group" : "Message the organizer") : "See the results",
        };
      });
    await sendPersonalEmails(messages);
    await flag("dates3");
    return NextResponse.json({ advanced: false, datesReady: true });
  }

  /* ---------- ties block auto-lock ---------- */
  const tied = polls.filter((p) => p.kind === "choice" && rankedForWinner(p).tie);
  if (tied.length > 0) {
    if (notified[`tie${n}`] !== sig) {
      const tieHtml = tied.map((p) => {
        const { counts } = rankedForWinner(p);
        const top = counts.filter((c) => c.c === counts[0].c).map((c) => clean(c.o.label));
        return `<p style="margin:0 0 12px;"><span style="color:#6B6259;">${p.question}</span><br/><b style="color:#332E29;">It's a tie: ${top.join(" vs ")}</b></p>`;
      }).join("");
      await sendGroupEmail({
        to: allEmails,
        subject: `${group.name}: it's a tie. Talk it out`,
        heading: `The group is split`,
        body: `Everyone has voted on Step ${n} (${STEPS[n - 1].t}), and it's a dead heat. Votes stay open, so talk it over and someone can switch, or your organizer can break the tie.`,
        extraHtml: tieHtml,
        ctaUrl: discussUrl || url,
        ctaText: discussUrl ? "Discuss with the group" : "Change your vote",
      });
      await flag(`tie${n}`);
    }
    return NextResponse.json({ advanced: false, tie: true });
  }

  /* ---------- complete the step ---------- */
  const { error } = await admin.from("step_progress").upsert({ group_id: groupId, step_n: n, completed_by: group.owner_id });
  if (error) return NextResponse.json({ error: "Couldn't complete the step." }, { status: 500 });

  /* ---------- results email ---------- */
  let extraHtml = "";
  if (n === 2) {
    // Expand couple votes so the synopsis weighs them double
    const expanded = polls.filter((p) => p.kind === "choice").map((p) => ({
      question: p.question,
      options: p.poll_options,
      votes: (p.votes ?? []).flatMap((v) => Array(weight(v.user_id)).fill({ option_id: v.option_id })),
    }));
    extraHtml = tripVisionHtml(group.name, expanded, headcount);
  } else if (n === 8) {
    const destination = gdata.destination || (await (async () => {
      const { data: p5 } = await admin.from("polls").select("id, poll_options(id, label), votes(option_id, user_id)").eq("group_id", groupId).eq("step_n", 5);
      const dp = ((p5 ?? []) as unknown as PollRow[])[0];
      if (!dp) return "";
      const counts = dp.poll_options.map((o) => ({ o, c: (dp.votes ?? []).filter((v) => v.option_id === o.id).reduce((s, v) => s + weight(v.user_id), 0) })).sort((a, b) => b.c - a.c);
      return counts[0]?.c > 0 ? clean(counts[0].o.label) : "";
    })());
    const multi = polls.find((p) => p.kind === "multi") ?? polls[0];
    const tallies = multi.poll_options
      .map((o) => ({ o, c: (multi.date_votes ?? []).filter((v) => v.option_id === o.id && v.answer === "yes").reduce((s, v) => s + weight(v.user_id), 0) }))
      .filter((r) => r.c > 0)
      .sort((a, b) => b.c - a.c);
    extraHtml = `<div style="font-family:Georgia,serif;font-size:16px;color:#332E29;margin-bottom:10px;">Where the group aligns</div>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;">
        ${tallies.map((r) => {
          const q = encodeURIComponent(`${clean(r.o.label)} ${destination}`.trim());
          return `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;">${r.o.label} <span style="color:#6B6259;font-size:13px;">· ${r.c} of ${headcount} in</span></td>
            <td style="padding:8px 0 8px 14px;border-bottom:1px solid #F1EADC;text-align:right;white-space:nowrap;"><a href="https://www.getyourguide.com/s/?q=${q}&partner_id=J0NPR1G" style="color:#B4531A;font-size:13px;font-weight:bold;">Book it →</a></td>
          </tr>`;
        }).join("")}
      </table>
      <p style="margin:0 0 8px;font-size:13px;color:#6B6259;">Anchor the top picks, protect the free time. The 60/40 rule is what keeps everyone smiling on day five.</p>`;
  } else {
    extraHtml = polls
      .filter((p) => p.kind === "choice")
      .map((p) => {
        const { winner, counts } = rankedForWinner(p);
        if (!winner) return "";
        const flex = choiceCounts(p).find((r) => r.o.label.toLowerCase().includes("flexible") && r.c > 0);
        return `<p style="margin:0 0 10px;"><span style="color:#6B6259;">${p.question}</span><br/><b style="color:#332E29;">${winner.label}</b> <span style="color:#6B6259;font-size:13px;">(${counts.find((c) => c.o.id === winner.id)?.c ?? 0} of ${headcount})</span>${flex ? `<br/><span style="color:#6B6259;font-size:13px;">${flex.c} of you are easy either way.</span>` : ""}</p>`;
      })
      .join("");
  }

  const next = n < 9 ? STEPS[n] : null;
  await sendGroupEmail({
    to: allEmails,
    subject: n === 2 ? `${group.name}: your Trip Vision is in` : next ? `${group.name}: everyone voted! Step ${n + 1} is open` : `${group.name}: Step 9 is decided`,
    heading: n === 2 ? `${group.name} knows what it wants` : next ? `Step ${n} is decided. On to Step ${n + 1}: ${next.t}` : `Step ${n} is decided`,
    body: n === 2
      ? `Every traveler has weighed in on the dream. Here is what your group said, and what it means for the trip.`
      : next
      ? `Every traveler voted on Step ${n} (${STEPS[n - 1].t}), so it locked in automatically. Here are the results. The next decision is already open.`
      : `Every traveler has voted. Your organizer can now generate the final outputs.`,
    ctaUrl: url,
    ctaText: next ? "Vote on the next step" : "See your trip",
    extraHtml,
  });

  // Step 8 alignment is also useful intel for the advisory side of the house.
  if (n === 8) {
    await sendAdvisorEmail({
      subject: `[LEAD] ${group.name}: activities decided (${headcount} travelers)`,
      heading: `${group.name} finished Plan the Fun`,
      body: `Their activity alignment is below. Destination context: ${gdata.destination || "see group"}.`,
      extraHtml,
    });
  }

  return NextResponse.json({ advanced: true, nextStep: n < 9 ? n + 1 : null });
}
