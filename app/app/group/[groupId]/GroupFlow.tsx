"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { STEPS } from "@/lib/steps";
import { AIRPORTS } from "@/lib/airports";
import { matchDestinations } from "@/lib/match";
import type { Destination } from "@/lib/destinations";

type MemberMeta = {
  answering_for?: "solo" | "couple" | "partner_separate";
  partner_name?: string;
  home_airport?: string;
  bags?: string;
  cabin?: string;
  kids?: number;
  kid_ages?: string;
};
type Member = { user_id: string; role: string; name: string; rawName?: string | null; meta: MemberMeta };
type Poll = {
  id: string; step_n: number; kind: string; question: string;
  options: { id: string; label: string; meta: string | null; sort: number }[];
  votes: { option_id: string; user_id: string }[];
  dvotes?: { option_id: string; user_id: string; answer: string }[];
};
type Budget = { flights: number; stay: number; activities: number; food: number };
type ItinItem = { id: string; t: string; k: string; link?: string };
type GroupData = {
  budget?: Budget;
  tripLength?: number | "vote";
  discuss?: { whatsapp?: string; video?: string };
  decisions?: Record<string, string>;
  destination?: string;
  dates?: { start: string; nights: number };
  itinerary?: { items: ItinItem[] }[];
  payplan?: "full" | "monthly" | "biweekly";
  [k: string]: unknown;
};
type Group = {
  id: string; name: string; trip_type: string | null; owner_id: string; join_code: string;
  data?: GroupData | null;
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
  userId: string; plan: string; group: Group; members: Member[]; completed: number[]; polls: Poll[];
}) {
  const { userId, plan, group } = props;
  const [members, setMembers] = useState<Member[]>(props.members);
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
  const [pfDates, setPfDates] = useState<string[]>([]);
  const [pfDateDraft, setPfDateDraft] = useState("");
  const [tripLength, setTripLength] = useState<number | "vote" | null>(group.data?.tripLength ?? null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteTpl, setInviteTpl] = useState<string | null>(null);
  const [pfRows, setPfRows] = useState<{ label: string; meta: string }[]>([{ label: "", meta: "" }, { label: "", meta: "" }]);
  const me = members.find((m) => m.user_id === userId);
  const [profileOpen, setProfileOpen] = useState(!me?.meta?.answering_for);
  const [pv, setPv] = useState<MemberMeta & { name?: string }>({ name: me?.rawName ?? "", ...(me?.meta ?? {}) });
  const [recDecision, setRecDecision] = useState<string | null>(null);
  const [stayReq, setStayReq] = useState<string | null>(null);
  const [tieBreak, setTieBreak] = useState<{ stepN: number; polls: Poll[] } | null>(null);
  const [discuss, setDiscuss] = useState(group.data?.discuss ?? {});
  const [boostOpen, setBoostOpen] = useState(false);
  const [boost, setBoost] = useState<{ mode: "lump" | "perPerson" | "cover"; amount: string; anonymous: boolean; confirm: boolean }>({ mode: "lump", amount: "", anonymous: false, confirm: false });
  const [conciergeMsg, setConciergeMsg] = useState<string | null>(null);
  const [destSkip, setDestSkip] = useState("");
  const [suggest, setSuggest] = useState("");
  const [itin, setItin] = useState<{ items: ItinItem[] }[] | null>(group.data?.itinerary ?? null);
  const [payplan, setPayplan] = useState<"full" | "monthly" | "biweekly">(group.data?.payplan ?? "monthly");

  const w = (uid: string) => (members.find((m) => m.user_id === uid)?.meta?.answering_for === "couple" ? 2 : 1);
  const seatsOf = (m: Member) => (m.meta?.answering_for === "couple" ? 2 : 1) + (m.meta?.kids ?? 0);
  const headcount = members.reduce((s, m) => s + seatsOf(m), 0);
  const isSolo = plan === "solo";
  const isConcierge = plan === "concierge";

  const nextStep = useMemo(() => {
    for (let i = 1; i <= 9; i++) if (!completed.has(i)) return i;
    return 9;
  }, [completed]);

  const savings = useMemo(() => {
    let s = 0;
    const n = headcount;
    if (completed.has(4)) s += n * 40;
    if (completed.has(6)) s += Math.round(n * 600 * 0.12);
    if (completed.has(7)) s += n * 25;
    if (completed.has(8)) s += n * 30;
    return s;
  }, [completed, headcount]);

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
    if (completed.has(poll.step_n) && poll.step_n !== 6) {
      say("This decision is locked in. Ask your organizer to reopen the step if plans changed.");
      return;
    }
    if (group.data?.decisions?.[poll.id]) {
      say("Your organizer recorded this decision; no vote needed.");
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
    say(me?.meta?.answering_for === "couple" ? "Vote recorded, counting for both of you." : "Vote recorded.");
    autoAdvance(poll.step_n);
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
    autoAdvance(poll.step_n);
  }

  /* ---------- traveler profile ---------- */
  async function saveProfile() {
    const name = (pv.name ?? "").trim();
    if (!name) { say("Your name is the one required field."); return; }
    if (!pv.answering_for) { say("Tell us if you're answering solo or as a couple."); return; }
    if (pv.answering_for !== "solo" && !(pv.partner_name ?? "").trim()) {
      say("Add your partner's name."); return;
    }
    const supabase = supabaseBrowser();
    const meta: MemberMeta = {
      answering_for: pv.answering_for,
      partner_name: pv.partner_name?.trim() || undefined,
      home_airport: pv.home_airport?.trim().toUpperCase() || undefined,
      bags: pv.bags,
      cabin: pv.cabin,
      kids: Math.max(0, Math.min(12, Number(pv.kids) || 0)),
      kid_ages: pv.kid_ages?.trim() || undefined,
    };
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({ name }).eq("id", userId),
      supabase.from("group_members").update({ meta }).eq("group_id", group.id).eq("user_id", userId),
    ]);
    if (e1 || e2) { say("Couldn't save. Try again."); return; }
    setMembers((ms) => ms.map((m) => (m.user_id === userId ? { ...m, name, meta } : m)));
    setProfileOpen(false);
    say(meta.answering_for === "couple" ? "Saved. Your votes count for both of you." : "Saved. Welcome aboard!");
  }

  /* ---------- ties ---------- */
  function tiedPolls(n: number): Poll[] {
    return polls.filter((p) => {
      if (p.step_n !== n || (p.kind !== "choice" && p.kind !== "budget")) return false;
      if (group.data?.decisions?.[p.id]) return false;
      const counts = p.options
        .filter((o) => !o.label.toLowerCase().includes("flexible"))
        .map((o) => p.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0))
        .sort((a, b) => b - a);
      return counts.length > 1 && counts[0] > 0 && counts[0] === counts[1];
    });
  }

  async function declareWinner(pollId: string, optionId: string) {
    const supabase = supabaseBrowser();
    const decisions = { ...(group.data?.decisions ?? {}), [pollId]: optionId };
    const { error } = await supabase
      .from("groups")
      .update({ data: { ...(group.data ?? {}), decisions } })
      .eq("id", group.id);
    if (error) { say("Couldn't save the tie-break."); return; }
    if (group.data) group.data.decisions = decisions; else group.data = { decisions };
    setTieBreak((t) => {
      if (!t) return null;
      const rest = t.polls.filter((p) => p.id !== pollId);
      return rest.length ? { ...t, polls: rest } : null;
    });
    say("Recorded as the decision.");
  }

  /* ---------- discussion links ---------- */
  async function saveDiscuss() {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("groups")
      .update({ data: { ...(group.data ?? {}), discuss } })
      .eq("id", group.id);
    if (error) { say("Couldn't save the links."); return; }
    if (group.data) group.data.discuss = discuss; else group.data = { discuss };
    say("Discussion links saved. They'll appear in group emails too.");
  }

  /* ---------- destination skip ---------- */
  async function skipDestination() {
    const dest = destSkip.trim();
    if (!dest) { say("Type the destination first."); return; }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("groups")
      .update({ data: { ...(group.data ?? {}), destination: dest } })
      .eq("id", group.id);
    if (error) { say("Couldn't save the destination."); return; }
    if (group.data) group.data.destination = dest; else group.data = { destination: dest };
    completeStep(5, `${dest} it is. Step 6 unlocked!`);
  }

  /* ---------- multi-select activity votes ---------- */
  async function toggleActivity(poll: Poll, optionId: string) {
    if (completed.has(poll.step_n)) { say("This step is locked in."); return; }
    const supabase = supabaseBrowser();
    const mine = (poll.dvotes ?? []).some((v) => v.user_id === userId && v.option_id === optionId && v.answer === "yes");
    if (mine) {
      const { error } = await supabase.from("date_votes").delete().eq("option_id", optionId).eq("user_id", userId);
      if (error) { say("Couldn't update. Try again."); return; }
      setPolls((ps) => ps.map((p) => p.id !== poll.id ? p : { ...p, dvotes: (p.dvotes ?? []).filter((v) => !(v.user_id === userId && v.option_id === optionId)) }));
    } else {
      const { error } = await supabase.from("date_votes").upsert({ poll_id: poll.id, option_id: optionId, user_id: userId, answer: "yes" });
      if (error) { say("Couldn't save. Try again."); return; }
      setPolls((ps) => ps.map((p) => p.id !== poll.id ? p : { ...p, dvotes: [...(p.dvotes ?? []), { option_id: optionId, user_id: userId, answer: "yes" }] }));
      autoAdvance(poll.step_n);
    }
  }

  async function suggestActivity(poll: Poll) {
    const label = suggest.trim();
    if (!label) { say("Type your activity idea first."); return; }
    const supabase = supabaseBrowser();
    const { data: created, error } = await supabase
      .from("poll_options")
      .insert({ poll_id: poll.id, label, meta: `Suggested by ${me?.name ?? "a traveler"}`, sort: poll.options.length })
      .select("id, label, meta, sort")
      .single();
    if (error || !created) { say("Couldn't add it. Try again."); return; }
    setPolls((ps) => ps.map((p) => (p.id !== poll.id ? p : { ...p, options: [...p.options, created] })));
    setSuggest("");
    say("Added! Now vote for it.");
  }

  /* ---------- concierge ---------- */
  async function askConcierge(stepN: number) {
    const text = (conciergeMsg ?? "").trim();
    if (!text) { say("Type your question first."); return; }
    const res = await fetch("/api/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.id, stepN, message: text }),
    }).catch(() => null);
    if (!res?.ok) { say("Couldn't send. Try again, or call us."); return; }
    setConciergeMsg(null);
    say("Sent to your advisor with priority. Expect a reply within one business day.");
  }

  /* ---------- boost the budget ---------- */
  async function submitBoost() {
    const amt = parseInt(boost.amount.replace(/\D/g, "") || "0", 10);
    if (boost.mode !== "cover" && (!amt || amt <= 0)) { say("Enter a real dollar amount."); return; }
    if (boost.mode === "cover" && boost.amount.trim().toUpperCase() !== "COVER") {
      say('Type COVER in the box to confirm you mean the whole trip.'); return;
    }
    const res = await fetch("/api/budget/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.id, mode: boost.mode, amount: boost.mode === "cover" ? 0 : amt, anonymous: boost.anonymous }),
    }).catch(() => null);
    if (!res?.ok) { say("Couldn't send the boost. Try again."); return; }
    setBoostOpen(false);
    setBoost({ mode: "lump", amount: "", anonymous: false, confirm: false });
    say("Done. The group has been told, exactly as previewed.");
  }

  function boostPreview(): string {
    const amt = parseInt(boost.amount.replace(/\D/g, "") || "0", 10);
    const donor = boost.anonymous ? "A generous member of your group" : me?.name ?? "You";
    if (boost.mode === "cover") return `${donor} is covering the entire cost of this trip. Everything the group has planned is now fully funded. Say thank you, and start packing.`;
    if (boost.mode === "perPerson") return `${donor} just added ${fmt(amt || 0)} per traveler to the trip budget. That's ${fmt((amt || 0) * headcount)} across your group of ${headcount}.`;
    return `${donor} just added ${fmt(amt || 0)} to the trip fund. Spread across ${headcount} travelers, that's about ${fmt((amt || 0) / Math.max(headcount, 1))} more per person to play with.`;
  }

  async function autoAdvance(stepN: number) {
    try {
      const res = await fetch("/api/steps/auto-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, stepN }),
      });
      const out = await res.json().catch(() => null);
      if (out?.advanced) {
        setCompleted((c) => new Set([...c, stepN]));
        if (out.nextStep) setCurrent(out.nextStep);
        say(`Everyone voted! Step ${stepN} locked in, and the group has been emailed the results.`);
      } else if (out?.tie) {
        say("Everyone has voted and it's a tie. The group has been emailed; votes stay open.");
      } else if (out?.datesReady) {
        say("Everyone has answered the dates. Results are on their way to the whole group.");
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
    const stillTied = tiedPolls(n);
    if (stillTied.length > 0) {
      setTieBreak({ stepN: n, polls: stillTied });
      say("There's a tie to break first. Your call.");
      return;
    }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("step_progress")
      .upsert({ group_id: group.id, step_n: n, completed_by: userId });
    if (error) { say("Couldn't save progress. Try again."); return; }
    setCompleted((c) => new Set([...c, n]));
    if (n === 3) {
      // Lock structured dates so the itinerary, payments, and savings math have real dates.
      const dp = polls.find((p) => p.step_n === 3 && p.kind === "dates");
      if (dp) {
        const dv = dp.dvotes ?? [];
        const scored = dp.options.map((o) => ({
          o,
          yes: dv.filter((v) => v.option_id === o.id && v.answer === "yes").reduce((s, v) => s + w(v.user_id), 0),
          maybe: dv.filter((v) => v.option_id === o.id && v.answer === "maybe").reduce((s, v) => s + w(v.user_id), 0),
        }));
        const best = scored.sort((a, b) => b.yes - a.yes || b.maybe - a.maybe)[0];
        if (best?.o.meta) {
          const dates = { start: best.o.meta, nights: decidedNights() };
          supabase.from("groups").update({ data: { ...(group.data ?? {}), dates } }).eq("id", group.id)
            .then(() => { if (group.data) group.data.dates = dates; else group.data = { dates }; });
        }
      }
    }
    if (n === 6) {
      // Anyone who asked for a group quote becomes a Gatherwell lead, with home airports attached.
      fetch("/api/leads/flight-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      }).catch(() => {});
    }
    if (n < 9) {
      setCurrent(n + 1);
      notifyStep(n + 1, "opened");
    }
    say(msg || `Step ${n} complete. Step ${n + 1} unlocked! Your group has been emailed.`);
  }

  /* ---------- budget: derived from the group's real vote, adjustable by the organizer ---------- */
  function votedBudgetTarget(): number | null {
    const bp = polls.find((p) => p.kind === "budget");
    if (!bp) return null;
    const override = group.data?.decisions?.[bp.id];
    let winLabel: string | null = null;
    if (override) {
      winLabel = bp.options.find((o) => o.id === override)?.label ?? null;
    } else if (bp.votes.length > 0) {
      const counts = bp.options.map((o) => ({ o, c: bp.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0) }));
      const win = counts.sort((a, b) => b.c - a.c)[0];
      winLabel = win && win.c > 0 ? win.o.label : null;
    }
    if (!winLabel) return null;
    const nums = (winLabel.match(/\d[\d,]*/g) || []).map((s) => parseInt(s.replace(/,/g, ""), 10));
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

  /* ---------- trip length ---------- */
  function decidedNightsUnresolved(): boolean {
    if (typeof tripLength === "number") return false;
    const lp = polls.find((p) => p.step_n === 3 && p.kind === "choice" && p.question.toLowerCase().includes("how long"));
    return !lp || lp.votes.length === 0;
  }

  function decidedNights(): number {
    if (typeof tripLength === "number") return tripLength;
    // "vote": read the winner of the length poll if there is one
    const lp = polls.find((p) => p.step_n === 3 && p.kind === "choice" && p.question.toLowerCase().includes("how long"));
    if (lp && lp.votes.length > 0) {
      const counts = lp.options.map((o) => ({ o, c: lp.votes.filter((v) => v.option_id === o.id).length }));
      const win = counts.sort((a, b) => b.c - a.c)[0];
      const m = win && win.c > 0 ? win.o.label.match(/\d+/) : null;
      if (m) return parseInt(m[0], 10);
    }
    return 7;
  }

  async function saveTripLength(v: number | "vote") {
    if (!isOrganizer) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("groups")
      .update({ data: { ...(group.data ?? {}), budget: budget ?? group.data?.budget, tripLength: v } })
      .eq("id", group.id);
    if (error) { say("Couldn't save the trip length. Try again."); return; }
    setTripLength(v);
    if (v === "vote") {
      const exists = polls.some((p) => p.step_n === 3 && p.question.toLowerCase().includes("how long"));
      if (!exists) {
        const { data: poll } = await supabase
          .from("polls")
          .insert({ group_id: group.id, step_n: 3, kind: "choice", question: "How long should the trip be?" })
          .select("id")
          .single();
        if (poll) {
          const lengths = [
            { label: "4 nights", meta: "A long weekend" },
            { label: "7 nights", meta: "One full week" },
            { label: "10 nights", meta: "Room to breathe" },
            { label: "14 nights", meta: "The big one" },
          ];
          const { data: created } = await supabase
            .from("poll_options")
            .insert(lengths.map((l, i) => ({ poll_id: poll.id, label: l.label, meta: l.meta, sort: i })))
            .select("id, label, meta, sort");
          if (created) {
            setPolls((ps) => [...ps, {
              id: poll.id, step_n: 3, kind: "choice", question: "How long should the trip be?",
              options: [...created].sort((a, b) => a.sort - b.sort), votes: [], dvotes: [],
            }]);
          }
        }
      }
      say("The group will vote on trip length in Step 3.");
    } else {
      say(`Trip length set: ${v} nights.`);
    }
  }

  function fmtDateRange(iso: string, nights: number) {
    const s = new Date(iso + "T12:00:00");
    const e = new Date(s);
    e.setDate(s.getDate() + nights);
    const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sameYear = s.getFullYear() === e.getFullYear();
    return sameYear
      ? `${f(s)} – ${f(e)}, ${e.getFullYear()} · ${nights} nights`
      : `${f(s)}, ${s.getFullYear()} – ${f(e)}, ${e.getFullYear()} · ${nights} nights`;
  }

  /* ---------- organizer-created polls ---------- */
  async function createPoll(stepN: number) {
    const q = pfQ.trim() || (pfKind === "dates" ? "Which of these dates can you make?" : "");
    let opts: { label: string; meta: string | null }[];
    if (pfKind === "dates") {
      const nights = decidedNights();
      opts = [...pfDates].sort().map((d) => ({ label: fmtDateRange(d, nights), meta: d }));
      if (opts.length < 2) { say("Add at least two candidate dates with the calendar."); return; }
    } else {
      opts = pfRows
        .map((r) => ({ label: r.label.trim(), meta: r.meta.trim() || null }))
        .filter((r) => r.label);
      if (!q || opts.length < 2) { say("Add a question and at least two options."); return; }
    }
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
    setPfQ(""); setPfRows([{ label: "", meta: "" }, { label: "", meta: "" }]); setPfDates([]); setPfDateDraft(""); setPollFormStep(null); setPfKind("choice");
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

  /* ---------- destination matching ---------- */
  function visionLabels(): string[] {
    return polls
      .filter((p) => p.step_n === 2 && p.kind === "choice")
      .map((p) => {
        const ov = group.data?.decisions?.[p.id];
        if (ov) return p.options.find((o) => o.id === ov)?.label ?? null;
        const counts = p.options.map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0) }));
        const win = counts.sort((a, b) => b.c - a.c)[0];
        return win && win.c > 0 ? win.o.label : null;
      })
      .filter((x): x is string => !!x);
  }

  async function addDestinationOption(d: Destination) {
    const dp = polls.find((p) => p.step_n === 5 && p.kind === "choice");
    if (!dp) { say("No destination poll to add to. Create one first."); return; }
    const label = `${d.name}, ${d.country}`;
    if (dp.options.some((o) => o.label === label)) { say("Already on the shortlist."); return; }
    const supabase = supabaseBrowser();
    const { data: created, error } = await supabase
      .from("poll_options")
      .insert({ poll_id: dp.id, label, meta: d.blurb, sort: dp.options.length })
      .select("id, label, meta, sort")
      .single();
    if (error || !created) { say("Couldn't add it. Try again."); return; }
    setPolls((ps) => ps.map((p) => (p.id !== dp.id ? p : { ...p, options: [...p.options, created] })));
    say(`${d.name} added to the shortlist.`);
  }

  /* ---------- itinerary builder ---------- */
  function tripDates(): { start: Date; nights: number } | null {
    const d = group.data?.dates;
    if (!d?.start) return null;
    return { start: new Date(d.start + "T12:00:00"), nights: d.nights || decidedNights() };
  }

  function dayLabel(i: number): string {
    const td = tripDates();
    if (!td) return `Day ${i + 1}`;
    const dt = new Date(td.start);
    dt.setDate(dt.getDate() + i);
    return `Day ${i + 1} · ${dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
  }

  function winningActivities(): string[] {
    const mp = polls.find((p) => p.step_n === 8 && p.kind === "multi");
    if (!mp) return [];
    const dv = (mp.dvotes ?? []).filter((v) => v.answer === "yes");
    return mp.options
      .map((o) => ({ o, c: dv.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0) }))
      .filter((r) => r.c > 0)
      .sort((a, b) => b.c - a.c)
      .map((r) => r.o.label.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim());
  }

  const TRANSFER_URL = "https://www.book-online-transfers.com/en/gatherwell-travel";

  function buildItinerary(): { items: ItinItem[] }[] {
    const td = tripDates();
    const nights = td?.nights ?? decidedNights();
    const dayCount = Math.max(2, Math.min(nights + 1, 22));
    const dest = group.data?.destination ?? "";
    const dinnerLink = `https://www.google.com/search?q=${encodeURIComponent(`best group dinner restaurants ${dest}`.trim())}`;
    const acts = winningActivities();
    let a = 0;
    const days: { items: ItinItem[] }[] = [];
    for (let i = 0; i < dayCount; i++) {
      const items: ItinItem[] = [];
      const id = (j: number) => `d${i}-${j}-${Math.floor(Math.random() * 1e6)}`;
      if (i === 0) {
        items.push({ id: id(0), t: "Arrivals · pre-booked group transfer", k: "transfer", link: TRANSFER_URL });
        items.push({ id: id(1), t: "Grocery & essentials run", k: "custom" });
        items.push({ id: id(2), t: "Welcome dinner: first night, all together", k: "meal", link: dinnerLink });
      } else if (i === dayCount - 1) {
        items.push({ id: id(0), t: "Pack, checkout & goodbyes", k: "custom" });
        items.push({ id: id(1), t: "Departure transfer to the airport", k: "transfer", link: TRANSFER_URL });
      } else {
        if (a < acts.length) {
          items.push({ id: id(0), t: `Morning: ${acts[a]}`, k: "activity" });
          a++;
        } else {
          items.push({ id: id(0), t: "Morning: open, follow the mood", k: "free" });
        }
        items.push(i % 2 === 1
          ? { id: id(1), t: "Afternoon: protected free time (the 60/40 rule)", k: "free" }
          : { id: id(2), t: "Afternoon: pool, naps, wandering", k: "free" });
        items.push({ id: id(3), t: "Dinner: pick a spot", k: "meal", link: dinnerLink });
      }
      days.push({ items });
    }
    return days;
  }

  async function saveItinerary(days: { items: ItinItem[] }[]) {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("groups")
      .update({ data: { ...(group.data ?? {}), itinerary: days, payplan } })
      .eq("id", group.id);
    if (error) { say("Couldn't save the itinerary."); return; }
    if (group.data) { group.data.itinerary = days; group.data.payplan = payplan; }
    else group.data = { itinerary: days, payplan };
    say("Itinerary saved for the whole group.");
  }

  function moveItem(di: number, ii: number, dir: "up" | "down" | "prevDay" | "nextDay") {
    if (!itin) return;
    const days = itin.map((d) => ({ items: [...d.items] }));
    const [item] = days[di].items.splice(ii, 1);
    if (dir === "up") days[di].items.splice(Math.max(0, ii - 1), 0, item);
    else if (dir === "down") days[di].items.splice(Math.min(days[di].items.length, ii + 1), 0, item);
    else if (dir === "prevDay" && di > 0) days[di - 1].items.push(item);
    else if (dir === "nextDay" && di < days.length - 1) days[di + 1].items.unshift(item);
    else days[di].items.splice(ii, 0, item);
    setItin(days);
  }

  /* ---------- payment schedule from real dates ---------- */
  function paymentInstallments(): { label: string; count: number } {
    const td = tripDates();
    if (!td || payplan === "full") return { label: "one payment, due now", count: 1 };
    const days = Math.max(0, Math.round((td.start.getTime() - new Date().getTime()) / 86400000));
    const step = payplan === "monthly" ? 30 : 15;
    const count = Math.max(1, Math.min(Math.floor((days - 14) / step), payplan === "monthly" ? 18 : 36));
    return { label: payplan === "monthly" ? `${count} monthly payments` : `${count} payments, twice a month`, count };
  }

  function installmentDates(count: number): string[] {
    const step = payplan === "monthly" ? 30 : 15;
    const out: string[] = [];
    const base = new Date();
    for (let i = 1; i <= count; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + step * i);
      out.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    }
    return out;
  }

  /* ---------- the trip so far (sidebar) ---------- */
  function tripShape() {
    const items: { label: string; value: string; locked: boolean }[] = [];
    const winnersOf = (n: number) =>
      polls
        .filter((p) => p.step_n === n)
        .map((p) => {
          if (p.kind === "dates" || p.kind === "multi") {
            const dv = (p.dvotes ?? []).filter((v) => p.kind === "multi" ? v.answer === "yes" : true);
            if (dv.length === 0) return null;
            const scored = p.options.map((o) => ({
              o,
              yes: dv.filter((v) => v.option_id === o.id && v.answer === "yes").reduce((s, v) => s + w(v.user_id), 0),
              maybe: dv.filter((v) => v.option_id === o.id && v.answer === "maybe").reduce((s, v) => s + w(v.user_id), 0),
            }));
            const best = scored.sort((a, b) => b.yes - a.yes || b.maybe - a.maybe)[0];
            return best && best.yes + best.maybe > 0 ? best.o.label : null;
          }
          const override = group.data?.decisions?.[p.id];
          if (override) return p.options.find((o) => o.id === override)?.label ?? null;
          const counts = p.options
            .filter((o) => !o.label.toLowerCase().includes("flexible"))
            .map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0) }));
          const win = counts.sort((a, b) => b.c - a.c)[0];
          return win && win.c > 0 ? win.o.label : null;
        })
        .filter((x): x is string => !!x);
    const push = (label: string, n: number) => {
      const w = winnersOf(n).slice(0, 2).join(" · ");
      if (w) items.push({ label, value: w, locked: completed.has(n) });
    };
    push("Vision", 2);
    if (tripLength) {
      items.push({
        label: "Length",
        value: typeof tripLength === "number" ? `${tripLength} nights` : `${decidedNights()} nights (group vote)`,
        locked: typeof tripLength === "number" || completed.has(3),
      });
    }
    push("Dates", 3);
    if (budget || completed.has(4)) {
      items.push({ label: "Budget", value: `${fmt(budgetTotal(budget ?? defaultBudget()))} per person`, locked: completed.has(4) });
    }
    if (group.data?.destination) {
      items.push({ label: "Destination", value: group.data.destination, locked: completed.has(5) });
    } else {
      push("Destination", 5);
    }
    push("Home base", 7);
    push("Activities", 8);
    return items;
  }

  /* ---------- poll rendering ---------- */
  function dateBlock(poll: Poll) {
    const closed = completed.has(poll.step_n);
    const dv = poll.dvotes ?? [];
    const wsum = (arr: { user_id: string }[]) => arr.reduce((s, v) => s + w(v.user_id), 0);
    const scored = poll.options.map((o) => ({
      o,
      yes: wsum(dv.filter((v) => v.option_id === o.id && v.answer === "yes")),
      maybe: wsum(dv.filter((v) => v.option_id === o.id && v.answer === "maybe")),
      no: wsum(dv.filter((v) => v.option_id === o.id && v.answer === "no")),
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

  function multiBlock(poll: Poll) {
    const closed = completed.has(poll.step_n);
    const dv = (poll.dvotes ?? []).filter((v) => v.answer === "yes");
    const voted = new Set(dv.map((v) => v.user_id)).size;
    return (
      <div key={poll.id} style={{ marginBottom: 26 }}>
        <h3 style={{ fontSize: 18, marginBottom: 6 }}>
          {poll.question}
          {closed && <span className="decided">Decided</span>}
        </h3>
        <p className="foot-note" style={{ marginTop: 0, marginBottom: 12 }}>
          Pick everything you&apos;d join. Activities aren&apos;t rivals; vote for all of them if you want.
        </p>
        {poll.options.map((o) => {
          const count = dv.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0);
          const mine = dv.some((v) => v.option_id === o.id && v.user_id === userId);
          return (
            <div
              key={o.id}
              className={`poll-opt ${mine ? "sel" : ""} ${closed ? "closed" : ""}`}
              onClick={() => toggleActivity(poll, o.id)}
            >
              <span className="name">{mine ? "✓ " : ""}{o.label}</span>
              {count > 0 && <span className="votes">{count} in</span>}
              {o.meta && <span className="meta">{o.meta}</span>}
              {count > 0 && (
                <div className="vote-track">
                  <div className="vote-fill" style={{ width: `${Math.min((count / Math.max(headcount, 1)) * 100, 100)}%` }} />
                </div>
              )}
            </div>
          );
        })}
        {!closed && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input
              className="pf-input"
              style={{ marginBottom: 0 }}
              placeholder="Suggest your own, kids' picks welcome: e.g. Emma (9) wants the turtle snorkel"
              value={suggest}
              onChange={(e) => setSuggest(e.target.value)}
            />
            <button className="btn btn-outline btn-sm" style={{ whiteSpace: "nowrap" }} onClick={() => suggestActivity(poll)}>
              Add idea
            </button>
          </div>
        )}
        <p className="foot-note">
          {closed ? "Anchors locked. The 60/40 rule protects the rest." : `${voted} of ${members.length} have picked so far. Couples count as two.`}
        </p>
      </div>
    );
  }

  function pollBlock(poll: Poll) {
    if (poll.kind === "dates") return dateBlock(poll);
    if (poll.kind === "multi") return multiBlock(poll);
    const total = poll.votes.reduce((s, v) => s + w(v.user_id), 0);
    const mine = poll.votes.find((v) => v.user_id === userId)?.option_id;
    const isBudget = poll.kind === "budget";
    const override = group.data?.decisions?.[poll.id];
    const closed = (completed.has(poll.step_n) && poll.step_n !== 6) || !!override;
    const max = Math.max(
      ...poll.options
        .filter((o) => !o.label.toLowerCase().includes("flexible"))
        .map((o) => poll.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0)),
      0
    );
    return (
      <div key={poll.id} style={{ marginBottom: 26 }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>
          {poll.question}
          {closed && <span className="decided">Decided</span>}
          {isOrganizer && !closed && (
            <>
              <button
                className="poll-del"
                onClick={() => (confirmDel === poll.id ? deletePoll(poll.id) : setConfirmDel(poll.id))}
              >
                {confirmDel === poll.id ? "Click again to remove" : "Remove"}
              </button>
              <button className="poll-del" style={{ color: "var(--sage-deep)" }} onClick={() => setRecDecision(recDecision === poll.id ? null : poll.id)}>
                {recDecision === poll.id ? "Cancel" : "Already decided?"}
              </button>
            </>
          )}
        </h3>
        {recDecision === poll.id && !closed && (
          <div className="callout sage" style={{ marginTop: 0 }}>
            <b>Record the decision your group already made</b>
            Tap the option that won. It locks in without a vote.
            <div className="tpl-chips" style={{ marginTop: 10 }}>
              {poll.options.map((o) => (
                <button key={o.id} className="tpl-chip" onClick={() => { declareWinner(poll.id, o.id); setRecDecision(null); }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {poll.options.map((o) => {
          const count = poll.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0);
          const isFlex = o.label.toLowerCase().includes("flexible");
          const win = override ? o.id === override : total > 0 && !isFlex && count === max && max > 0;
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
            ? "Budget votes are anonymous: everyone sees the totals, never who picked what. Couples count twice."
            : `${new Set(poll.votes.map((v) => v.user_id)).size} of ${members.length} have voted. Couples count as two votes.`}
        </p>
      </div>
    );
  }

  function stepPolls(n: number) {
    const blocks = polls.filter((p) => p.step_n === n).map(pollBlock);
    const locked = completed.has(n) && n !== 6;
    return (
      <>
        {blocks}
        {isOrganizer && !locked && (
          pollFormStep === n ? (
            <div className="bw" style={{ marginTop: 0 }}>
              <h3>New poll for this step</h3>
              {n === 3 && (
                <div className="tpl-chips" style={{ marginBottom: 12 }}>
                  <button className={`tpl-chip ${pfKind === "choice" ? "on" : ""}`} onClick={() => setPfKind("choice")}>
                    Pick one winner
                  </button>
                  <button className={`tpl-chip ${pfKind === "dates" ? "on" : ""}`} onClick={() => setPfKind("dates")}>
                    Date availability
                  </button>
                </div>
              )}
              <p className="bw-note" style={{ marginTop: 0, marginBottom: 10 }}>
                {pfKind === "dates"
                  ? `Pick each candidate start date from the calendar. Each becomes a ${decidedNights()}-night window${tripLength === "vote" ? " (from the group's length vote)" : tripLength ? "" : " (set the trip length in Step 1 to change this)"}, and every traveler answers Yes, Maybe, or No.`
                  : "The group votes and one option wins."}
              </p>
              <input
                className="pf-input"
                placeholder={pfKind === "dates" ? "Which of these dates can you make?" : "Your question, e.g. Which house style fits us?"}
                value={pfQ}
                onChange={(e) => setPfQ(e.target.value)}
              />
              {pfKind === "dates" && tripLength === "vote" && decidedNightsUnresolved() ? (
                <div className="callout" style={{ marginTop: 0 }}>
                  <b>Length first, then dates</b>
                  Your group is voting on trip length (the poll above). Once that has votes, come back and the date ranges will use the winning length.
                </div>
              ) : pfKind === "dates" ? (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <input
                      type="date"
                      className="pf-input"
                      style={{ marginBottom: 0, maxWidth: 220 }}
                      value={pfDateDraft}
                      onChange={(e) => setPfDateDraft(e.target.value)}
                    />
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        if (!pfDateDraft) { say("Pick a start date first."); return; }
                        if (!pfDates.includes(pfDateDraft)) setPfDates((d) => [...d, pfDateDraft]);
                        setPfDateDraft("");
                      }}
                    >
                      Add date
                    </button>
                  </div>
                  {pfDates.length > 0 && (
                    <div className="tpl-chips" style={{ marginBottom: 10 }}>
                      {[...pfDates].sort().map((d) => (
                        <button
                          key={d}
                          className="tpl-chip on"
                          title="Click to remove"
                          onClick={() => setPfDates((ds) => ds.filter((x) => x !== d))}
                        >
                          {fmtDateRange(d, decidedNights())} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {pfRows.map((r, i) => (
                    <div key={i} className="opt-row">
                      <input
                        className="pf-input"
                        placeholder={`Option ${i + 1}, e.g. Riviera Maya, Mexico`}
                        value={r.label}
                        onChange={(e) => setPfRows((rs) => rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      />
                      <input
                        className="pf-input"
                        placeholder="Short description (optional)"
                        value={r.meta}
                        onChange={(e) => setPfRows((rs) => rs.map((x, j) => (j === i ? { ...x, meta: e.target.value } : x)))}
                      />
                    </div>
                  ))}
                  <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => setPfRows((rs) => [...rs, { label: "", meta: "" }])}>
                    + Add another option
                  </button>
                </>
              )}
              <div className="step-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => createPoll(n)}>Create poll</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setPollFormStep(null); setPfQ(""); setPfOpts(""); setPfDates([]); setPfDateDraft(""); setPfKind("choice"); }}>Cancel</button>
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
        {isConcierge && (
          <div className="conc-panel">
            <div className="conc-head">Concierge · your advisor is on this step</div>
            {conciergeMsg === null ? (
              <div className="step-actions" style={{ marginTop: 8 }}>
                <button className="btn btn-gold btn-sm" onClick={() => setConciergeMsg("")}>Email your advisor</button>
                <a className="btn btn-outline btn-sm" href="tel:+18886643090">Call (888) 664-3090</a>
              </div>
            ) : (
              <>
                <textarea
                  className="pf-input"
                  rows={3}
                  style={{ marginTop: 10 }}
                  placeholder={`Ask anything about ${st.t.toLowerCase()}. Your advisor sees your group's full context.`}
                  value={conciergeMsg}
                  onChange={(e) => setConciergeMsg(e.target.value)}
                />
                <div className="step-actions" style={{ marginTop: 0 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => askConcierge(n)}>Send with priority</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setConciergeMsg(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
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
            <div className="bw">
              <h3>How long is this trip?</h3>
              <p className="bw-note" style={{ marginTop: 0, marginBottom: 12 }}>
                {isOrganizer
                  ? "Set it now, or let the group vote in Step 3. Date options will use this length."
                  : "Your organizer sets this, or the group votes on it in Step 3."}
              </p>
              <div className="tpl-chips">
                {([
                  [4, "Long weekend · 4 nights"],
                  [7, "One week · 7 nights"],
                  [10, "Ten days · 10 nights"],
                  [14, "Two weeks · 14 nights"],
                  ["vote", "Let the group vote"],
                ] as [number | "vote", string][]).map(([v, label]) => (
                  <button
                    key={String(v)}
                    className={`tpl-chip ${tripLength === v ? "on" : ""}`}
                    disabled={!isOrganizer}
                    style={!isOrganizer ? { cursor: "default", opacity: tripLength === v ? 1 : 0.45 } : undefined}
                    onClick={() => isOrganizer && saveTripLength(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {isOrganizer && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                  <span className="pf-label" style={{ margin: 0 }}>Or custom:</span>
                  <input
                    className="pf-input"
                    style={{ marginBottom: 0, maxWidth: 110 }}
                    inputMode="numeric"
                    placeholder="nights"
                    defaultValue={typeof tripLength === "number" && ![4, 7, 10, 14].includes(tripLength) ? tripLength : ""}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
                      if (v >= 1 && v <= 60 && v !== tripLength) saveTripLength(v);
                    }}
                  />
                  <span className="bw-note" style={{ margin: 0 }}>nights</span>
                </div>
              )}
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
            {isOrganizer && (
              <div className="bw">
                <h3>Where does your group talk?</h3>
                <p className="bw-note" style={{ marginTop: 0, marginBottom: 10 }}>
                  Paste your group&apos;s WhatsApp invite link (and a video-call link if you use one). A &quot;Discuss&quot; button will appear in group emails whenever a decision needs talking out.
                </p>
                <input
                  className="pf-input"
                  placeholder="WhatsApp group invite link, e.g. https://chat.whatsapp.com/..."
                  value={discuss.whatsapp ?? ""}
                  onChange={(e) => setDiscuss({ ...discuss, whatsapp: e.target.value })}
                />
                <input
                  className="pf-input"
                  placeholder="Video call link (Zoom, FaceTime, Meet) · optional"
                  value={discuss.video ?? ""}
                  onChange={(e) => setDiscuss({ ...discuss, video: e.target.value })}
                />
                <button className="btn btn-outline btn-sm" onClick={saveDiscuss}>Save links</button>
              </div>
            )}
            {isSolo && headcount >= 8 && (
              <div className="callout">
                <b>Your group outgrew the Solo plan</b>
                Solo covers up to 8 travelers. Upgrade to Group for unlimited travelers, Boost the Budget, and group flight quotes.
                <div style={{ marginTop: 10 }}>
                  <a className="btn btn-primary btn-sm" href="/api/stripe/checkout?plan=group">Upgrade to Group</a>
                </div>
              </div>
            )}
            {(() => {
              const waiting = members
                .filter((m) => m.meta?.answering_for === "partner_separate" && m.meta?.partner_name)
                .map((m) => `${m.meta!.partner_name} (${m.name}'s partner)`);
              return waiting.length > 0 ? (
                <div className="callout">
                  <b>Still to join</b>
                  {waiting.join(" · ")}. Send them the invite link so their votes count.
                </div>
              ) : null;
            })()}
            <div className="callout sage">
              <b>Kids on this trip?</b>
              Our suggested house rule: adults vote on the structure (dates, budget, where), and kids get a voice on the fun in Step 8. Teens 13+ can be invited as full voting members if your group wants; that&apos;s your call as organizer.
            </div>
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
              const n = headcount;
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
                    {(() => {
                      const td = tripDates();
                      if (!td) return null;
                      const months = Math.max(1, Math.round((td.start.getTime() - new Date().getTime()) / (30 * 86400000)));
                      return ` Save ${fmt(Math.ceil(budgetTotal(b) / months))} a month between now and departure and the trip is paid before you pack.`;
                    })()}
                  </p>
                </div>
              );
            })()}
            {!completed.has(4) && (
              isSolo ? (
                <div className="callout" style={{ opacity: 0.85 }}>
                  <b>🔒 Boost the Budget · Group plan feature</b>
                  On the Group plan, any traveler can add funds to the trip or cover it entirely, announced to the group on their terms.
                  <div style={{ marginTop: 10 }}>
                    <a className="btn btn-outline btn-sm" href="/api/stripe/checkout?plan=group">Upgrade to Group</a>
                  </div>
                </div>
              ) : (
                <div className="bw">
                  <h3>Feeling generous?</h3>
                  <p className="bw-note" style={{ marginTop: 0, marginBottom: 10 }}>
                    Any traveler can quietly raise the trip&apos;s budget, or take care of the whole thing.
                  </p>
                  {!boostOpen ? (
                    <button className="btn btn-outline btn-sm" onClick={() => setBoostOpen(true)}>I&apos;d like to help fund this trip</button>
                  ) : (
                    <>
                      {(() => {
                        const b = budget ?? defaultBudget();
                        return (
                          <p className="bw-note" style={{ marginTop: 0 }}>
                            For your group of {headcount}: the current budget totals {fmt(budgetTotal(b) * headcount)} ({fmt(budgetTotal(b))} per person).
                          </p>
                        );
                      })()}
                      <div className="tpl-chips" style={{ marginBottom: 10 }}>
                        <button className={`tpl-chip ${boost.mode === "lump" ? "on" : ""}`} onClick={() => setBoost({ ...boost, mode: "lump", confirm: false })}>Add a lump sum</button>
                        <button className={`tpl-chip ${boost.mode === "perPerson" ? "on" : ""}`} onClick={() => setBoost({ ...boost, mode: "perPerson", confirm: false })}>Add $ per traveler</button>
                        <button className={`tpl-chip ${boost.mode === "cover" ? "on" : ""}`} onClick={() => setBoost({ ...boost, mode: "cover", confirm: false })}>Cover the whole trip</button>
                      </div>
                      <input
                        className="pf-input"
                        inputMode={boost.mode === "cover" ? "text" : "numeric"}
                        placeholder={boost.mode === "cover" ? 'Type COVER to confirm' : boost.mode === "perPerson" ? "Amount per traveler, e.g. 150" : "Amount, e.g. 2000"}
                        value={boost.amount}
                        onChange={(e) => setBoost({ ...boost, amount: e.target.value, confirm: false })}
                      />
                      <div className="tpl-chips" style={{ marginBottom: 12 }}>
                        <button className={`tpl-chip ${!boost.anonymous ? "on" : ""}`} onClick={() => setBoost({ ...boost, anonymous: false })}>Share my name</button>
                        <button className={`tpl-chip ${boost.anonymous ? "on" : ""}`} onClick={() => setBoost({ ...boost, anonymous: true })}>Keep me anonymous</button>
                      </div>
                      {boost.mode === "cover" && (
                        <div className="callout" style={{ margin: "0 0 12px" }}>
                          <b>Covering the whole trip?</b>
                          Our full-service team can plan and book every detail, so you only write one check.{" "}
                          <a href="https://gatherwelltravel.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--terracotta)", fontWeight: 600 }}>Talk to Gatherwell Travel</a>
                        </div>
                      )}
                      <div className="callout sage" style={{ margin: "0 0 12px" }}>
                        <b>The group will receive exactly this message:</b>
                        {boostPreview()}
                      </div>
                      <div className="step-actions" style={{ marginTop: 0 }}>
                        {!boost.confirm ? (
                          <button className="btn btn-primary btn-sm" onClick={() => setBoost({ ...boost, confirm: true })}>Continue</button>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={submitBoost}>Confirm and tell the group</button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => { setBoostOpen(false); setBoost({ mode: "lump", amount: "", anonymous: false, confirm: false }); }}>Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )
            )}
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
Travelers: ${headcount}

${"Category".padEnd(16)}${"Per Person".padEnd(13)}Group Total
${rows.map(([c, v]) => c.padEnd(16) + fmt(v).padEnd(13) + fmt(v * headcount)).join("\n")}`,
                  fdata:
`Category,Per Person,Group Total\n` +
rows.map(([c, v]) => `"${c}","${fmt(v)}","${fmt(v * headcount)}"`).join("\n"),
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
            {completed.has(2) && (() => {
              const matches = matchDestinations({
                labels: visionLabels(),
                budgetPerPerson: budget || completed.has(4) ? budgetTotal(budget ?? defaultBudget()) : null,
                kidsPresent: members.some((m) => (m.meta?.kids ?? 0) > 0),
                nightsKnown: typeof tripLength === "number" ? tripLength : group.data?.dates?.nights ?? null,
              });
              return (
                <div className="bw">
                  <h3>Matched to your group <span className="bw-tag">by Gatherwell</span></h3>
                  <p className="bw-note" style={{ marginTop: 0, marginBottom: 14 }}>
                    Scored against your group&apos;s own votes: the vision, the budget, who&apos;s coming, and how far you&apos;ll fly.
                  </p>
                  {matches.map(({ d, why }) => (
                    <div key={d.id} className="dest-card">
                      <div className="dc-head">
                        <b>{d.name}</b>
                        <span className="dc-country">{d.country}</span>
                        <span className="dc-months">{d.months}</span>
                      </div>
                      <p className="dc-blurb">{d.blurb}</p>
                      {why.length > 0 && <p className="dc-why">Why it fits: {why.join(" · ")}</p>}
                      {d.picks && d.picks.length > 0 && (
                        <p className="dc-picks">Gatherwell insider access: {d.picks.map((p) => p.t).join(" · ")}</p>
                      )}
                      <div className="step-actions" style={{ marginTop: 10 }}>
                        {isOrganizer && !completed.has(5) && (
                          <button className="btn btn-primary btn-sm" onClick={() => addDestinationOption(d)}>Add to the shortlist</button>
                        )}
                        {d.villa >= 1 && (
                          <a className="btn btn-outline btn-sm" href="https://villa-info.net" target="_blank" rel="noopener noreferrer">See villas</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {isOrganizer && !completed.has(5) && (
              <div className="callout" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span><b>Already decided?</b> Skip the vote and enter it.</span>
                <input
                  className="pf-input"
                  style={{ marginBottom: 0, maxWidth: 240, flex: "1 1 180px" }}
                  placeholder="e.g. Algarve, Portugal"
                  value={destSkip}
                  onChange={(e) => setDestSkip(e.target.value)}
                />
                <button className="btn btn-outline btn-sm" onClick={skipDestination}>Lock it in</button>
              </div>
            )}
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
            {stepPolls(6)}
            <div className="partner-card">
              <div className="lg" style={{ background: "#0770E3" }}>S</div>
              <div><h4>Watch your route on Skyscanner</h4><p>Search your route and dates, then tap &quot;Get price alerts.&quot; Skyscanner emails you when the fare moves, so the group buys on a signal, not a hunch.</p></div>
              <a className="btn btn-sage btn-sm" href="https://www.skyscanner.com" target="_blank" rel="noopener noreferrer">Open</a>
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#4A3F35" }}>G</div>
              <div><h4>Have Gatherwell ticket the group <span className="badge">$50/person</span></h4><p>Flat $50 per traveler, matching online pricing: advisors don&apos;t earn on flights. We hold group space and ticket everyone together. Ideal for 10+ from one city.</p></div>
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
            {isOrganizer && (
              <div className="bw">
                <h3>Want us to pull options for you?</h3>
                <p className="bw-note" style={{ marginTop: 0, marginBottom: 10 }}>
                  One tap sends Gatherwell your group&apos;s dates, budget, and headcount. We reply with hand-picked villas (or ships) that actually fit.
                </p>
                {stayReq === null ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setStayReq("")}>Request options from Gatherwell</button>
                ) : (
                  <>
                    <textarea
                      className="pf-input"
                      rows={3}
                      placeholder="Anything we should know? Pool a must, walkable to town, cruise-curious, accessibility needs…"
                      value={stayReq}
                      onChange={(e) => setStayReq(e.target.value)}
                    />
                    <div className="step-actions" style={{ marginTop: 0 }}>
                      <button className="btn btn-primary btn-sm" onClick={async () => {
                        const res = await fetch("/api/leads/stay-quote", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ groupId: group.id, preferences: stayReq }),
                        }).catch(() => null);
                        if (!res?.ok) { say("Couldn't send. Try again."); return; }
                        setStayReq(null);
                        say("Sent! Gatherwell will reply with options that fit your group.");
                      }}>Send request</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setStayReq(null)}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )}
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

            <div className="bw">
              <h3>The itinerary <span className="bw-tag">the keepsake</span></h3>
              {!tripDates() ? (
                <p className="bw-note" style={{ marginTop: 0 }}>
                  Lock your dates in Step 3 and the day-by-day itinerary builds itself here.
                </p>
              ) : itin === null ? (
                <>
                  <p className="bw-note" style={{ marginTop: 0, marginBottom: 12 }}>
                    One click drafts your {(tripDates()!.nights) + 1} days: winning activities placed, transfers and
                    the welcome dinner slotted, free time protected. Then shape it however you like.
                  </p>
                  {isOrganizer ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setItin(buildItinerary())}>Build my itinerary</button>
                  ) : (
                    <p className="bw-note" style={{ marginTop: 0 }}>Your organizer builds this; it appears here when saved.</p>
                  )}
                </>
              ) : (
                <>
                  {itin.map((day, di) => (
                    <div key={di} className="it-day">
                      <div className="it-head">{dayLabel(di)}</div>
                      {day.items.map((item, ii) => (
                        <div key={item.id} className="it-row">
                          {isOrganizer ? (
                            <input
                              className="it-input"
                              value={item.t}
                              onChange={(e) => {
                                const days = itin.map((d) => ({ items: [...d.items] }));
                                days[di].items[ii] = { ...item, t: e.target.value };
                                setItin(days);
                              }}
                            />
                          ) : (
                            <span className="it-text">{item.t}</span>
                          )}
                          {item.link && (
                            <a className="it-link" href={item.link} target="_blank" rel="noopener noreferrer">
                              {item.k === "transfer" ? "Book transfer" : "Research"}
                            </a>
                          )}
                          {isOrganizer && (
                            <span className="it-ctl">
                              <button onClick={() => moveItem(di, ii, "up")} title="Move up">↑</button>
                              <button onClick={() => moveItem(di, ii, "down")} title="Move down">↓</button>
                              <button onClick={() => moveItem(di, ii, "prevDay")} title="Previous day">◂</button>
                              <button onClick={() => moveItem(di, ii, "nextDay")} title="Next day">▸</button>
                              <button onClick={() => {
                                const days = itin.map((d) => ({ items: [...d.items] }));
                                days[di].items.splice(ii, 1);
                                setItin(days);
                              }} title="Remove">✕</button>
                            </span>
                          )}
                        </div>
                      ))}
                      {isOrganizer && (
                        <button
                          className="it-add"
                          onClick={() => {
                            const days = itin.map((d) => ({ items: [...d.items] }));
                            days[di].items.push({ id: `n${di}-${days[di].items.length}-${Math.floor(Math.random() * 1e6)}`, t: "New plan…", k: "custom" });
                            setItin(days);
                          }}
                        >
                          + Add to this day
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="step-actions" style={{ marginTop: 16 }}>
                    {isOrganizer && (
                      <button className="btn btn-primary btn-sm" onClick={() => saveItinerary(itin)}>Save itinerary for the group</button>
                    )}
                    {isSolo ? (
                      <a className="btn btn-outline btn-sm" href="/api/stripe/checkout?plan=group">🔒 Print edition: upgrade to Group</a>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print / save as PDF</button>
                    )}
                  </div>
                  <p className="bw-note">
                    Transfers are pre-bookable through our partner; twelve people in a taxi line is how trips start badly.
                  </p>
                </>
              )}
            </div>

            <div className="bw">
              <h3>Payments</h3>
              <p className="bw-note" style={{ marginTop: 0, marginBottom: 10 }}>
                How does the group want to pay itself off?
              </p>
              <div className="tpl-chips" style={{ marginBottom: 8 }}>
                {([["full", "Pay in full"], ["monthly", "Monthly until the trip"], ["biweekly", "Twice a month"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    className={`tpl-chip ${payplan === v ? "on" : ""}`}
                    disabled={!isOrganizer}
                    onClick={() => {
                      if (!isOrganizer) return;
                      setPayplan(v);
                      const supabase = supabaseBrowser();
                      supabase.from("groups").update({ data: { ...(group.data ?? {}), payplan: v } }).eq("id", group.id)
                        .then(() => { if (group.data) group.data.payplan = v; else group.data = { payplan: v }; });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="bw-note">
                {(() => {
                  const b = budget ?? defaultBudget();
                  const { label, count } = paymentInstallments();
                  const per = Math.ceil(budgetTotal(b) / count);
                  return `${fmt(budgetTotal(b))} per person as ${label}${count > 1 ? ` of ${fmt(per)}` : ""}. The schedule download lists every date, per traveler.`;
                })()}
              </p>
            </div>
            <div className="step-actions" style={{ marginTop: 22 }}>
              {completeBtn(9, done ? "Trip Planned 🎉" : "Generate Final Outputs →", true, "Trip complete! 🎉 Every output is ready whenever you need it.")}
              <button className="btn btn-outline btn-sm" onClick={() => setModal({
                title: "Master Itinerary",
                fname: "Master-Itinerary.txt",
                body:
`${group.name.toUpperCase()} · MASTER ITINERARY
Travelers: ${headcount}
Budget: ${fmt(budgetTotal(budget ?? defaultBudget()))} per person · ${fmt(budgetTotal(budget ?? defaultBudget()) * headcount)} group total

Assembled from your group's winning votes:
${polls.map((p) => {
  const counts = p.options.map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).length }));
  const win = counts.sort((a, b) => b.c - a.c)[0];
  return `  Step ${p.step_n}: ${p.question}\n    → ${win && win.c > 0 ? win.o.label : "(no votes yet)"}`;
}).join("\n")}

Booked through: Gatherwell partners · GetYourGuide · Rental Escapes · Luxury Rentals
Need a human? gatherwelltravel.com`,
              })}>Itinerary preview</button>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const b = budget ?? defaultBudget();
                const total = budgetTotal(b);
                const parties = members.map((m) => {
                  const seats = seatsOf(m);
                  let who = m.meta?.answering_for === "couple" && m.meta?.partner_name ? `${m.name} & ${m.meta.partner_name}` : m.name;
                  if ((m.meta?.kids ?? 0) > 0) who += ` (+${m.meta!.kids} kid${m.meta!.kids! > 1 ? "s" : ""})`;
                  return { who, seats };
                });
                const { count } = paymentInstallments();
                if (count > 1) {
                  const dates = installmentDates(count);
                  const per = Math.ceil(total / count);
                  const bodyRows = parties.map((p) => `${p.who} · ${fmt(per * p.seats)} × ${count} payments`).join("\n");
                  const csvRows = parties.flatMap((p) =>
                    dates.map((dt, i) => `"${p.who}","Payment ${i + 1} of ${count}","${dt}","${fmt(per * p.seats)}"`)
                  ).join("\n");
                  setModal({
                    title: "Payment Schedule",
                    fname: "Payment-Schedule.csv",
                    body:
`PAYMENT SCHEDULE · ${group.name}
Per person: ${fmt(total)} · Group total: ${fmt(total * headcount)}
Plan: ${count} payments of ${fmt(per)} per person, first due ${dates[0]}

${bodyRows}

The downloaded file lists every payment date for every traveler.`,
                    fdata:
`Traveler,Payment,Due date,Amount\n` + csvRows,
                  });
                } else {
                  const dep = Math.round(total * 0.25);
                  const bal = total - dep;
                  setModal({
                    title: "Payment Schedule",
                    fname: "Payment-Schedule.csv",
                    body:
`PAYMENT SCHEDULE · ${group.name}
Per person: ${fmt(total)} · Group total: ${fmt(total * headcount)}

${"Traveler".padEnd(24)}${"Deposit (25%)".padEnd(16)}${"Balance".padEnd(11)}Balance Due
${parties.map((p) => p.who.padEnd(24) + fmt(dep * p.seats).padEnd(16) + fmt(bal * p.seats).padEnd(11) + "60 days before departure").join("\n")}`,
                    fdata:
`Traveler,Deposit (25%),Balance,Balance Due\n` +
parties.map((p) => `"${p.who}","${fmt(dep * p.seats)}","${fmt(bal * p.seats)}","60 days before departure"`).join("\n"),
                  });
                }
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
                        <div className="s">{locked ? "Locked" : done ? (st.n === 6 ? "Ongoing" : "Complete") : st.s}</div>
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

      {profileOpen && (
        <div className="modal-bg">
          <div className="modal">
            <h3>Before you vote: who are you?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7, marginBottom: 14 }}>
              Thirty seconds, once. It makes every vote and every dollar figure accurate.
            </p>
            <label className="pf-label">Your name</label>
            <input className="pf-input" placeholder="e.g. Julie" value={pv.name ?? ""} onChange={(e) => setPv({ ...pv, name: e.target.value })} />
            <label className="pf-label">Are you answering…</label>
            <div className="tpl-chips" style={{ marginBottom: 12 }}>
              <button className={`tpl-chip ${pv.answering_for === "solo" ? "on" : ""}`} onClick={() => setPv({ ...pv, answering_for: "solo" })}>Just for me</button>
              <button className={`tpl-chip ${pv.answering_for === "couple" ? "on" : ""}`} onClick={() => setPv({ ...pv, answering_for: "couple" })}>For us as a couple</button>
              <button className={`tpl-chip ${pv.answering_for === "partner_separate" ? "on" : ""}`} onClick={() => setPv({ ...pv, answering_for: "partner_separate" })}>My partner answers separately</button>
            </div>
            {pv.answering_for === "couple" && (
              <>
                <p className="bw-note" style={{ marginTop: 0 }}>
                  Answering as a couple means every vote you cast counts as two, and you both count in the budget and headcount.
                </p>
                <label className="pf-label">Your partner&apos;s name</label>
                <input className="pf-input" placeholder="Partner's name" value={pv.partner_name ?? ""} onChange={(e) => setPv({ ...pv, partner_name: e.target.value })} />
              </>
            )}
            {pv.answering_for === "partner_separate" && (
              <>
                <label className="pf-label">Your partner&apos;s name (so the organizer knows who&apos;s still to join)</label>
                <input className="pf-input" placeholder="Partner's name" value={pv.partner_name ?? ""} onChange={(e) => setPv({ ...pv, partner_name: e.target.value })} />
              </>
            )}
            <label className="pf-label">Kids traveling with you</label>
            <div className="tpl-chips" style={{ marginBottom: 12 }}>
              {[0, 1, 2, 3, 4].map((k) => (
                <button key={k} className={`tpl-chip ${(pv.kids ?? 0) === k ? "on" : ""}`} onClick={() => setPv({ ...pv, kids: k })}>
                  {k === 0 ? "None" : k}{k === 4 ? "+" : ""}
                </button>
              ))}
            </div>
            {(pv.kids ?? 0) > 0 && (
              <>
                <label className="pf-label">Their ages (helps with houses and activities)</label>
                <input className="pf-input" placeholder="e.g. 6, 9, 14" value={pv.kid_ages ?? ""} onChange={(e) => setPv({ ...pv, kid_ages: e.target.value })} />
              </>
            )}
            <label className="pf-label">Home airport</label>
            <input
              className="pf-input"
              list="gw-airports"
              placeholder="Start typing a city or code"
              value={pv.home_airport ?? ""}
              onChange={(e) => setPv({ ...pv, home_airport: e.target.value })}
            />
            <datalist id="gw-airports">
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.code} · {a.city}</option>
              ))}
            </datalist>
            <label className="pf-label">Packing style</label>
            <div className="tpl-chips" style={{ marginBottom: 12 }}>
              <button className={`tpl-chip ${pv.bags === "carryon" ? "on" : ""}`} onClick={() => setPv({ ...pv, bags: "carryon" })}>Carry-on only</button>
              <button className={`tpl-chip ${pv.bags === "checked" ? "on" : ""}`} onClick={() => setPv({ ...pv, bags: "checked" })}>I check a bag</button>
            </div>
            <label className="pf-label">Cabin comfort</label>
            <div className="tpl-chips" style={{ marginBottom: 16 }}>
              <button className={`tpl-chip ${pv.cabin === "economy" ? "on" : ""}`} onClick={() => setPv({ ...pv, cabin: "economy" })}>Economy</button>
              <button className={`tpl-chip ${pv.cabin === "premium" ? "on" : ""}`} onClick={() => setPv({ ...pv, cabin: "premium" })}>Premium economy</button>
              <button className={`tpl-chip ${pv.cabin === "business" ? "on" : ""}`} onClick={() => setPv({ ...pv, cabin: "business" })}>Business</button>
            </div>
            <div className="step-actions">
              <button className="btn btn-primary" onClick={saveProfile}>Save and start voting</button>
            </div>
          </div>
        </div>
      )}

      {tieBreak && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setTieBreak(null)}>×</button>
            <h3>Break the tie</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7, marginBottom: 16 }}>
              The group is split, so the call is yours. Pick the winner for each tied poll; your choice is recorded as the decision.
            </p>
            {tieBreak.polls.map((p) => {
              const counts = p.options
                .filter((o) => !o.label.toLowerCase().includes("flexible"))
                .map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).reduce((s, v) => s + w(v.user_id), 0) }))
                .sort((a, b) => b.c - a.c);
              const top = counts.filter((x) => x.c === counts[0].c);
              return (
                <div key={p.id} style={{ marginBottom: 18 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>{p.question}</h3>
                  {top.map(({ o, c }) => (
                    <div key={o.id} className="poll-opt" onClick={() => declareWinner(p.id, o.id)}>
                      <span className="name">{o.label}</span>
                      <span className="votes">{c} votes</span>
                      {o.meta && <span className="meta">{o.meta}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
            <p className="foot-note">After the ties are broken, complete the step again.</p>
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

      {/* Printed itinerary: the keepsake. Hidden on screen, becomes the document when printing. */}
      {itin && (
        <div className="print-doc">
          <div className="pd-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/groups-logo.png" alt="Groups by Gatherwell" style={{ width: 170 }} />
          </div>
          <h1 className="pd-title">{group.name}</h1>
          <div className="pd-meta">
            {group.data?.destination ? `${group.data.destination} · ` : ""}
            {tripDates() ? `${tripDates()!.start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${tripDates()!.nights} nights · ` : ""}
            {headcount} travelers · {fmt(budgetTotal(budget ?? defaultBudget()))} per person
          </div>
          {itin.map((day, di) => (
            <div key={di} className="pd-day">
              <div className="pd-day-head">{dayLabel(di)}</div>
              {day.items.map((item) => (
                <div key={item.id} className="pd-item">{item.t}</div>
              ))}
            </div>
          ))}
          <div className="pd-foot">
            Planned together on Groups by Gatherwell · A Gatherwell Travel Company<br />
            hello@gatherwelltravel.com · (888) 664-3090 · www.groupsbygatherwell.com
          </div>
        </div>
      )}
    </div>
  );
}
