import { DESTINATIONS, type Destination } from "./destinations";

/** Scores the Gatherwell Destination Library against a group's actual votes. */

export type VisionInput = {
  labels: string[];          // winning labels from Dream & Align (lowercased ok)
  budgetPerPerson: number | null;
  kidsPresent: boolean;
  nightsKnown: number | null;
};

export type Match = { d: Destination; score: number; why: string[] };

const has = (labels: string[], ...words: string[]) =>
  words.some((w) => labels.some((l) => l.includes(w)));

export function matchDestinations(input: VisionInput, top = 3): Match[] {
  const L = input.labels.map((l) => l.toLowerCase());
  const tier = input.budgetPerPerson == null ? null
    : input.budgetPerPerson < 1200 ? 1
    : input.budgetPerPerson < 2500 ? 2
    : input.budgetPerPerson < 4000 ? 3 : 4;

  const scored: Match[] = DESTINATIONS.map((d) => {
    let s = 0;
    const why: string[] = [];

    // Setting
    if (has(L, "ocean", "beach") && d.setting.includes("ocean")) { s += 3; why.push("the ocean your group voted for"); }
    if (has(L, "mountain", "nature") && d.setting.includes("mountain")) { s += 3; why.push("mountains and nature, as voted"); }
    if (has(L, "city", "culture", "food") && d.setting.includes("city")) { s += 3; why.push("the city-and-culture vote"); }
    if (has(L, "countryside", "quiet", "vineyard") && d.setting.includes("country")) { s += 3; why.push("countryside quiet, as voted"); }

    // Weather
    if (has(L, "hot & sunny", "hot and sunny") && d.climate.includes("hot")) { s += 2; why.push("hot and sunny weather"); }
    if (has(L, "warm days") && d.climate.includes("warm")) { s += 2; why.push("warm days, cool nights"); }
    if (has(L, "crisp") && d.climate.includes("crisp")) { s += 2; why.push("crisp-season weather"); }
    if (has(L, "snow") && d.climate.includes("snow")) { s += 3; why.push("real snow"); }

    // Distance tolerance
    if (has(L, "drive or short")) { s += d.haul === 1 ? 3 : d.haul === 2 ? 0 : -4; if (d.haul === 1) why.push("an easy travel day"); }
    else if (has(L, "medium haul")) { s += d.haul === 2 ? 2 : d.haul === 1 ? 1 : -1; }
    else if (has(L, "long haul")) { s += d.haul === 3 ? 2 : 0; if (d.haul === 3) why.push("worth the long flight, like you said"); }

    // Comfort level vs destination tier
    if (has(L, "luxury", "splurge", "treat")) { s += d.budget >= 3 ? 2 : -1; }
    if (has(L, "budget-savvy", "budget savvy", "stretch")) { s += d.budget <= 2 ? 2 : d.budget === 4 ? -3 : 0; }

    // Real budget number beats vibes
    if (tier != null) {
      const gap = Math.abs(tier - d.budget);
      s += gap === 0 ? 2 : gap === 1 ? 0 : -3;
      if (gap === 0) why.push("fits the budget your group adopted");
    }

    // Family shape
    if (input.kidsPresent) { s += d.kids === 2 ? 2 : d.kids === 0 ? -3 : 0; if (d.kids === 2) why.push("great with kids"); }

    // Evenings
    if (has(L, "nightlife", "dinners out")) { s += d.nightlife === 2 ? 2 : d.nightlife === 0 ? -1 : 0; }
    if (has(L, "early nights")) { s += d.nightlife === 0 ? 1 : 0; }

    // Non-negotiables
    if (has(L, "under one roof", "one big house")) { s += d.villa === 2 ? 3 : d.villa === 0 ? -3 : 0; if (d.villa === 2) why.push("everyone under one roof"); }
    if (has(L, "direct flights")) { s += d.haul === 1 ? 2 : d.haul === 3 ? -2 : 0; }
    if (has(L, "affordable")) { s += d.budget <= 2 ? 2 : -1; }
    if (has(L, "kid & grandparent", "multigenerational")) { s += d.kids === 2 ? 2 : d.kids === 0 ? -2 : 0; }

    // Trip type flavor
    if (has(L, "celebration", "milestone")) { s += d.budget >= 3 ? 1 : 0; }
    if (has(L, "adventure")) { s += d.setting.includes("mountain") || d.sig.some((x) => /hike|zip|surf|snorkel|4x4|thrill/i.test(x)) ? 1 : 0; }
    if (has(L, "rest & reconnect", "rest and reconnect")) { s += d.setting.includes("ocean") || d.setting.includes("country") ? 1 : 0; }

    // Short trips punish long hauls even if the group said "anywhere"
    if (input.nightsKnown != null && input.nightsKnown <= 5 && d.haul === 3) s -= 3;

    // Gatherwell insider strength
    if (d.picks && d.picks.length > 0) { s += 1.5; why.push("Gatherwell insider access"); }

    return { d, score: s, why: why.slice(0, 3) };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, top);
}
