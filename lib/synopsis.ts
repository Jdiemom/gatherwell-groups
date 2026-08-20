/** Server-only: composes the Trip Vision synopsis from the group's actual Dream & Align votes. */

type VisionPoll = {
  question: string;
  options: { id: string; label: string }[];
  votes: { option_id: string }[];
};

export function tripVisionHtml(
  groupName: string,
  polls: VisionPoll[],
  travelers: number,
  people?: { name: string; picks: string[] }[]
): string {
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
  if (has("luxury", "splurge", "treat")) {
    character.push("the group is ready to do this one properly, and a trip like that deserves planning that matches");
  }
  if (has("budget", "savvy", "stretch", "affordable")) {
    character.push("every dollar is going toward more trip, not more waste, which is exactly what this method is built for");
  }
  if (has("hot", "sunny", "warm")) {
    character.push("sunshine is non-negotiable");
  }
  if (has("snow", "crisp", "cozy")) {
    character.push("this group wants a season, not just a place");
  }
  if (has("nightlife", "dinners out")) {
    character.push("the evenings are part of the itinerary, not an afterthought");
  }
  if (has("drive", "short flight")) {
    character.push("keeping the travel day short means the trip starts sooner");
  }
  if (has("long haul", "anywhere")) {
    character.push("the group is willing to go far for the right place, which opens the whole map");
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

  // Named section + clusters: who's the engine room, who's the anchor
  let peopleHtml = "";
  if (people && people.length > 1) {
    const activeWords = ["adventure", "full days", "nightlife", "dinners out", "active", "hike", "excursion"];
    const calmWords = ["relax", "slow", "early nights", "rest", "reconnect", "cozy"];
    const scoreOf = (picks: string[]) => {
      const t = picks.join(" ").toLowerCase();
      let s = 0;
      for (const w2 of activeWords) if (t.includes(w2)) s++;
      for (const w2 of calmWords) if (t.includes(w2)) s--;
      return s;
    };
    const engine = people.filter((p) => scoreOf(p.picks) > 0).map((p) => p.name);
    const anchors = people.filter((p) => scoreOf(p.picks) < 0).map((p) => p.name);
    const whoRows = people
      .map(
        (p) =>
          `<tr>
            <td style="padding:7px 0;border-bottom:1px solid #F1EADC;font-size:14px;color:#332E29;white-space:nowrap;vertical-align:top;"><b>${p.name}</b></td>
            <td style="padding:7px 0 7px 14px;border-bottom:1px solid #F1EADC;font-size:13px;color:#6B6259;">${p.picks.map(clean).join(" · ") || "no votes yet"}</td>
          </tr>`
      )
      .join("");
    const clusterLine =
      engine.length > 0 && anchors.length > 0
        ? `<p style="margin:14px 0 0;">Your engine room: <b>${engine.join(", ")}</b>. Your anchors: <b>${anchors.join(", ")}</b>. That's not a conflict, it's a shift schedule: mornings belong to the engine room, afternoons converge, and evenings alternate. Build the days that way and everyone gets their trip.</p>`
        : engine.length > 0
        ? `<p style="margin:14px 0 0;">This whole crew leans energetic. Book the big days early; the rest sorts itself.</p>`
        : anchors.length > 0
        ? `<p style="margin:14px 0 0;">This crew came to exhale. Protect the empty hours; they're the itinerary.</p>`
        : "";
    peopleHtml = `<div style="font-family:Georgia,serif;font-size:16px;color:#332E29;margin:22px 0 10px;">Who said what</div>
      <table cellpadding="0" cellspacing="0" width="100%">${whoRows}</table>${clusterLine}`;
  }

  return `
    <div style="border-left:3px solid #B08A3E;background:#FCF7EA;padding:20px 22px;margin:0 0 24px;">
      <div style="font-family:Georgia,serif;font-size:18px;color:#332E29;margin-bottom:6px;">Your Trip Vision</div>
      <div style="font-size:13px;color:#6B6259;">Composed from ${travelers} travelers' votes in ${groupName}</div>
    </div>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:22px;">${rows}</table>
    <p style="margin:0 0 14px;">${characterLine}</p>
    ${tensionHtml}
    <p style="margin:0 0 14px;">Every group trip has the same real enemy, and it is not disagreement, it is drift: the plan that stalls in the chat until the good dates are gone and the good houses are booked. Your group has already beaten the first stage of it just by voting.</p>
    ${peopleHtml}
    <p style="margin:14px 0 0;">The dream is on the record now. Next comes the part most groups never reach: putting dates on it. The next step is open, and this trip is worth taking.</p>`;
}
