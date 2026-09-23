/** Mirrors the shapes app/app/group/[groupId]/page.tsx hands to GroupFlow. */

export type MemberMeta = {
  answering_for?: "solo" | "couple" | "partner_separate";
  partner_name?: string;
  home_airport?: string;
  bags?: string;
  cabin?: string;
  kids?: number;
  kid_ages?: string;
};

export type Member = {
  user_id: string;
  role: string;
  name: string;
  rawName?: string | null;
  meta: MemberMeta;
};

export type PollOption = { id: string; label: string; meta: string | null; sort: number };
export type Vote = { option_id: string; user_id: string };
export type DateVote = { option_id: string; user_id: string; answer: string };

export type Poll = {
  id: string;
  step_n: number;
  kind: string;
  question: string;
  options: PollOption[];
  votes: Vote[];
  dvotes?: DateVote[];
};

export type Budget = { flights: number; stay: number; activities: number; food: number };
export type ItinItem = { id: string; t: string; k: string; link?: string };
export type ItinDay = { items: ItinItem[] };

export type GroupData = {
  budget?: Budget;
  tripLength?: number | "vote";
  discuss?: { whatsapp?: string; video?: string };
  decisions?: Record<string, string>;
  destination?: string;
  dates?: { start: string; nights: number };
  itinerary?: ItinDay[];
  payplan?: PayPlan;
  [k: string]: unknown;
};

export type PayPlan = "full" | "monthly" | "biweekly";

export type Group = {
  id: string;
  name: string;
  trip_type: string | null;
  owner_id: string;
  join_code: string;
  data?: GroupData | null;
};

/** Everything one group screen needs, fetched in a single round trip. */
export type GroupBundle = {
  group: Group;
  members: Member[];
  completed: number[];
  polls: Poll[];
  plan: string;
};
