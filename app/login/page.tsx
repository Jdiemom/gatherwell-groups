"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const plan = params.get("plan") || "";
  const next = params.get("next") || (plan ? `/api/stripe/checkout?plan=${plan}` : "/app");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const email = new FormData(e.currentTarget).get("email") as string;
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <section className="waitlist" style={{ minHeight: "70vh" }}>
      <div className="wrap center">
        <div className="eyebrow">Members</div>
        <h2 className="sec-title">Sign in to Groups by Gatherwell</h2>
        <p className="sec-sub">
          No passwords here. Enter your email and we&apos;ll send you a secure sign-in link.
          {plan && " You'll go straight to checkout after you click it."}
        </p>
        {status === "sent" ? (
          <div className="wl-card card">
            <div className="wl-success">
              <b>Check your email 📬</b>
              <br />
              We sent you a sign-in link. Open it on this device and you&apos;ll land right back
              here, signed in. It can take a minute to arrive.
            </div>
          </div>
        ) : (
          <form className="wl-card card" onSubmit={submit}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/groups-logo.png"
              alt=""
              style={{ display: "block", margin: "0 auto 18px", maxWidth: 190, width: "100%" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="field">
              <label htmlFor="li-email">Email</label>
              <input
                id="li-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={status === "sending"}>
              {status === "sending" ? "Sending your link…" : "Email me a sign-in link"}
            </button>
            {status === "error" && <div className="wl-error">{error}</div>}
            <p className="foot-note" style={{ marginTop: 14 }}>
              New here? Same box. Your account is created the first time you sign in.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a className="logo" href="/">
            Groups <b>by Gatherwell</b>
            <small>Group Travel, Solved</small>
          </a>
        </div>
      </nav>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
