"use client";

import { useState } from "react";

export default function Waitlist() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <section className="waitlist" id="waitlist">
      <div className="wrap center">
        <div className="eyebrow">Not Ready Yet?</div>
        <h2 className="sec-title">Trip still a daydream? Stay in the loop.</h2>
        <p className="sec-sub">
          If your group isn&apos;t ready to start planning, leave your email and we&apos;ll send
          occasional group-travel savings tips.
        </p>
        {status === "done" ? (
          <div className="wl-card card">
            <div className="wl-success">
              <b>You&apos;re on the list! 🎉</b>
              <br />
              Watch your inbox. We&apos;ll be in touch.
            </div>
          </div>
        ) : (
          <form className="wl-card card" onSubmit={submit}>
            <div className="field">
              <label htmlFor="wl-name">First name</label>
              <input id="wl-name" name="name" required maxLength={80} placeholder="Your first name" />
            </div>
            <div className="field">
              <label htmlFor="wl-email">Email</label>
              <input
                id="wl-email"
                name="email"
                type="email"
                required
                maxLength={200}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="wl-size">How big is your group, roughly?</label>
              <select id="wl-size" name="group_size" defaultValue="7-12">
                <option value="4-6">4–6 travelers</option>
                <option value="7-12">7–12 travelers</option>
                <option value="13-20">13–20 travelers</option>
                <option value="21+">21+ travelers</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="wl-when">When&apos;s the trip?</label>
              <select id="wl-when" name="trip_timing" defaultValue="6-12 months">
                <option value="0-6 months">In the next 6 months</option>
                <option value="6-12 months">6–12 months away</option>
                <option value="12+ months">More than a year out</option>
                <option value="dreaming">Still dreaming</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={status === "sending"}>
              {status === "sending" ? "Adding you…" : "Join the Waitlist"}
            </button>
            {status === "error" && <div className="wl-error">{error}</div>}
            <p className="foot-note" style={{ marginTop: 14 }}>
              No spam. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
