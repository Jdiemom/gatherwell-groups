"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true); setError("");
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setError(body.error || "Couldn't join."); return; }
    router.push(`/app/group/${body.id}`);
  }

  return (
    <div style={{ marginTop: 26 }}>
      <button className="btn btn-primary" onClick={join} disabled={busy}>
        {busy ? "Joining…" : "Join the group"}
      </button>
      {error && <div className="wl-error" style={{ maxWidth: 420, margin: "14px auto 0" }}>{error}</div>}
    </div>
  );
}
