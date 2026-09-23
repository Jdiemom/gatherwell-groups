import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";
import type { GroupBundle, Group, Member, Poll } from "./types";

/**
 * The same four queries the website's group page runs, plus the plan lookup.
 * Row level security does the access control: if the signed-in user is not a
 * member, `groups` comes back empty and we report it the same way the site does.
 */
export async function loadGroup(groupId: string): Promise<GroupBundle | null> {
  const [{ data: group }, { data: members }, { data: progress }, { data: polls }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, role, meta, profiles:user_id(name, email)")
      .eq("group_id", groupId),
    supabase.from("step_progress").select("step_n, data").eq("group_id", groupId),
    supabase
      .from("polls")
      .select(
        "id, step_n, kind, question, poll_options(id, label, meta, sort), votes(option_id, user_id), date_votes(option_id, user_id, answer)"
      )
      .eq("group_id", groupId),
  ]);

  if (!group) return null;

  // The organizer's plan tier; only the server can read someone else's subscription.
  let plan = "group";
  const planRes = await apiPost<{ plan?: string }>("/api/groups/plan", { groupId });
  if (planRes.ok && planRes.data?.plan) plan = planRes.data.plan;

  return {
    group: group as Group,
    plan,
    members: (members ?? []).map((m): Member => {
      const p = m.profiles as unknown as { name: string | null; email: string | null } | null;
      const meta = (m as unknown as { meta?: Record<string, never> }).meta ?? {};
      return {
        user_id: m.user_id,
        role: m.role,
        name: p?.name || p?.email?.split("@")[0] || "Traveler",
        rawName: p?.name ?? null,
        meta,
      };
    }),
    completed: (progress ?? []).map((p) => p.step_n),
    polls: (polls ?? []).map(
      (p): Poll => ({
        id: p.id,
        step_n: p.step_n,
        kind: p.kind,
        question: p.question,
        options: [...(p.poll_options ?? [])].sort((a, b) => a.sort - b.sort),
        votes: p.votes ?? [],
        dvotes:
          (p as unknown as { date_votes?: { option_id: string; user_id: string; answer: string }[] })
            .date_votes ?? [],
      })
    ),
  };
}

export type DashboardGroup = {
  id: string;
  name: string;
  trip_type: string | null;
  join_code: string;
  owner_id: string;
  role: string;
};

/** The dashboard query from app/app/page.tsx. */
export async function loadDashboard(userId: string): Promise<{
  groups: DashboardGroup[];
  hasActiveSub: boolean;
  plan: string | null;
}> {
  const [{ data: memberships }, { data: sub }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id, role, groups(id, name, trip_type, join_code, owner_id)")
      .eq("user_id", userId),
    supabase.from("subscriptions").select("plan,status").eq("user_id", userId).maybeSingle(),
  ]);

  const groups = (memberships ?? [])
    .map((m) => {
      const g = m.groups as unknown as Omit<DashboardGroup, "role"> | null;
      return g ? { ...g, role: m.role } : null;
    })
    .filter((g): g is DashboardGroup => !!g);

  return {
    groups,
    hasActiveSub: !!sub && ["active", "trialing"].includes(sub.status ?? ""),
    plan: sub?.plan ?? null,
  };
}
