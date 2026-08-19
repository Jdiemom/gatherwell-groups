"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { STEPS } from "@/lib/steps";

type Member = { user_id: string; role: string; name: string };
type Poll = {
  id: string; step_n: number; kind: string; question: string;
  options: { id: string; label: string; meta: string | null; sort: number }[];
  votes: { option_id: string; user_id: string }[];
  dvotes?: { option_id: string; user_id: string; answer: string }[];
};
type Budget = { flights: number; stay: number; activities: number; food: number };
type Group = {
  id: string; name: string; trip_type: string | null; owner_id: string; join_code: string;
  data?: { budget?: Budget } | null;
};

const AV_COLORS = ["#B4531A", "#5C6E4E", "#B08A3E", "#0E9488", "#7A5C8F", "#A34A5E"];
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const BUDGET_ROWS: [keyof Budget, string][] = [
  ["flights", "Flights"],
  ["stay", "Accommodation"],
  ["activities", "Activities"],
  ["food", "Food & local"],
];
const budgetBase = (b: Budget) => b.flights + b.stay + b.activities + b.food;
const budgetBuffer = (b: Budget) => Math.round(budgetBase(b) * 0.1);
const budgetTotal = (b: Budget) => budgetBase(b) + budgetBuffer(b);

export default function GroupFlow(props: {
  userId: string; group: Group; members: Member[]; completed: number[]; polls: Poll[];
}) {
  const { userId, group, members } = props;
  const isOrganizer = group.owner_id === userId;
  const [completed, setCompleted] = useState<Set<number>>(new Set(props.completed));
  const [polls, setPolls] = useState<Poll[]>(props.polls);
  const [current, setCurrent] = useState<number>(() => {
    for (let i = 1; i <= 9; i++) if (!new Set(props.completed).has(i)) return i;
    return 9;
  });
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ title: string; body: string; fname: string; fdata?: string } | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [budget, setBudget] = useState<Budget | null>(group.data?.budget ?? null);
  const [pollFormStep, setPollFormStep] = useState<number | null>(null);
  const [pfQ, setPfQ] = useState("");
  const [pfOpts, setPfOpts] = useState("");
  const [pfKind, setPfKind] = useState<"choice" | "dates">("choice");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteTpl, setInviteTpl] = useState<string | null>(null);

  const nextStep = useMemo(() => {
    for (let i = 1; i <= 9; i++) if (!completed.has(i)) return i;
    return 9;
  }, [completed]);

  const savings = useMemo(() => {
    let s = 0;
    const n = members.length;
    if (completed.has(4)) s += n * 40;
    if (completed.has(6)) s += Math.round(n * 600 * 0.12);
    if (completed.has(7)) s += n * 25;
    if (completed.has(8)) s += n * 30;
    return s;
  }, [completed, members.length]);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function goStep(n: number) {
    if (!completed.has(n) && n > nextStep) {
      say(`That step is locked. Finish Step ${nextStep} first: one decision at a time is the method.`);
      return;
    }
    setCurrent(n);
  }

  async function vote(poll: Poll, optionId: string) {
    if (completed.has(poll.step_n)) {
      say("This decision is locked in. Ask your organizer to reopen the step if plans changed.");
      return;
    }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("votes")
      .upsert({ poll_id: poll.id, option_id: optionId, user_id: userId });
    if (error) { say("Vote didn't save. Try again."); return; }
    setPolls((ps) => ps.map((p) => {
      if (p.id !== poll.id) return p;
      const others = p.votes.filter((v) => v.user_id !== userId);
      return { ...p, votes: [...others, { option_id: optionId, user_id: userId }] };
    }));
    say("Vote recorded.");

    // If this vote was the last one missing, the step advances itself (verified server-side).
    try {
      const res = await fetch("/api/steps/auto-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, stepN: poll.step_n }),
      });
      const out = await res.json().catch(() => null);
      if (out?.advanced) {
        setCompleted((c) => new Set([...c, poll.step_n]));
        if (out.nextStep) setCurrent(out.nextStep);
        say(out.nextStep
          ? `Everyone voted! Step ${poll.step_n} locked in. Step ${out.nextStep} is open, and the group has been emailed.`
          : `Everyone voted! Step ${poll.step_n} locked in.`);
      }
    } catch { /* auto-advance is best-effort; the organizer can always complete manually */ }
  }

  async function voteDate(poll: Poll, optionId: string, answer: "yes" | "no" | "maybe") {
    if (completed.has(poll.step_n)) {
      say("This decision is locked in. Ask your organizer to reopen the step if plans changed.");
      return;
    }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("date_votes")
      .upsert({ poll_id: poll.id, option_id: optionId, user_id: userId, answer });
    if (error) { say("Answer didn't save. Try again."); return; }
    setPolls((ps) => ps.map((p) => {
      if (p.id !== poll.id) return p;
      const others = (p.dvotes ?? []).filter((v) => !(v.user_id === userId && v.option_id === optionId));
      return { ...p, dvotes: [...others, { option_id: optionId, user_id: userId, answer }] };
    }));

    try {
      const res = await fetch("/api/steps/auto-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, stepN: poll.step_n }),
      });
      const out = await res.json().catch(() => null);
      if (out?.advanced) {
        setCompleted((c) => new Set([...c, poll.step_n]));
        if (out.nextStep) setCurrent(out.nextStep);
        say(`Everyone answered! Step ${poll.step_n} locked in, and the group has been emailed the results.`);
      }
    } catch { /* best-effort */ }
  }

  function notifyStep(stepN: number, kind: "opened" | "reopened") {
    // Fire and forget: email failures never block the UI.
    fetch("/api/steps/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.id, stepN, kind }),
    }).catch(() => {});
  }

  async function completeStep(n: number, msg?: string) {
    if (!isOrganizer) { say("Only the organizer can complete a step."); return; }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("step_progress")
      .upsert({ group_id: group.id, step_n: n, completed_by: userId });
    if (error) { say("Couldn't save progress. Try again."); return; }
    setCompleted((c) => new Set([...c, n]));
    if (n < 9) {
      setCurrent(n + 1);
      notifyStep(n + 1, "opened");
    }
    say(msg || `Step ${n} complete. Step ${n + 1} unlocked! Your group has been emailed.`);
  }

  /* ---------- budget: derived from the group's real vote, adjustable by the organizer ---------- */
  function votedBudgetTarget(): number | null {
    const bp = polls.find((p) => p.kind === "budget");
    if (!bp || bp.votes.length === 0) return null;
    const counts = bp.options.map((o) => ({ o, c: bp.votes.filter((v) => v.option_id === o.id).length }));
    const win = counts.sort((a, b) => b.c - a.c)[0];
    if (!win || win.c === 0) return null;
    const nums = (win.o.label.match(/\d[\d,]*/g) || []).map((s) => parseInt(s.replace(/,/g, ""), 10));
    if (!nums.length) return null;
    return nums.length >= 2 ? Math.round((nums[0] + nums[1]) / 2) : Math.round(nums[0] * 1.15);
  }

  function defaultBudget(): Budget {
    const target = votedBudgetTarget() ?? 1782;
    const base = target / 1.1;
    const r = (x: number) => Math.max(0, Math.round(x / 10) * 10);
    return { flights: r(base * 0.35), stay: r(base * 0.3), activities: r(base * 0.15), food: r(base * 0.2) };
  }

  async function saveBudget(b: Budget) {
    if (!isOrganizer) { say("Only the organizer can save the budget."); return; }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("groups")
      .update({ data: { ...(group.data ?? {}), budget: b } })
      .eq("id", group.id);
    if (error) { say("Couldn't save the budget. Try again."); return; }
    setBudget(b);
    say("Budget saved for the whole group.");
  }

  /* ---------- organizer-created polls ---------- */
  async function createPoll(stepN: number) {
    const q = pfQ.trim();
    const opts = pfOpts
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [label, meta] = l.split("|").map((s) => s.trim());
        return { label, meta: meta || null };
      });
    if (!q || opts.length < 2) { say("Add a question and at least two options, one per line."); return; }
    const supabase = supabaseBrowser();
    const { data: poll, error } = await supabase
      .from("polls")
      .insert({ group_id: group.id, step_n: stepN, kind: pfKind, question: q })
      .select("id")
      .single();
    if (error || !poll) { say("Couldn't create the poll. Try again."); return; }
    const rows = opts.map((o, i) => ({ poll_id: poll.id, label: o.label, meta: o.meta, sort: i }));
    const { data: created, error: e2 } = await supabase
      .from("poll_options")
      .insert(rows)
      .select("id, label, meta, sort");
    if (e2 || !created) { say("Poll saved but its options failed. Remove it and try again."); return; }
    setPolls((ps) => [...ps, {
      id: poll.id, step_n: stepN, kind: pfKind, question: q,
      options: [...created].sort((a, b) => a.sort - b.sort), votes: [], dvotes: [],
    }]);
    setPfQ(""); setPfOpts(""); setPollFormStep(null); setPfKind("choice");
    say("Poll added. Your group can vote now.");
  }

  async function deletePoll(pollId: string) {
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("polls").delete().eq("id", pollId);
    if (error) { say("Couldn't remove the poll."); return; }
    setPolls((ps) => ps.filter((p) => p.id !== pollId));
    setConfirmDel(null);
    say("Poll removed.");
  }

  async function reopenStep(n: number) {
    if (!isOrganizer) { say("Only the organizer can reopen a step."); return; }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("step_progress")
      .delete()
      .eq("group_id", group.id)
      .eq("step_n", n);
    if (error) { say("Couldn't reopen the step. Try again."); return; }
    setCompleted((c) => {
      const next = new Set(c);
      next.delete(n);
      return next;
    });
    setCurrent(n);
    notifyStep(n, "reopened");
    say(`Step ${n} reopened. Voting is live again, and your group has been emailed.`);
  }

  function inviteLink() {
    return `${window.location.origin}/join/${group.join_code}`;
  }

  const INVITE_TEMPLATES: { key: string; label: string; text: (link: string) => string }[] = [
    {
      key: "family",
      label: "Family",
      text: (link) =>
`Hi family! I'm organizing our ${group.name} trip on Groups by Gatherwell. It walks us through the planning one decision at a time: dates, budget, where we stay, all of it. Everyone gets a vote, and nothing is booked until we've all weighed in.

I've covered the membership for the whole group, so it costs you nothing. Just tap the link, sign in with your email, and vote when a poll comes up. Two minutes, no app to download.

${link}`,
    },
    {
      key: "friends",
      label: "Friends",
      text: (link) =>
`The trip is happening. I set us up on Groups by Gatherwell so the planning doesn't die in the group chat. It runs us through every decision in order and we all vote.

Membership's on me. Your only job: click the link, sign in with your email, and vote when a poll drops. Two minutes, tops. First poll is already live.

${link}`,
    },
    {
      key: "facts",
      label: "Just the facts",
      text: (link) =>
`Hi everyone. I've set up our ${group.name} trip on Groups by Gatherwell. It guides the group through nine steps: dates, budget, destination, flights, stay, and activities. We vote on each decision, it locks in, and we move to the next one.

I've taken care of the membership cost for the group. Please click the link below, sign in with your email, and cast your first votes this week so we can keep things moving.

${link}`,
    },
  ];

  function pickInviteTemplate(key: string) {
    const t = INVITE_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setInviteTpl(key);
    setInviteMsg(t.text(inviteLink()));
  }

  async function copyInviteMsg() {
    if (!inviteMsg) return;
    try {
      await navigator.clipboard.writeText(inviteMsg);
      say("Invite message copied. Paste it anywhere your group talks.");
    } catch {
      say("Couldn't copy automatically. Select the text and copy it.");
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink());
      say("Invite link copied. Send it to your travelers!");
    } catch {
      setModal({ title: "Your invite link", body: inviteLink(), fname: "" });
    }
  }

  function download(name: string, body: string) {
    try {
      const type = name.endsWith(".csv") ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";
      const blob = new Blob([body], { type });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { say("Download blocked in this browser."); }
  }

  /* ---------- the trip so far (sidebar) ---------- */
  function tripShape() {
    const items: { label: string; value: string; locked: boolean }[] = [];
    const winnersOf = (n: number) =>
      polls
        .filter((p) => p.step_n === n)
        .map((p) => {
          if (p.kind === "dates") {
            const dv = p.dvotes ?? [];
            if (dv.length === 0) return null;
            const scored = p.options.map((o) => ({
              o,
              yes: dv.filter((v) => v.option_id === o.id && v.answer === "yes").length,
              maybe: dv.filter((v) => v.option_id === o.id && v.answer === "maybe").length,
            }));
            const best = scored.sort((a, b) => b.yes - a.yes || b.maybe - a.maybe)[0];
            return best && best.yes + best.maybe > 0 ? best.o.label : null;
          }
          const counts = p.options.map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).length }));
          const win = counts.sort((a, b) => b.c - a.c)[0];
          return win && win.c > 0 ? win.o.label : null;
        })
        .filter((x): x is string => !!x);
    const push = (label: string, n: number) => {
      const w = winnersOf(n).slice(0, 2).join(" · ");
      if (w) items.push({ label, value: w, locked: completed.has(n) });
    };
    push("Vision", 2);
    push("Dates", 3);
    if (budget || completed.has(4)) {
      items.push({ label: "Budget", value: `${fmt(budgetTotal(budget ?? defaultBudget()))} per person`, locked: completed.has(4) });
    }
    push("Destination", 5);
    push("Home base", 7);
    push("Activities", 8);
    return items;
  }

  /* ---------- poll rendering ---------- */
  function dateBlock(poll: Poll) {
    const closed = completed.has(poll.step_n);
    const dv = poll.dvotes ?? [];
    const scored = poll.options.map((o) => ({
      o,
      yes: dv.filter((v) => v.option_id === o.id && v.answer === "yes").length,
      maybe: dv.filter((v) => v.option_id === o.id && v.answer === "maybe").length,
      no: dv.filter((v) => v.option_id === o.id && v.answer === "no").length,
    }));
    const best = [...scored].sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no)[0];
    const answeredAll = members.filter((m) =>
      poll.options.every((o) => dv.some((v) => v.user_id === m.user_id && v.option_id === o.id))
    ).length;
    return (
      <div key={poll.id} style={{ marginBottom: 26 }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>
          {poll.question}
          {closed && <span className="decided">Decided</span>}
          {isOrganizer && !closed && (
            <button
              className="poll-del"
              onClick={() => (confirmDel === poll.id ? deletePoll(poll.id) : setConfirmDel(poll.id))}
            >
              {confirmDel === poll.id ? "Click again to remove" : "Remove"}
            </button>
          )}
        </h3>
        {scored.map(({ o, yes, maybe, no }) => {
          const mine = dv.find((v) => v.user_id === userId && v.option_id === o.id)?.answer;
          const isBest = best && best.o.id === o.id && best.yes > 0;
          return (
            <div key={o.id} className={`date-row ${isBest ? "best" : ""}`}>
              <div className="d-lab">
                <span className="name">{o.label}</span>
                {isBest && <span className="d-best">Front-runner</span>}
                {o.meta && <span className="meta">{o.meta}</span>}
                {(yes + maybe + no) > 0 && (
                  <span className="d-counts">{yes} yes · {maybe} maybe · {no} no</span>
                )}
              </div>
              <div className="d-btns">
                {(["yes", "maybe", "no"] as const).map((a) => (
                  <button
                    key={a}
                    className={`d-btn ${a} ${mine === a ? "on" : ""}`}
                    disabled={closed}
                    onClick={() => voteDate(poll, o.id, a)}
                  >
                    {a === "yes" ? "Yes" : a === "maybe" ? "Maybe" : "No"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <p className="foot-note">
          {closed
            ? "Dates locked in."
            : `${answeredAll} of ${members.length} travelers have answered every date. When everyone has, the results go to the whole group automatically.`}
        </p>
      </div>
    );
  }

  function pollBlock(poll: Poll) {
    if (poll.kind === "dates") return dateBlock(poll);
    const total = poll.votes.length;
    const mine = poll.votes.find((v) => v.user_id === userId)?.option_id;
    const isBudget = poll.kind === "budget";
    const closed = completed.has(poll.step_n);
    const max = Math.max(...poll.options.map((o) => poll.votes.filter((v) => v.option_id === o.id).length), 0);
    return (
      <div key={poll.id} style={{ marginBottom: 26 }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>
          {poll.question}
          {closed && <span className="decided">Decided</span>}
          {isOrganizer && !closed && (
            <button
              className="poll-del"
              onClick={() => (confirmDel === poll.id ? deletePoll(poll.id) : setConfirmDel(poll.id))}
            >
              {confirmDel === poll.id ? "Click again to remove" : "Remove"}
            </button>
          )}
        </h3>
        {poll.options.map((o) => {
          const count = poll.votes.filter((v) => v.option_id === o.id).length;
          const win = total > 0 && count === max && max > 0;
          return (
            <div
              key={o.id}
              className={`poll-opt ${mine === o.id && !closed ? "sel" : ""} ${win ? "win" : ""} ${closed ? "closed" : ""}`}
              onClick={() => vote(poll, o.id)}
            >
              <span className="name">{o.label}</span>
              {total > 0 && <span className="votes">{count} vote{count !== 1 ? "s" : ""}</span>}
              {o.meta && <span className="meta">{o.meta}</span>}
              {total > 0 && (
                <div className="vote-track">
                  <div className="vote-fill" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
              )}
            </div>
          );
        })}
        <p className="foot-note">
          {closed
            ? "This poll closed when the step was completed. The winning option is locked in."
            : isBudget
            ? "Budget votes are anonymous: everyone sees the totals, never who picked what."
            : `${total} of ${members.length} travelers have voted.`}
        </p>
      </div>
    );
  }

  function stepPolls(n: number) {
    const blocks = polls.filter((p) => p.step_n === n).map(pollBlock);
    const locked = completed.has(n);
    return (
      <>
        {blocks}
        {isOrganizer && !locked && (
          pollFormStep === n ? (
            <div className="bw" style={{ marginTop: 0 }}>
              <h3>New poll for this step</h3>
              <div className="tpl-chips" style={{ marginBottom: 12 }}>
                <button className={`tpl-chip ${pfKind === "choice" ? "on" : ""}`} onClick={() => setPfKind("choice")}>
                  Pick one winner
                </button>
                <button className={`tpl-chip ${pfKind === "dates" ? "on" : ""}`} onClick={() => setPfKind("dates")}>
                  Date availability
                </button>
              </div>
              <p className="bw-note" style={{ marginTop: 0, marginBottom: 10 }}>
                {pfKind === "dates"
                  ? "List each candidate date range on its own line. Every traveler answers Yes, Maybe, or No for each one."
                  : "The group votes and one option wins."}
              </p>
              <input
                className="pf-input"
                placeholder={pfKind === "dates" ? "e.g. Which of these weeks can you make?" : "Your question, e.g. Which house style fits us?"}
                value={pfQ}
                onChange={(e) => setPfQ(e.target.value)}
              />
              <textarea
                className="pf-input"
                rows={4}
                placeholder={pfKind === "dates"
                  ? "June 12–19\nJuly 10–17\nAugust 7–14"
                  : "One option per line. Add a detail after a | if you like:\nBig villa | everyone under one roof\nResort rooms"}
                value={pfOpts}
                onChange={(e) => setPfOpts(e.target.value)}
              />
              <div className="step-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => createPoll(n)}>Create poll</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setPollFormStep(null); setPfQ(""); setPfOpts(""); setPfKind("choice"); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-outline btn-sm"
              style={{ marginBottom: 26 }}
              onClick={() => { setPollFormStep(n); setPfKind(n === 3 ? "dates" : "choice"); }}
            >
              + Add your own poll
            </button>
          )
        )}
      </>
    );
  }

  function header(n: number) {
    const st = STEPS[n - 1];
    return (
      <>
        <div className="step-eyebrow">Step {n} of 9 · The Gatherwell Method</div>
        <h2>{st.t}</h2>
      </>
    );
  }

  function completeBtn(n: number, label: string, enabled = true, msg?: string) {
    if (completed.has(n)) {
      return (
        <>
          <span className="pill" style={{ background: "#F2F5EE", color: "var(--sage-deep)" }}>✓ Step complete</span>
          {isOrganizer && (
            <button className="btn btn-outline btn-sm" onClick={() => reopenStep(n)}>
              Reopen this step
            </button>
          )}
        </>
      );
    }
    if (!isOrganizer) return <span className="foot-note">The organizer completes this step when the group is ready.</span>;
    return (
      <button className="btn btn-primary" disabled={!enabled} onClick={() => completeStep(n, msg)}>
        {label}
      </button>
    );
  }

  /* ---------- step content ---------- */
  function stepContent(n: number) {
    switch (n) {
      case 1:
        return (
          <>
            {header(1)}
            <p className="lead">Trips die from soft commitments. Get real names in, then set a commitment device before anyone books anything.</p>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Your travelers ({members.length})</h3>
            <div className="member-chips">
              {members.map((m, i) => (
                <span key={m.user_id} className={`chip ${m.user_id === userId ? "you" : ""}`}>
                  <span className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{m.name[0]?.toUpperCase()}</span>
                  {m.name}{m.role === "organizer" ? " · organizer" : ""}
                </span>
              ))}
            </div>
            <div className="callout sage">
              <b>Invite your group</b>
              Anyone with your invite link can join free and vote on every decision.
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-sage btn-sm" onClick={copyInvite}>Copy invite link</button>
              </div>
            </div>
            {isOrganizer && (
              <div className="bw">
                <h3>Invite message</h3>
                <p className="bw-note" style={{ marginTop: 0, marginBottom: 12 }}>
                  Pick a style, tweak the words, send it wherever your group talks.
                </p>
                <div className="tpl-chips">
                  {INVITE_TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      className={`tpl-chip ${inviteTpl === t.key ? "on" : ""}`}
                      onClick={() => pickInviteTemplate(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {inviteMsg !== null && (
                  <>
                    <textarea
                      className="pf-input"
                      rows={9}
                      value={inviteMsg}
                      onChange={(e) => setInviteMsg(e.target.value)}
                      style={{ marginTop: 12 }}
                    />
                    <div className="step-actions" style={{ marginTop: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={copyInviteMsg}>Copy message</button>
                      <a
                        className="btn btn-outline btn-sm"
                        href={`mailto:?subject=${encodeURIComponent(`Our ${group.name} trip: you're in`)}&body=${encodeURIComponent(inviteMsg)}`}
                      >
                        Email it
                      </a>
                      <a className="btn btn-outline btn-sm" href={`sms:?&body=${encodeURIComponent(inviteMsg)}`}>
                        Text it
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="callout">
              <b>Method rule: no planning around a “maybe”</b>
              Pick a commitment device with your group: a small deposit, a reply-by date, or the
              ticketed-means-in rule. Groups that set one in week one keep 90%+ of their headcount.
            </div>
            <div className="step-actions">{completeBtn(1, "Crew is in. Complete Step 1 →", members.length >= 2, undefined)}</div>
            {members.length < 2 && isOrganizer && !completed.has(1) && (
              <p className="foot-note">Invite at least one traveler to complete this step.</p>
            )}
          </>
        );
      case 2:
        return (
          <>
            {header(2)}
            <p className="lead">Before dates or dollars, the group aligns on what this trip is for. Everyone votes; the winners become your group&apos;s brief.</p>
            {stepPolls(2)}
            <div className="step-actions">{completeBtn(2, "Lock the Vision →")}</div>
          </>
        );
      case 3:
        return (
          <>
            {header(3)}
            <p className="lead">The date poll that ends the &quot;any weekend works&quot; spiral. Lock a window early: it&apos;s what makes the flight-savings step possible.</p>
            {isOrganizer && !completed.has(3) && !polls.some((p) => p.step_n === 3 && p.kind === "dates") && (
              <div className="callout sage">
                <b>Put real dates on the table</b>
                Use &quot;Add your own poll&quot; below and pick Date availability. List your actual candidate weeks; every traveler answers Yes, Maybe, or No for each. The front-runner surfaces itself.
              </div>
            )}
            {stepPolls(3)}
            <div className="callout">
              <b>Method rule: 72-hour decision window</b>
              Set a deadline with your group, then lock the top window. Deadlines are what make group planning humane.
            </div>
            <div className="step-actions">{completeBtn(3, "Lock the Dates →", true, "Dates locked! Early dates mean cheap flights later.")}</div>
          </>
        );
      case 4:
        return (
          <>
            {header(4)}
            <p className="lead">Money talk sinks friendships when it&apos;s public. Everyone votes a comfortable number anonymously; the group adopts a target from the honest middle.</p>
            {stepPolls(4)}
            {(() => {
              const b = budget ?? defaultBudget();
              const editable = isOrganizer && !completed.has(4);
              const n = members.length;
              const upd = (k: keyof Budget, v: string) =>
                setBudget({ ...b, [k]: Math.max(0, parseInt(v.replace(/\D/g, "") || "0", 10)) });
              return (
                <div className="bw">
                  <h3>
                    Budget worksheet
                    {votedBudgetTarget() && !budget ? <span className="bw-tag">started from your group&apos;s vote</span> : null}
                  </h3>
                  <div className="bw-row bw-head">
                    <span>Category</span><span>Per person</span><span>Group of {n}</span>
                  </div>
                  {BUDGET_ROWS.map(([k, label]) => (
                    <div className="bw-row" key={k}>
                      <span>{label}</span>
                      {editable ? (
                        <input inputMode="numeric" value={b[k]} onChange={(e) => upd(k, e.target.value)} />
                      ) : (
                        <span>{fmt(b[k])}</span>
                      )}
                      <span>{fmt(b[k] * n)}</span>
                    </div>
                  ))}
                  <div className="bw-row">
                    <span>Buffer (10%)</span><span>{fmt(budgetBuffer(b))}</span><span>{fmt(budgetBuffer(b) * n)}</span>
                  </div>
                  <div className="bw-row total">
                    <span>TOTAL</span><span>{fmt(budgetTotal(b))}</span><span>{fmt(budgetTotal(b) * n)}</span>
                  </div>
                  {editable && (
                    <div className="step-actions" style={{ marginTop: 14 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveBudget(b)}>Save budget for the group</button>
                    </div>
                  )}
                  <p className="bw-note">
                    {editable
                      ? "Adjust the numbers to fit your trip, then save. Every later output uses these figures."
                      : "Set by your organizer. Every budget output uses these figures."}
                  </p>
                </div>
              );
            })()}
            <div className="callout teal">
              <b>Track it in the Gatherwell Budgeting app</b>
              Once adopted, your budget becomes the yardstick for every later choice.
              <div style={{ marginTop: 12 }}>
                <a
                  className="btn btn-sage btn-sm"
                  href="https://apps.apple.com/us/app/gatherwell-travel/id6762874183"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get the Budgeting App
                </a>
              </div>
            </div>
            <div className="step-actions">
              {completeBtn(4, "Adopt Budget →", true, "Budget set. Advisor fee avoided: ~$40/person.")}
              <button className="btn btn-outline btn-sm" onClick={() => {
                const b = budget ?? defaultBudget();
                const rows: [string, number][] = [
                  ...BUDGET_ROWS.map(([k, label]) => [label, b[k]] as [string, number]),
                  ["Buffer (10%)", budgetBuffer(b)],
                  ["TOTAL", budgetTotal(b)],
                ];
                setModal({
                  title: "Group Budget",
                  fname: "Group-Budget.csv",
                  body:
`GROUP BUDGET · ${group.name}
Travelers: ${members.length}

${"Category".padEnd(16)}${"Per Person".padEnd(13)}Group Total
${rows.map(([c, v]) => c.padEnd(16) + fmt(v).padEnd(13) + fmt(v * members.length)).join("\n")}`,
                  fdata:
`Category,Per Person,Group Total\n` +
rows.map(([c, v]) => `"${c}","${fmt(v)}","${fmt(v * members.length)}"`).join("\n"),
                });
              }}>Preview budget spreadsheet</button>
            </div>
          </>
        );
      case 5:
        return (
          <>
            {header(5)}
            <p className="lead">Now, and only now, the group picks where. Vote from a short list that fits the locked vision, dates, and budget.</p>
            {stepPolls(5)}
            <div className="callout sage">
              <b>Why the shortlist stays short</b>
              Groups pick fastest and happiest from 3–5 vetted options. Unlimited options are where group trips go to die.
            </div>
            <div className="step-actions">{completeBtn(5, "Lock the Winner →")}</div>
          </>
        );
      case 6:
        return (
          <>
            {header(6)}
            <p className="lead">This is where most groups burn the most money. Your dates are locked, so buy in the data-backed window.</p>
            <div className="fw-timeline">
              <div className="fw-zone" style={{ left: 0, width: "22%", background: "#F3D8C6", color: "#96430F" }}>Too early<br />prices unsettled</div>
              <div className="fw-zone" style={{ left: "22%", width: "40%", background: "#CDE9E6", color: "#0B6A61", borderLeft: "2px solid #fff", borderRight: "2px solid #fff" }}>✓ Buying window<br />intl: ~2–6 months out</div>
              <div className="fw-zone" style={{ left: "62%", width: "38%", background: "#F3D8C6", color: "#96430F" }}>Too late<br />fares climb weekly</div>
            </div>
            <p className="foot-note">
              International fares have historically bottomed out around 2–6 months before departure; domestic 1–3 months out averages roughly 25% below peak. Airfare is dynamic and no window is guaranteed: this improves your odds, it is not a promise.
            </p>
            <div className="partner-card">
              <div className="lg" style={{ background: "#1E3A8A" }}>E</div>
              <div><h4>Book through Gatherwell&apos;s Expedia shop <span className="badge">Partner link</span></h4><p>Everyone books in one place with your trip dates.</p></div>
              <a className="btn btn-sage btn-sm" href="https://expedia.ca/shop/gatherwell-travel" target="_blank" rel="noopener noreferrer">Open</a>
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#4A3F35" }}>G</div>
              <div><h4>Have Gatherwell ticket the group <span className="badge">Upgrade</span></h4><p>Our advisors hold group space and ticket everyone together. Ideal for 10+.</p></div>
              <button className="btn btn-outline btn-sm" onClick={() => setContactOpen(true)}>Ask us</button>
            </div>
            <div className="step-actions">
              {completeBtn(6, "Flights Planned. Complete Step →", true, `Estimated ${fmt(Math.round(members.length * 600 * 0.12))} kept by buying in the window.`)}
              <button className="btn btn-outline btn-sm" onClick={() => setModal({
                title: "Flight Plan",
                fname: "Flight-Plan.txt",
                body:
`FLIGHT PLAN · ${group.name}

BUYING WINDOW
  Intl: ~2-6 months before departure (sweet spot ~129 days)
  Domestic: 1-3 months out, ~25% below peak on average
  Caveat: dynamic pricing. Windows improve odds, never guarantee.

BOOKING PATH
  1) Expedia partner link (group books individually)
  2) Or: Gatherwell advisors ticket the group together`,
              })}>Preview flight plan</button>
            </div>
          </>
        );
      case 7:
        return (
          <>
            {header(7)}
            <p className="lead">One house changes a group trip&apos;s chemistry. Compare true per-person cost, then book through our partners.</p>
            {stepPolls(7)}
            <div className="partner-card">
              <div className="lg" style={{ background: "#0E9488" }}>V</div>
              <div><h4>Villa collection <span className="badge">Gatherwell exclusive</span></h4><p>2,500+ luxury villas worldwide. Booking requests come straight to our team.</p></div>
              <a className="btn btn-sage btn-sm" href="https://villa-info.net" target="_blank" rel="noopener noreferrer">Browse villas</a>
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#B08A3E" }}>L</div>
              <div><h4>Luxury villa rentals <span className="badge">Gatherwell exclusive</span></h4><p>Top-tier homes with concierge included.</p></div>
              <a className="btn btn-sage btn-sm" href="https://www.luxury-villa-rentals.com" target="_blank" rel="noopener noreferrer">Browse homes</a>
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#4A3F35" }}>C</div>
              <div><h4>Prefer a ship to a villa? <span className="badge">Gatherwell</span></h4><p>Group cruises through our luxury cruise partners.</p></div>
              <a className="btn btn-sage btn-sm" href="https://gatherwelltravel.com/luxury-cruises" target="_blank" rel="noopener noreferrer">See cruises</a>
            </div>
            <div className="step-actions">{completeBtn(7, "Book the Winner →", true, "Home base chosen. Group perks applied.")}</div>
          </>
        );
      case 8:
        return (
          <>
            {header(8)}
            <p className="lead">Plan 60% of the days and protect the rest. Vote on the anchors; whitespace stays sacred.</p>
            {stepPolls(8)}
            <div className="callout sage">
              <b>The 60/40 rule</b>
              A few shared anchor experiences, plenty of unscheduled space. Over-scheduled groups come home tired; under-scheduled ones never leave the pool.
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#FF5533" }}>G</div>
              <div><h4>Book activities on GetYourGuide <span className="badge">Partner link</span></h4><p>Reserve the winning experiences. Free cancellation on most.</p></div>
              <a className="btn btn-sage btn-sm" href="https://www.getyourguide.com?partner_id=J0NPR1G&cmp=share_to_earn" target="_blank" rel="noopener noreferrer">Open</a>
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#1C5D8C" }}>S</div>
              <div><h4>Cruising? Book shore excursions <span className="badge">Partner link</span></h4><p>Port-by-port excursions for the whole group.</p></div>
              <a className="btn btn-sage btn-sm" href="https://www.shoreexcursionsgroup.com/?id=1948366&source=advisorseed" target="_blank" rel="noopener noreferrer">Open</a>
            </div>
            <div className="step-actions">{completeBtn(8, "Anchor the Winners →", true, "Activities anchored. Group rates locked through partners.")}</div>
          </>
        );
      case 9: {
        const done = completed.has(9);
        return (
          <>
            {header(9)}
            <p className="lead">Everything the group decided, in one place. This is the moment the group chat goes blissfully silent.</p>
            <div className="sav-rows">
              <div className="sav-row">
                <span className="t">Total estimated savings this trip</span>
                <span className="v">{fmt(savings)}</span>
                <span className="d">vs. per-person advisor fees and un-timed flight purchases.</span>
              </div>
            </div>
            <div className="step-actions" style={{ marginTop: 22 }}>
              {completeBtn(9, done ? "Trip Planned 🎉" : "Generate Final Outputs →", true, "Trip complete! 🎉 Pause your subscription until the next adventure.")}
              <button className="btn btn-outline btn-sm" onClick={() => setModal({
                title: "Master Itinerary",
                fname: "Master-Itinerary.txt",
                body:
`${group.name.toUpperCase()} · MASTER ITINERARY
Travelers: ${members.length}
Budget: ${fmt(budgetTotal(budget ?? defaultBudget()))} per person · ${fmt(budgetTotal(budget ?? defaultBudget()) * members.length)} group total

Assembled from your group's winning votes:
${polls.map((p) => {
  const counts = p.options.map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).length }));
  const win = counts.sort((a, b) => b.c - a.c)[0];
  return `  Step ${p.step_n}: ${p.question}\n    → ${win && win.c > 0 ? win.o.label : "(no votes yet)"}`;
}).join("\n")}

Booked through: Expedia · GetYourGuide · Rental Escapes · Luxury Rentals
Need a human? gatherwelltravel.com`,
              })}>Itinerary preview</button>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const b = budget ?? defaultBudget();
                const total = budgetTotal(b);
                const dep = Math.round(total * 0.25);
                const bal = total - dep;
                setModal({
                  title: "Payment Schedule",
                  fname: "Payment-Schedule.csv",
                  body:
`PAYMENT SCHEDULE · ${group.name}
Per person: ${fmt(total)} · Group total: ${fmt(total * members.length)}

${"Traveler".padEnd(20)}${"Deposit (25%)".padEnd(16)}${"Balance".padEnd(11)}Balance Due
${members.map((m) => m.name.padEnd(20) + fmt(dep).padEnd(16) + fmt(bal).padEnd(11) + "60 days before departure").join("\n")}`,
                  fdata:
`Traveler,Deposit (25%),Balance,Balance Due\n` +
members.map((m) => `"${m.name}","${fmt(dep)}","${fmt(bal)}","60 days before departure"`).join("\n"),
                });
              }}>Payment schedule</button>
            </div>
            {done && (
              <div className="callout" style={{ marginTop: 26 }}>
                <b>Next trip?</b>
                Your group and its history stay saved. Start the next adventure from your dashboard.
              </div>
            )}
          </>
        );
      }
      default:
        return null;
    }
  }

  /* ---------- shell ---------- */
  return (
    <div className="app-shell">
      <div className="app-top">
        <div className="wrap">
          <Link className="logo" href="/app">Groups <b>by Gatherwell</b></Link>
          <span className="pill">{group.name}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-sage btn-sm" onClick={copyInvite}>Invite travelers</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setContactOpen(true)}>Need a human?</button>
            <Link className="btn btn-outline btn-sm" href="/app">All trips</Link>
          </div>
        </div>
      </div>

      <div className="app-main">
        <div className="savings-live">
          <svg className="ic" viewBox="0 0 24 24" aria-hidden><ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" /><path d="M5 11.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" /></svg>
          <div>
            <div className="amt">{fmt(savings)}</div>
            <div className="lbl">estimated savings your group has locked in so far. Updates as you complete steps.</div>
          </div>
        </div>

        <div className="app-grid">
          <aside>
            <div className="card side-steps">
              <div className="prog-wrap">
                <div className="prog-track"><div className="prog-fill" style={{ width: `${(completed.size / 9) * 100}%` }} /></div>
                <div className="prog-lbl">{completed.size} of 9 steps complete</div>
              </div>
              <div style={{ padding: 8 }}>
                {STEPS.map((st) => {
                  const done = completed.has(st.n);
                  const locked = !done && st.n > nextStep;
                  const active = st.n === current;
                  return (
                    <div key={st.n} className={`sstep ${active ? "active" : ""} ${done ? "done" : ""} ${locked ? "locked" : ""}`} onClick={() => goStep(st.n)}>
                      <div className="dot">{done ? "✓" : st.n}</div>
                      <div>
                        <div className="t">{st.t}</div>
                        <div className="s">{locked ? "Locked" : done ? "Complete" : st.s}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {tripShape().length > 0 && (
              <div className="card side-steps" style={{ marginTop: 18 }}>
                <div className="ts-head">The trip so far</div>
                <div style={{ padding: "2px 18px 16px" }}>
                  {tripShape().map((it) => (
                    <div key={it.label} className="ts-row">
                      <span className="ts-k">{it.label}</span>
                      <span className="ts-v">
                        {it.value}
                        <em className={it.locked ? "lk" : "ln"}>{it.locked ? "locked in" : "leaning"}</em>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
          <main>
            <div className="card panel">{stepContent(current)}</div>
          </main>
        </div>
      </div>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setModal(null)}>×</button>
            <h3>{modal.title}</h3>
            <pre>{modal.body}</pre>
            {modal.fname && (
              <div className="step-actions">
                <button className="btn btn-primary btn-sm" onClick={() => download(modal.fname, modal.fdata ?? modal.body)}>Download file</button>
              </div>
            )}
          </div>
        </div>
      )}

      {contactOpen && (
        <div className="modal-bg" onClick={() => setContactOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setContactOpen(false)}>×</button>
            <h3>Talk to a real person</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.7 }}>
              The Gatherwell Travel advisory team is behind every step. Hand us one decision or
              the whole trip.
            </p>
            <a className="contact-row" href="mailto:hello@gatherwelltravel.com">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden>
                <rect x="3.5" y="5.5" width="17" height="13" />
                <path d="M4 6.5l8 6.5 8-6.5" />
              </svg>
              <span>
                <span className="cr-title">Email us</span>
                <br />
                <span className="cr-sub">hello@gatherwelltravel.com</span>
              </span>
            </a>
            <a className="contact-row" href="tel:+18886643090">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 4.5h4l1.5 4.5-2.2 1.8a13 13 0 0 0 5 5l1.8-2.2 4.4 1.5v4a1.5 1.5 0 0 1-1.6 1.4A16.5 16.5 0 0 1 3.6 6.1 1.5 1.5 0 0 1 5 4.5z" />
              </svg>
              <span>
                <span className="cr-title">Call us</span>
                <br />
                <span className="cr-sub">(888) 664-3090</span>
              </span>
            </a>
            <a className="contact-row" href="sms:+18886643090">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 5.5h16v11H9l-4.5 3.5V5.5z" />
                <path d="M8 9.5h8M8 12.5h5" />
              </svg>
              <span>
                <span className="cr-title">Text us</span>
                <br />
                <span className="cr-sub">Same number: (888) 664-3090</span>
              </span>
            </a>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
