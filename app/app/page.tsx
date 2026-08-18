import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <nav className="nav">
          <div className="nav-inner">
            <Link className="logo" href="/">Groups <b>by Gatherwell</b><small>Group Travel, Solved</small></Link>
          </div>
        </nav>
        <section className="waitlist" style={{ minHeight: "70vh" }}>
          <div className="wrap center">
            <h2 className="sec-title">Your trips live here</h2>
            <p className="sec-sub">Sign in to see your groups or start a new trip.</p>
            <p style={{ marginTop: 24 }}>
              <Link className="btn btn-primary" href="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </>
    );
  }

  const [{ data: memberships }, { data: sub }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id, role, groups(id, name, trip_type, join_code, owner_id)")
      .eq("user_id", user.id),
    supabase.from("subscriptions").select("plan,status").eq("user_id", user.id).maybeSingle(),
  ]);

  const groups = (memberships ?? [])
    .map((m) => {
      const g = m.groups as unknown as { id: string; name: string; trip_type: string | null; join_code: string; owner_id: string } | null;
      return g ? { ...g, role: m.role } : null;
    })
    .filter(Boolean) as { id: string; name: string; trip_type: string | null; join_code: string; owner_id: string; role: string }[];

  const hasActiveSub = !!sub && ["active", "trialing"].includes(sub.status ?? "");

  return (
    <Dashboard
      email={user.email ?? ""}
      groups={groups}
      hasActiveSub={hasActiveSub}
      plan={sub?.plan ?? null}
    />
  );
}
