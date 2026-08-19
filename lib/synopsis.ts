/** Server-only: composes the Trip Vision synopsis from the group's actual Dream & Align votes. */

type VisionPoll = {
  question: string;
  options: { id: string; label: string }[];
  votes: { option_id: string }[];
};

export function tripVisionHtml(groupName: string, polls: VisionPoll[], travelers: number): string {
  const results = polls
    .map((p) => {
      const counts = p.options
        .map((o) => ({ label: o.label, c: p.votes.filter((v) => v.option_id === o.id).length }))
        .sort((a, b) => b.c - a.c);
      return {
        question: p.question,
        top: counts[0],
        second: counts[1],
        split: !!(counts[1] && counts[1].c > 0 && counts[0].c - counts[1].c <= 1),
      };
    })
    .filter((r) => r.top && r.top.c > 0);

  if (results.length === 0) return "";

  const clean = (s: string) => s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  const all = results.map((r) => clean(r.top.label).toLowerCase()).join(" · ");
  const has = (...words: string[]) => words.some((w) => all.includes(w));

  // Character sketch from the winning answers
  const character: string[] = [];
  if (has("rest", "relax", "slow", "beach", "reconnect")) {
    character.push("this group is craving exhale, not itinerary. Salt air, long dinners, and mornings with nowhere to be");
  }
  if (has("adventure", "active", "hike", "excursion")) {
    character.push("there's real appetite for adventure here, the kind of days you talk about for years");
  }
  if (has("culture", "food", "city", "museum", "restaurant")) {
    character.push("this crew wants to taste and see things: real food, real places, stories to bring home");
  }
  if (has("celebration", "milestone", "birthday", "reunion")) {
    character.push("this trip is a celebration, which means the memories matter more than the mileage");
  }
  if (has("under one roof", "one big house", "villa")) {
    character.push("being together is the point: one big table, one kitchen, everyone under one roof");
  }
  if (has("kid", "grandparent", "multigenerational", "family")) {
    character.push("it needs to work for every generation, from the earliest riser to the latest sleeper");
  }
  const characterLine = character.length
    ? `Reading between the votes: ${character.slice(0, 3).join(". And ")}.`
    : `The picture is getting clearer with every vote.`;

  // Tensions become planning instructions
  const tensions = results
    .filter((r) => r.split && r.second)
    .slice(0, 2)
    .map(
      (r) =>
        `On &ldquo;${r.question}&rdquo; the group nearly split between <b>${clean(r.top.label)}</b> and <b>${clean(
          r.second!.label
        )}</b>. That is not a problem, it is a planning instruction: make ${clean(
          r.top.label
        ).toLowerCase()} the anchor and protect real space for ${clean(r.second!.label).toLowerCase()}. The best group trips blend, they don't pick.`
    );
  const tensionHtml = tensions.length
    ? tensions.map((t) => `<p style="margin:0 0 14px;">${t}</p>`).join("")
    : `<p style="margin:0 0 14px;">The group is remarkably aligned. That is rare, and it makes everything from here easier.</p>`;

  const rows = results
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;">${r.question}</td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;font-weight:bold;white-space:nowrap;">${clean(r.top.label)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="border-left:3px solid #B08A3E;background:#FCF7EA;padding:20px 22px;margin:0 0 24px;">
      <div style="font-family:Georgia,serif;font-size:18px;color:#332E29;margin-bottom:6px;">Your Trip Vision</div>
      <div style="font-size:13px;color:#6B6259;">Composed from ${travelers} travelers' votes in ${groupName}</div>
    </div>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:22px;">${rows}</table>
    <p style="margin:0 0 14px;">${characterLine}</p>
    ${tensionHtml}
    <p style="margin:0 0 14px;">Every group trip has the same real enemy, and it is not disagreement, it is drift: the plan that stalls in the chat until the good dates are gone and the good houses are booked. Your group has already beaten the first stage of it just by voting.</p>
    <p style="margin:0;">The dream is on the record now. Next comes the part most groups never reach: putting dates on it. The next step is open, and this trip is worth taking.</p>`;
}
