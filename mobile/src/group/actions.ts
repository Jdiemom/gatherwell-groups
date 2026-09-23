/**
 * Every write the group screen makes. These go straight to Supabase under row
 * level security, exactly as the website's client component does; only the few
 * that need the service role (creating a group, joining, emails, leads) go
 * through the website's API routes.
 *
 * Each returns a plain error string, or null on success, so screens can surface
 * the same wording the website uses.
 */
import { supabase } from "@/lib/supabase";
import { apiPost, apiPostQuietly } from "@/lib/api";
import type { Budget, Group, GroupData, ItinDay, MemberMeta, PayPlan, Poll } from "./types";

const err = (message: string) => message;

export async function castVote(pollId: string, optionId: string, userId: string) {
  const { error } = await supabase
    .from("votes")
    .upsert({ poll_id: pollId, option_id: optionId, user_id: userId });
  return error ? err("Vote didn't save. Try again.") : null;
}

export async function castDateVote(
  pollId: string,
  optionId: string,
  userId: string,
  answer: "yes" | "no" | "maybe"
) {
  const { error } = await supabase
    .from("date_votes")
    .upsert({ poll_id: pollId, option_id: optionId, user_id: userId, answer });
  return error ? err("Answer didn't save. Try again.") : null;
}

export async function addActivityVote(pollId: string, optionId: string, userId: string) {
  const { error } = await supabase
    .from("date_votes")
    .upsert({ poll_id: pollId, option_id: optionId, user_id: userId, answer: "yes" });
  return error ? err("Couldn't save. Try again.") : null;
}

export async function removeActivityVote(optionId: string, userId: string) {
  const { error } = await supabase
    .from("date_votes")
    .delete()
    .eq("option_id", optionId)
    .eq("user_id", userId);
  return error ? err("Couldn't update. Try again.") : null;
}

export async function suggestOption(poll: Poll, label: string, byName: string) {
  const { data, error } = await supabase
    .from("poll_options")
    .insert({ poll_id: poll.id, label, meta: `Suggested by ${byName}`, sort: poll.options.length })
    .select("id, label, meta, sort")
    .single();
  if (error || !data) return { error: err("Couldn't add it. Try again."), option: null };
  return { error: null, option: data };
}

export async function addDestinationOption(
  poll: Poll,
  label: string,
  blurb: string
) {
  const { data, error } = await supabase
    .from("poll_options")
    .insert({ poll_id: poll.id, label, meta: blurb, sort: poll.options.length })
    .select("id, label, meta, sort")
    .single();
  if (error || !data) return { error: err("Couldn't add it. Try again."), option: null };
  return { error: null, option: data };
}

/** Patches the group's jsonb `data` column without dropping keys written elsewhere. */
export async function patchGroupData(group: Group, patch: Partial<GroupData>) {
  const next = { ...(group.data ?? {}), ...patch };
  const { error } = await supabase.from("groups").update({ data: next }).eq("id", group.id);
  if (error) return { error: err("Couldn't save. Try again."), data: null };
  return { error: null, data: next as GroupData };
}

export async function saveTravelerProfile(
  groupId: string,
  userId: string,
  name: string,
  meta: MemberMeta
) {
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("profiles").update({ name }).eq("id", userId),
    supabase.from("group_members").update({ meta }).eq("group_id", groupId).eq("user_id", userId),
  ]);
  return e1 || e2 ? err("Couldn't save. Try again.") : null;
}

export async function completeStep(groupId: string, stepN: number, userId: string) {
  const { error } = await supabase
    .from("step_progress")
    .upsert({ group_id: groupId, step_n: stepN, completed_by: userId });
  return error ? err("Couldn't save progress. Try again.") : null;
}

export async function reopenStep(groupId: string, stepN: number) {
  const { error } = await supabase
    .from("step_progress")
    .delete()
    .eq("group_id", groupId)
    .eq("step_n", stepN);
  return error ? err("Couldn't reopen the step. Try again.") : null;
}

export async function createPoll(
  groupId: string,
  stepN: number,
  kind: string,
  question: string,
  options: { label: string; meta: string | null }[]
) {
  const { data: poll, error } = await supabase
    .from("polls")
    .insert({ group_id: groupId, step_n: stepN, kind, question })
    .select("id")
    .single();
  if (error || !poll) return { error: err("Couldn't create the poll. Try again."), poll: null };

  const { data: created, error: e2 } = await supabase
    .from("poll_options")
    .insert(options.map((o, i) => ({ poll_id: poll.id, label: o.label, meta: o.meta, sort: i })))
    .select("id, label, meta, sort");
  if (e2 || !created) {
    return { error: err("Poll saved but its options failed. Remove it and try again."), poll: null };
  }

  return {
    error: null,
    poll: {
      id: poll.id,
      step_n: stepN,
      kind,
      question,
      options: [...created].sort((a, b) => a.sort - b.sort),
      votes: [],
      dvotes: [],
    } as Poll,
  };
}

export async function deletePoll(pollId: string) {
  const { error } = await supabase.from("polls").delete().eq("id", pollId);
  return error ? err("Couldn't remove the poll.") : null;
}

export async function saveBudget(group: Group, budget: Budget) {
  return patchGroupData(group, { budget });
}

export async function saveItinerary(group: Group, itinerary: ItinDay[], payplan: PayPlan) {
  return patchGroupData(group, { itinerary, payplan });
}

/* ---------------- server-side actions ---------------- */

export function notifyStep(groupId: string, stepN: number, kind: "opened" | "reopened") {
  apiPostQuietly("/api/steps/notify", { groupId, stepN, kind });
}

export function requestFlightQuotes(groupId: string) {
  apiPostQuietly("/api/leads/flight-quote", { groupId });
}

export async function requestStayOptions(groupId: string, preferences: string) {
  const res = await apiPost("/api/leads/stay-quote", { groupId, preferences });
  return res.ok ? null : err("Couldn't send. Try again.");
}

export async function askConcierge(groupId: string, stepN: number, message: string) {
  const res = await apiPost("/api/concierge", { groupId, stepN, message });
  return res.ok ? null : err("Couldn't send. Try again, or call us.");
}

export async function submitBoost(
  groupId: string,
  mode: "lump" | "perPerson" | "cover",
  amount: number,
  anonymous: boolean
) {
  const res = await apiPost("/api/budget/boost", { groupId, mode, amount, anonymous });
  return res.ok ? null : err("Couldn't send the boost. Try again.");
}

export type AutoAdvance = {
  advanced?: boolean;
  nextStep?: number;
  tie?: boolean;
  datesReady?: boolean;
};

/** Asks the server whether everyone has now voted; mirrors the web behaviour. */
export async function autoAdvance(groupId: string, stepN: number): Promise<AutoAdvance | null> {
  const res = await apiPost<AutoAdvance>("/api/steps/auto-advance", { groupId, stepN });
  return res.ok ? res.data : null;
}

export async function createGroup(name: string, tripType: string) {
  const res = await apiPost<{ id: string }>("/api/groups", { name, trip_type: tripType });
  if (!res.ok) return { error: res.error, id: null };
  return { error: null, id: res.data.id };
}

export async function joinGroup(code: string) {
  const res = await apiPost<{ id: string; name: string }>("/api/groups/join", { code });
  if (!res.ok) return { error: res.error, group: null };
  return { error: null, group: res.data };
}
