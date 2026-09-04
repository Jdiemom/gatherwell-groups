"use client";

import { useEffect, useState } from "react";

const KINDS = [
  { id: "idea", label: "A feature idea" },
  { id: "confusing", label: "Something confused me" },
  { id: "broken", label: "Something is broken" },
  { id: "praise", label: "Something I love" },
];

const PROMPTS: Record<string, string> = {
  idea: "What would you like to see? What would make planning this trip easier?",
  confusing: "Which step, and what did you expect to happen instead?",
  broken: "What were you doing when it went wrong?",
  praise: "What worked well? We would like to keep doing it.",
};

const MAX = 2000;

/** The floating feedback button, live on every page. Works whether or not you are signed in. */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    // Let the modal finish closing before wiping a successful send.
    setTimeout(() => {
      if (sent) {
        setSent(false);
        setMessage("");
        setKind("idea");
        setError("");
      }
    }, 250);
  }

  async function submit() {
    const text = message.trim();
    if (text.length < 4) {
      setError("Tell us a little more so we can act on it.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: text.slice(0, MAX),
          email: email.trim(),
          page: typeof window === "undefined" ? "" : window.location.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "We could not send that just now. Please try again in a minute.");
      } else {
        setSent(true);
      }
    } catch {
      setError("We could not send that just now. Please try again in a minute.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button className="fb-fab" onClick={() => setOpen(true)} aria-label="Send feedback">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M20 4.5H4v12h4.5v3.5l4-3.5H20z" />
          <path d="M8.5 10h7M8.5 13h4.5" />
        </svg>
        Feedback
      </button>

      {open && (
        <div className="modal-bg" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={close} aria-label="Close">
              ×
            </button>

            {sent ? (
              <>
                <h3>Thank you. That helps.</h3>
                <div className="fb-done" style={{ marginTop: 18 }}>
                  Every note goes straight to Julie, and a person reads all of them. If you left your
                  email and we build what you asked for, we will tell you.
                </div>
                <div className="step-actions">
                  <button className="btn btn-primary" onClick={close}>
                    Back to planning
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow">Help Us Build It</div>
                <h3>What would make this better?</h3>
                <p className="lead" style={{ marginBottom: 24 }}>
                  This is a young product and it is being built around real groups. Tell us what is
                  missing and it goes on the list.
                </p>

                <div className="fb-kinds">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      className={`fb-kind ${kind === k.id ? "on" : ""}`}
                      onClick={() => setKind(k.id)}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>

                <label className="pf-label" htmlFor="fb-msg">
                  {PROMPTS[kind]}
                </label>
                <textarea
                  id="fb-msg"
                  className="fb-area"
                  value={message}
                  maxLength={MAX}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Be as specific as you like. Detail is useful."
                />
                <div className="fb-count">
                  {message.length}/{MAX}
                </div>

                <label className="pf-label" style={{ marginTop: 16 }} htmlFor="fb-email">
                  Your email, if you would like an answer (optional)
                </label>
                <input
                  id="fb-email"
                  className="pf-input"
                  type="email"
                  value={email}
                  maxLength={200}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                {error && <div className="fb-err">{error}</div>}

                <div className="step-actions">
                  <button className="btn btn-primary" onClick={submit} disabled={sending}>
                    {sending ? "Sending" : "Send it"}
                  </button>
                  <button className="btn btn-ghost" onClick={close}>
                    Not now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
