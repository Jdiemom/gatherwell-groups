import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import GroupFlow from "./GroupFlow";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="waitlist" style={{ minHeight: "70vh" }}>
        <div className="wrap center">
          <h2 className="sec-title">Please sign in</h2>
          <p style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/app/group/${groupId}`)}`}>Sign in</Link>
          </p>
        </div>
      </section>
    );
  }

  const [{ data: group }, { data: members }, { data: progress }, { data: polls }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase.from("group_members").select("user_id, role, profiles:user_id(name, email)").eq("group_id", groupId),
    supabase.from("step_progress").select("step_n, data").eq("group_id", groupId),
    supabase.from("polls").select("id, step_n, kind, question, poll_options(id, label, meta, sort), votes(option_id, user_id)").eq("group_id", groupId),
  ]);

  if (!group) {
    return (
      <section className="waitlist" style={{ minHeight: "70vh" }}>
        <div className="wrap center">
          <h2 className="sec-title">Group not found</h2>
          <p className="sec-sub">You may not be a member of this group yet. Ask the organizer for the invite link.</p>
          <p style={{ marginTop: 20 }}><Link className="btn btn-outline" href="/app">Back to your trips</Link></p>
        </div>
      </section>
    );
  }

  return (
    <GroupFlow
      userId={user.id}
      group={group}
      members={(members ?? []).map((m) => {
        const p = m.profiles as unknown as { name: string | null; email: string | null } | null;
        return { user_id: m.user_id, role: m.role, name: p?.name || p?.email?.split("@")[0] || "Traveler" };
      })}
      completed={(progress ?? []).map((p) => p.step_n)}
      polls={(polls ?? []).map((p) => ({
        id: p.id, step_n: p.step_n, kind: p.kind, question: p.question,
        options: [...(p.poll_options ?? [])].sort((a, b) => a.sort - b.sort),
        votes: p.votes ?? [],
      }))}
    />
  );
}
