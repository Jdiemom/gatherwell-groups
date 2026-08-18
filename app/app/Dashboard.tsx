"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Group = {
  id: string; name: string; trip_type: string | null;
  join_code: string; owner_id: string; role: string;
};

function WelcomeBanner() {
  const params = useSearchParams();
  if (params.get("welcome")) {
    return (
      <div className="callout sage" style={{ marginTop: 0 }}>
        <b>Welcome to Groups by Gatherwell 🎉</b>
        Your subscription is active. Start your first group below and invite your travelers.
      </div>
    );
  }
  if (params.get("billing") === "unconfigured") {
    return (
      <div className="callout" style={{ marginTop: 0 }}>
        <b>Billing is being set up</b>
        Checkout isn&apos;t connected yet. Try again shortly.
      </div>
    );
  }
  return null;
}

export default function Dashboard({ email, groups, hasActiveSub, plan }: {
  email: string; groups: Group[]; hasActiveSub: boolean; plan: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setError(body.error || "Something went wrong."); return; }
    router.push(`/app/group/${body.id}`);
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <div className="app-top">
        <div className="wrap">
          <Link className="logo" href="/">Groups <b>by Gatherwell</b></Link>
          {plan && <span className="pill" style={{ background: "#EDF7F6", color: "var(--teal)" }}>
            {plan[0].toUpperCase() + plan.slice(1)} plan
          </span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span className="pill">{email}</span>
            {hasActiveSub && <a className="btn btn-ghost btn-sm" href="/api/stripe/portal">Billing</a>}
            <button className="btn btn-outline btn-sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="app-main" style={{ maxWidth: 860 }}>
        <Suspense><WelcomeBanner /></Suspense>

        <h2 style={{ fontSize: 30, margin: "18px 0 6px" }}>Your trips</h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 22 }}>
          Every group you organize or belong to lives here.
        </p>

        {groups.length === 0 && (
          <div className="card" style={{ padding: "26px 30px", marginBottom: 22 }}>
            <p style={{ color: "var(--ink-soft)" }}>
              No trips yet. {hasActiveSub ? "Start your first group below." : "Subscribe to start a group, or join one with an invite link from a friend."}
            </p>
          </div>
        )}

        {groups.map((g) => (
          <Link key={g.id} href={`/app/group/${g.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card group-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{g.name}</div>
                <div style={{ fontSize: 14.5, color: "var(--ink-soft)" }}>
                  {g.role === "organizer" ? "You're the organizer" : "Member"}
                  {g.trip_type ? ` · ${g.trip_type}` : ""}
                </div>
              </div>
              <span className="btn btn-sage btn-sm">Open →</span>
            </div>
          </Link>
        ))}

        <div className="divider" />

        {hasActiveSub ? (
          creating ? (
            <form className="card" style={{ padding: "26px 30px" }} onSubmit={createGroup}>
              <h3 style={{ marginBottom: 14 }}>Start a new group trip</h3>
              <div className="field">
                <label htmlFor="g-name">Trip name</label>
                <input id="g-name" name="name" required maxLength={80} placeholder="e.g. Anderson Family Reunion 2027" />
              </div>
              <div className="field">
                <label htmlFor="g-type">Trip type</label>
                <select id="g-type" name="trip_type" defaultValue="Family reunion">
                  <option>Family reunion</option>
                  <option>Friends getaway</option>
                  <option>Milestone celebration</option>
                  <option>Multigenerational trip</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create group"}</button>
                <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>Cancel</button>
              </div>
              {error && <div className="wl-error">{error}</div>}
            </form>
          ) : (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Start a new group trip</button>
          )
        ) : (
          <div className="card" style={{ padding: "26px 30px" }}>
            <h3 style={{ marginBottom: 8 }}>Ready to organize a trip?</h3>
            <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>
              Pick a plan and your first group is minutes away. One subscription covers your whole group.
            </p>
            <Link className="btn btn-primary" href="/#pricing">See plans</Link>
          </div>
        )}
      </div>
    </div>
  );
}
