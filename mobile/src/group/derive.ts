/**
 * Every calculation the group screen makes, lifted from the website's GroupFlow
 * component and kept pure so the numbers on a phone can never disagree with the
 * numbers in a browser. Nothing here touches the network or React.
 */
import type {
  Budget,
  DateVote,
  Group,
  ItinDay,
  ItinItem,
  Member,
  PayPlan,
  Poll,
} from "./types";

export const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export const BUDGET_ROWS: [keyof Budget, string][] = [
  ["flights", "Flights"],
  ["stay", "Accommodation"],
  ["activities", "Activities"],
  ["food", "Food & local"],
];

export const budgetBase = (b: Budget) => b.flights + b.stay + b.activities + b.food;
export const budgetBuffer = (b: Budget) => Math.round(budgetBase(b) * 0.1);
export const budgetTotal = (b: Budget) => budgetBase(b) + budgetBuffer(b);

export const TRANSFER_URL = "https://www.book-online-transfers.com/en/gatherwell-travel";

/* ---------------- who counts for how much ---------------- */

/** A member answering "as a couple" casts two votes, exactly as on the website. */
export const weightOf = (members: Member[], uid: string) =>
  members.find((m) => m.user_id === uid)?.meta?.answering_for === "couple" ? 2 : 1;

export const seatsOf = (m: Member) =>
  (m.meta?.answering_for === "couple" ? 2 : 1) + (m.meta?.kids ?? 0);

export const headcountOf = (members: Member[]) =>
  members.reduce((sum, m) => sum + seatsOf(m), 0);

const weighted = (members: Member[], rows: { user_id: string }[]) =>
  rows.reduce((sum, v) => sum + weightOf(members, v.user_id), 0);

/* ---------------- savings meter ---------------- */

export function savingsOf(completed: Set<number>, headcount: number): number {
  let s = 0;
  if (completed.has(4)) s += headcount * 40;
  if (completed.has(6)) s += Math.round(headcount * 600 * 0.12);
  if (completed.has(7)) s += headcount * 25;
  if (completed.has(8)) s += headcount * 30;
  return s;
}

/* ---------------- winners and ties ---------------- */

const isFlexible = (label: string) => label.toLowerCase().includes("flexible");

/** Polls on step `n` where the top two options are tied on a non-zero count. */
export function tiedPolls(polls: Poll[], members: Member[], group: Group, n: number): Poll[] {
  return polls.filter((p) => {
    if (p.step_n !== n || (p.kind !== "choice" && p.kind !== "budget")) return false;
    if (group.data?.decisions?.[p.id]) return false;
    const counts = p.options
      .filter((o) => !isFlexible(o.label))
      .map((o) => weighted(members, p.votes.filter((v) => v.option_id === o.id)))
      .sort((a, b) => b - a);
    return counts.length > 1 && counts[0] > 0 && counts[0] === counts[1];
  });
}

/** The winning label of one poll, honouring an organizer-recorded decision. */
export function winnerLabel(poll: Poll, members: Member[], group: Group): string | null {
  if (poll.kind === "dates" || poll.kind === "multi") {
    const dv = (poll.dvotes ?? []).filter((v) => (poll.kind === "multi" ? v.answer === "yes" : true));
    if (dv.length === 0) return null;
    const scored = poll.options.map((o) => ({
      o,
      yes: weighted(members, dv.filter((v) => v.option_id === o.id && v.answer === "yes")),
      maybe: weighted(members, dv.filter((v) => v.option_id === o.id && v.answer === "maybe")),
    }));
    const best = scored.sort((a, b) => b.yes - a.yes || b.maybe - a.maybe)[0];
    return best && best.yes + best.maybe > 0 ? best.o.label : null;
  }
  const override = group.data?.decisions?.[poll.id];
  if (override) return poll.options.find((o) => o.id === override)?.label ?? null;
  const counts = poll.options
    .filter((o) => !isFlexible(o.label))
    .map((o) => ({ o, c: weighted(members, poll.votes.filter((v) => v.option_id === o.id)) }));
  const win = counts.sort((a, b) => b.c - a.c)[0];
  return win && win.c > 0 ? win.o.label : null;
}

/** The winning labels of the Step 2 vision polls; feeds destination matching. */
export function visionLabels(polls: Poll[], members: Member[], group: Group): string[] {
  return polls
    .filter((p) => p.step_n === 2 && p.kind === "choice")
    .map((p) => winnerLabel(p, members, group))
    .filter((x): x is string => !!x);
}

/** Activities with at least one "yes", most popular first, emoji stripped. */
export function winningActivities(polls: Poll[], members: Member[]): string[] {
  const mp = polls.find((p) => p.step_n === 8 && p.kind === "multi");
  if (!mp) return [];
  const dv = (mp.dvotes ?? []).filter((v) => v.answer === "yes");
  return mp.options
    .map((o) => ({ o, c: weighted(members, dv.filter((v) => v.option_id === o.id)) }))
    .filter((r) => r.c > 0)
    .sort((a, b) => b.c - a.c)
    .map((r) => r.o.label.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim());
}

/* ---------------- budget ---------------- */

/** Reads a dollar target out of the winning option of the anonymous budget poll. */
export function votedBudgetTarget(polls: Poll[], members: Member[], group: Group): number | null {
  const bp = polls.find((p) => p.kind === "budget");
  if (!bp) return null;
  const override = group.data?.decisions?.[bp.id];
  let label: string | null = null;
  if (override) {
    label = bp.options.find((o) => o.id === override)?.label ?? null;
  } else if (bp.votes.length > 0) {
    const counts = bp.options.map((o) => ({
      o,
      c: weighted(members, bp.votes.filter((v) => v.option_id === o.id)),
    }));
    const win = counts.sort((a, b) => b.c - a.c)[0];
    label = win && win.c > 0 ? win.o.label : null;
  }
  if (!label) return null;
  const nums = (label.match(/\d[\d,]*/g) || []).map((x) => parseInt(x.replace(/,/g, ""), 10));
  if (!nums.length) return null;
  return nums.length >= 2 ? Math.round((nums[0] + nums[1]) / 2) : Math.round(nums[0] * 1.15);
}

export function defaultBudget(polls: Poll[], members: Member[], group: Group): Budget {
  const target = votedBudgetTarget(polls, members, group) ?? 1782;
  const base = target / 1.1;
  const r = (x: number) => Math.max(0, Math.round(x / 10) * 10);
  return {
    flights: r(base * 0.35),
    stay: r(base * 0.3),
    activities: r(base * 0.15),
    food: r(base * 0.2),
  };
}

/* ---------------- trip length and dates ---------------- */

const lengthPoll = (polls: Poll[]) =>
  polls.find(
    (p) => p.step_n === 3 && p.kind === "choice" && p.question.toLowerCase().includes("how long")
  );

export function decidedNightsUnresolved(polls: Poll[], tripLength: number | "vote" | null): boolean {
  if (typeof tripLength === "number") return false;
  const lp = lengthPoll(polls);
  return !lp || lp.votes.length === 0;
}

export function decidedNights(polls: Poll[], tripLength: number | "vote" | null): number {
  if (typeof tripLength === "number") return tripLength;
  const lp = lengthPoll(polls);
  if (lp && lp.votes.length > 0) {
    const counts = lp.options.map((o) => ({
      o,
      c: lp.votes.filter((v) => v.option_id === o.id).length,
    }));
    const win = counts.sort((a, b) => b.c - a.c)[0];
    const m = win && win.c > 0 ? win.o.label.match(/\d+/) : null;
    if (m) return parseInt(m[0], 10);
  }
  return 7;
}

export function fmtDateRange(iso: string, nights: number): string {
  const s = new Date(iso + "T12:00:00");
  const e = new Date(s);
  e.setDate(s.getDate() + nights);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return s.getFullYear() === e.getFullYear()
    ? `${f(s)} – ${f(e)}, ${e.getFullYear()} · ${nights} nights`
    : `${f(s)}, ${s.getFullYear()} – ${f(e)}, ${e.getFullYear()} · ${nights} nights`;
}

export function tripDates(
  group: Group,
  polls: Poll[],
  tripLength: number | "vote" | null
): { start: Date; nights: number } | null {
  const d = group.data?.dates;
  if (!d?.start) return null;
  return { start: new Date(d.start + "T12:00:00"), nights: d.nights || decidedNights(polls, tripLength) };
}

/** The winning start date of the Step 3 availability poll, as a raw ISO day. */
export function bestDateIso(polls: Poll[], members: Member[]): string | null {
  const dp = polls.find((p) => p.step_n === 3 && p.kind === "dates");
  if (!dp) return null;
  const dv: DateVote[] = dp.dvotes ?? [];
  const scored = dp.options.map((o) => ({
    o,
    yes: weighted(members, dv.filter((v) => v.option_id === o.id && v.answer === "yes")),
    maybe: weighted(members, dv.filter((v) => v.option_id === o.id && v.answer === "maybe")),
  }));
  const best = scored.sort((a, b) => b.yes - a.yes || b.maybe - a.maybe)[0];
  return best?.o.meta ?? null;
}

/* ---------------- itinerary ---------------- */

export function dayLabel(i: number, dates: { start: Date; nights: number } | null): string {
  if (!dates) return `Day ${i + 1}`;
  const dt = new Date(dates.start);
  dt.setDate(dt.getDate() + i);
  return `Day ${i + 1} · ${dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`;
}

export function buildItinerary(
  group: Group,
  polls: Poll[],
  members: Member[],
  tripLength: number | "vote" | null
): ItinDay[] {
  const td = tripDates(group, polls, tripLength);
  const nights = td?.nights ?? decidedNights(polls, tripLength);
  const dayCount = Math.max(2, Math.min(nights + 1, 22));
  const dest = group.data?.destination ?? "";
  const dinnerLink = `https://www.google.com/search?q=${encodeURIComponent(
    `best group dinner restaurants ${dest}`.trim()
  )}`;
  const acts = winningActivities(polls, members);
  let a = 0;
  const days: ItinDay[] = [];

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
      items.push(
        i % 2 === 1
          ? { id: id(1), t: "Afternoon: protected free time (the 60/40 rule)", k: "free" }
          : { id: id(2), t: "Afternoon: pool, naps, wandering", k: "free" }
      );
      items.push({ id: id(3), t: "Dinner: pick a spot", k: "meal", link: dinnerLink });
    }
    days.push({ items });
  }
  return days;
}

export function moveItem(
  days: ItinDay[],
  di: number,
  ii: number,
  dir: "up" | "down" | "prevDay" | "nextDay"
): ItinDay[] {
  const next = days.map((d) => ({ items: [...d.items] }));
  const [item] = next[di].items.splice(ii, 1);
  if (dir === "up") next[di].items.splice(Math.max(0, ii - 1), 0, item);
  else if (dir === "down") next[di].items.splice(Math.min(next[di].items.length, ii + 1), 0, item);
  else if (dir === "prevDay" && di > 0) next[di - 1].items.push(item);
  else if (dir === "nextDay" && di < next.length - 1) next[di + 1].items.unshift(item);
  else next[di].items.splice(ii, 0, item);
  return next;
}

/* ---------------- payments ---------------- */

export function paymentInstallments(
  dates: { start: Date; nights: number } | null,
  payplan: PayPlan
): { label: string; count: number } {
  if (!dates || payplan === "full") return { label: "one payment, due now", count: 1 };
  const days = Math.max(0, Math.round((dates.start.getTime() - Date.now()) / 86400000));
  const step = payplan === "monthly" ? 30 : 15;
  const count = Math.max(1, Math.min(Math.floor((days - 14) / step), payplan === "monthly" ? 18 : 36));
  return {
    label: payplan === "monthly" ? `${count} monthly payments` : `${count} payments, twice a month`,
    count,
  };
}

export function installmentDates(count: number, payplan: PayPlan): string[] {
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

/** "Julie & Sam (+2 kids)" with the seats each party occupies. */
export function partiesOf(members: Member[]): { who: string; seats: number }[] {
  return members.map((m) => {
    const seats = seatsOf(m);
    let who =
      m.meta?.answering_for === "couple" && m.meta?.partner_name
        ? `${m.name} & ${m.meta.partner_name}`
        : m.name;
    const kids = m.meta?.kids ?? 0;
    if (kids > 0) who += ` (+${kids} kid${kids > 1 ? "s" : ""})`;
    return { who, seats };
  });
}

/* ---------------- "the trip so far" rail ---------------- */

export function tripShape(
  polls: Poll[],
  members: Member[],
  group: Group,
  completed: Set<number>,
  tripLength: number | "vote" | null,
  budget: Budget | null
): { label: string; value: string; locked: boolean }[] {
  const items: { label: string; value: string; locked: boolean }[] = [];
  const push = (label: string, n: number) => {
    const value = polls
      .filter((p) => p.step_n === n)
      .map((p) => winnerLabel(p, members, group))
      .filter((x): x is string => !!x)
      .slice(0, 2)
      .join(" · ");
    if (value) items.push({ label, value, locked: completed.has(n) });
  };

  push("Vision", 2);
  if (tripLength) {
    items.push({
      label: "Length",
      value:
        typeof tripLength === "number"
          ? `${tripLength} nights`
          : `${decidedNights(polls, tripLength)} nights (group vote)`,
      locked: typeof tripLength === "number" || completed.has(3),
    });
  }
  push("Dates", 3);
  if (budget || completed.has(4)) {
    items.push({
      label: "Budget",
      value: `${fmt(budgetTotal(budget ?? defaultBudget(polls, members, group)))} per person`,
      locked: completed.has(4),
    });
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
