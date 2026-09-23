/**
 * The documents a group takes away: the budget sheet, the flight plan, the master
 * itinerary, the payment schedule and the printable keepsake. Text is reproduced
 * from the website so a file shared from a phone is the same file as from a
 * browser.
 */
import { SITE_URL } from "@/shared";
import {
  BUDGET_ROWS,
  budgetBuffer,
  budgetTotal,
  dayLabel,
  fmt,
  installmentDates,
  partiesOf,
  paymentInstallments,
} from "./derive";
import type { Budget, Group, ItinDay, Member, PayPlan, Poll } from "./types";

export type Doc = { title: string; body: string; filename: string; data?: string };

export function budgetDoc(group: Group, budget: Budget, headcount: number): Doc {
  const rows: [string, number][] = [
    ...BUDGET_ROWS.map(([k, label]) => [label, budget[k]] as [string, number]),
    ["Buffer (10%)", budgetBuffer(budget)],
    ["TOTAL", budgetTotal(budget)],
  ];
  return {
    title: "Group Budget",
    filename: "Group-Budget.csv",
    body: `GROUP BUDGET · ${group.name}
Travelers: ${headcount}

${"Category".padEnd(16)}${"Per Person".padEnd(13)}Group Total
${rows.map(([c, v]) => c.padEnd(16) + fmt(v).padEnd(13) + fmt(v * headcount)).join("\n")}`,
    data:
      `Category,Per Person,Group Total\n` +
      rows.map(([c, v]) => `"${c}","${fmt(v)}","${fmt(v * headcount)}"`).join("\n"),
  };
}

export function flightPlanDoc(group: Group): Doc {
  return {
    title: "Flight Plan",
    filename: "Flight-Plan.txt",
    body: `FLIGHT PLAN · ${group.name}

BUYING WINDOW
  Intl: ~2-6 months before departure (sweet spot ~129 days)
  Domestic: 1-3 months out, ~25% below peak on average
  Caveat: dynamic pricing. Windows improve odds, never guarantee.

BOOKING PATH
  1) Expedia partner link (group books individually)
  2) Or: Gatherwell advisors ticket the group together`,
  };
}

export function masterItineraryDoc(
  group: Group,
  polls: Poll[],
  budget: Budget,
  headcount: number
): Doc {
  return {
    title: "Master Itinerary",
    filename: "Master-Itinerary.txt",
    body: `${group.name.toUpperCase()} · MASTER ITINERARY
Travelers: ${headcount}
Budget: ${fmt(budgetTotal(budget))} per person · ${fmt(budgetTotal(budget) * headcount)} group total

Assembled from your group's winning votes:
${polls
  .map((p) => {
    const counts = p.options.map((o) => ({
      o,
      c: p.votes.filter((v) => v.option_id === o.id).length,
    }));
    const win = counts.sort((a, b) => b.c - a.c)[0];
    return `  Step ${p.step_n}: ${p.question}\n    → ${win && win.c > 0 ? win.o.label : "(no votes yet)"}`;
  })
  .join("\n")}

Booked through: Gatherwell partners · GetYourGuide · Rental Escapes · Luxury Rentals
Need a human? gatherwelltravel.com`,
  };
}

export function paymentScheduleDoc(
  group: Group,
  members: Member[],
  budget: Budget,
  headcount: number,
  dates: { start: Date; nights: number } | null,
  payplan: PayPlan
): Doc {
  const total = budgetTotal(budget);
  const parties = partiesOf(members);
  const { count } = paymentInstallments(dates, payplan);

  if (count > 1) {
    const days = installmentDates(count, payplan);
    const per = Math.ceil(total / count);
    return {
      title: "Payment Schedule",
      filename: "Payment-Schedule.csv",
      body: `PAYMENT SCHEDULE · ${group.name}
Per person: ${fmt(total)} · Group total: ${fmt(total * headcount)}
Plan: ${count} payments of ${fmt(per)} per person, first due ${days[0]}

${parties.map((p) => `${p.who} · ${fmt(per * p.seats)} × ${count} payments`).join("\n")}

The downloaded file lists every payment date for every traveler.`,
      data:
        `Traveler,Payment,Due date,Amount\n` +
        parties
          .flatMap((p) =>
            days.map((dt, i) => `"${p.who}","Payment ${i + 1} of ${count}","${dt}","${fmt(per * p.seats)}"`)
          )
          .join("\n"),
    };
  }

  const dep = Math.round(total * 0.25);
  const bal = total - dep;
  return {
    title: "Payment Schedule",
    filename: "Payment-Schedule.csv",
    body: `PAYMENT SCHEDULE · ${group.name}
Per person: ${fmt(total)} · Group total: ${fmt(total * headcount)}

${"Traveler".padEnd(24)}${"Deposit (25%)".padEnd(16)}${"Balance".padEnd(11)}Balance Due
${parties
  .map(
    (p) =>
      p.who.padEnd(24) +
      fmt(dep * p.seats).padEnd(16) +
      fmt(bal * p.seats).padEnd(11) +
      "60 days before departure"
  )
  .join("\n")}`,
    data:
      `Traveler,Deposit (25%),Balance,Balance Due\n` +
      parties
        .map((p) => `"${p.who}","${fmt(dep * p.seats)}","${fmt(bal * p.seats)}","60 days before departure"`)
        .join("\n"),
  };
}

/* ---------------- the printed keepsake ---------------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The website hides a `.print-doc` block on screen and lets the browser print it.
 * expo-print takes HTML, so the same document is rebuilt here with the same
 * typography and the same footer.
 */
export function itineraryPrintHtml(
  group: Group,
  itinerary: ItinDay[],
  dates: { start: Date; nights: number } | null,
  headcount: number,
  perPerson: number
): string {
  const meta = [
    group.data?.destination ?? "",
    dates
      ? `${dates.start.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })} · ${dates.nights} nights`
      : "",
    `${headcount} travelers`,
    `${fmt(perPerson)} per person`,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  @page { margin: 42px; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #332E29; }
  .brand { font-size: 12px; letter-spacing: .28em; text-transform: uppercase; color: #B08A3E; font-family: Helvetica, Arial, sans-serif; }
  h1 { font-size: 34px; margin: 10px 0 6px; font-weight: 600; letter-spacing: -0.4px; }
  .meta { font-family: Helvetica, Arial, sans-serif; font-size: 12.5px; color: #5D554B; margin-bottom: 26px; }
  .day { margin-bottom: 20px; page-break-inside: avoid; }
  .day-head { font-family: Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #B08A3E; border-bottom: 1px solid #E3DACA; padding-bottom: 5px; margin-bottom: 9px; }
  .item { font-size: 14.5px; line-height: 1.75; padding-left: 12px; }
  .foot { margin-top: 34px; border-top: 1px solid #E3DACA; padding-top: 12px; font-family: Helvetica, Arial, sans-serif; font-size: 10.5px; line-height: 1.7; color: #5D554B; }
</style></head><body>
  <div class="brand">Groups by Gatherwell</div>
  <h1>${esc(group.name)}</h1>
  <div class="meta">${esc(meta)}</div>
  ${itinerary
    .map(
      (day, i) => `<div class="day">
      <div class="day-head">${esc(dayLabel(i, dates))}</div>
      ${day.items.map((it) => `<div class="item">${esc(it.t)}</div>`).join("")}
    </div>`
    )
    .join("")}
  <div class="foot">
    Planned together on Groups by Gatherwell · A Gatherwell Travel Company<br />
    hello@gatherwelltravel.com · (888) 664-3090 · ${SITE_URL.replace(/^https?:\/\//, "")}
  </div>
</body></html>`;
}

/* ---------------- invites ---------------- */

export function inviteLink(joinCode: string): string {
  return `${SITE_URL}/join/${joinCode}`;
}

export const INVITE_TEMPLATES: {
  key: string;
  label: string;
  text: (groupName: string, link: string) => string;
}[] = [
  {
    key: "family",
    label: "Family",
    text: (groupName, link) =>
      `Hi family! I'm organizing our ${groupName} trip on Groups by Gatherwell. It walks us through the planning one decision at a time: dates, budget, where we stay, all of it. Everyone gets a vote, and nothing is booked until we've all weighed in.

I've covered the membership for the whole group, so it costs you nothing. Just tap the link, sign in with your email, and vote when a poll comes up. Two minutes, no app to download.

${link}`,
  },
  {
    key: "friends",
    label: "Friends",
    text: (_groupName, link) =>
      `The trip is happening. I set us up on Groups by Gatherwell so the planning doesn't die in the group chat. It runs us through every decision in order and we all vote.

Membership's on me. Your only job: click the link, sign in with your email, and vote when a poll drops. Two minutes, tops. First poll is already live.

${link}`,
  },
  {
    key: "facts",
    label: "Just the facts",
    text: (groupName, link) =>
      `Hi everyone. I've set up our ${groupName} trip on Groups by Gatherwell. It guides the group through nine steps: dates, budget, destination, flights, stay, and activities. We vote on each decision, it locks in, and we move to the next one.

I've taken care of the membership cost for the group. Please click the link below, sign in with your email, and cast your first votes this week so we can keep things moving.

${link}`,
  },
];

/** The message the group sees when a traveller boosts the budget. */
export function boostPreview(
  mode: "lump" | "perPerson" | "cover",
  amount: number,
  anonymous: boolean,
  myName: string,
  headcount: number
): string {
  const donor = anonymous ? "A generous member of your group" : myName;
  if (mode === "cover") {
    return `${donor} is covering the entire cost of this trip. Everything the group has planned is now fully funded. Say thank you, and start packing.`;
  }
  if (mode === "perPerson") {
    return `${donor} just added ${fmt(amount)} per traveler to the trip budget. That's ${fmt(
      amount * headcount
    )} across your group of ${headcount}.`;
  }
  return `${donor} just added ${fmt(amount)} to the trip fund. Spread across ${headcount} travelers, that's about ${fmt(
    amount / Math.max(headcount, 1)
  )} more per person to play with.`;
}
