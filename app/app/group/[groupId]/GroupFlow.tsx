"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { STEPS } from "@/lib/steps";

type Member = { user_id: string; role: string; name: string };
type Poll = {
  id: string; step_n: number; kind: string; question: string;
  options: { id: string; label: string; meta: string | null; sort: number }[];
  votes: { option_id: string; user_id: string }[];
};
type Group = { id: string; name: string; trip_type: string | null; owner_id: string; join_code: string };

const AV_COLORS = ["#B4531A", "#5C6E4E", "#B08A3E", "#0E9488", "#7A5C8F", "#A34A5E"];
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function GroupFlow(props: {
  userId: string; group: Group; members: Member[]; completed: number[]; polls: Poll[];
}) {
  const { userId, group, members } = props;
  const isOrganizer = group.owner_id === userId;
  const [completed, setCompleted] = useState<Set<number>>(new Set(props.completed));
  const [polls, setPolls] = useState<Poll[]>(props.polls);
  const [current, setCurrent] = useState<number>(() => {
    for (let i = 1; i <= 9; i++) if (!new Set(props.completed).has(i)) return i;
    return 9;
  });
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ title: string; body: string; fname: string; fdata?: string } | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const nextStep = useMemo(() => {
    for (let i = 1; i <= 9; i++) if (!completed.has(i)) return i;
    return 9;
  }, [completed]);

  const savings = useMemo(() => {
    let s = 0;
    const n = members.length;
    if (completed.has(4)) s += n * 40;
    if (completed.has(6)) s += Math.round(n * 600 * 0.12);
    if (completed.has(7)) s += n * 25;
    if (completed.has(8)) s += n * 30;
    return s;
  }, [completed, members.length]);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function goStep(n: number) {
    if (!completed.has(n) && n > nextStep) {
      say(`That step is locked. Finish Step ${nextStep} first: one decision at a time is the method.`);
      return;
    }
    setCurrent(n);
  }

  async function vote(poll: Poll, optionId: string) {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("votes")
      .upsert({ poll_id: poll.id, option_id: optionId, user_id: userId });
    if (error) { say("Vote didn't save. Try again."); return; }
    setPolls((ps) => ps.map((p) => {
      if (p.id !== poll.id) return p;
      const others = p.votes.filter((v) => v.user_id !== userId);
      return { ...p, votes: [...others, { option_id: optionId, user_id: userId }] };
    }));
    say("Vote recorded.");
  }

  async function completeStep(n: number, msg?: string) {
    if (!isOrganizer) { say("Only the organizer can complete a step."); return; }
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("step_progress")
      .upsert({ group_id: group.id, step_n: n, completed_by: userId });
    if (error) { say("Couldn't save progress. Try again."); return; }
    setCompleted((c) => new Set([...c, n]));
    if (n < 9) setCurrent(n + 1);
    say(msg || `Step ${n} complete. Step ${n + 1} unlocked!`);
  }

  function inviteLink() {
    return `${window.location.origin}/join/${group.join_code}`;
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink());
      say("Invite link copied. Send it to your travelers!");
    } catch {
      setModal({ title: "Your invite link", body: inviteLink(), fname: "" });
    }
  }

  function download(name: string, body: string) {
    try {
      const type = name.endsWith(".csv") ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";
      const blob = new Blob([body], { type });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { say("Download blocked in this browser."); }
  }

  /* ---------- poll rendering ---------- */
  function pollBlock(poll: Poll) {
    const total = poll.votes.length;
    const mine = poll.votes.find((v) => v.user_id === userId)?.option_id;
    const isBudget = poll.kind === "budget";
    const max = Math.max(...poll.options.map((o) => poll.votes.filter((v) => v.option_id === o.id).length), 0);
    return (
      <div key={poll.id} style={{ marginBottom: 26 }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>{poll.question}</h3>
        {poll.options.map((o) => {
          const count = poll.votes.filter((v) => v.option_id === o.id).length;
          const win = total > 0 && count === max && max > 0;
          return (
            <div
              key={o.id}
              className={`poll-opt ${mine === o.id ? "sel" : ""} ${win ? "win" : ""}`}
              onClick={() => vote(poll, o.id)}
            >
              <span className="name">{o.label}</span>
              {total > 0 && <span className="votes">{count} vote{count !== 1 ? "s" : ""}</span>}
              {o.meta && <span className="meta">{o.meta}</span>}
              {total > 0 && (
                <div className="vote-track">
                  <div className="vote-fill" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
              )}
            </div>
          );
        })}
        <p className="foot-note">
          {isBudget
            ? "Budget votes are anonymous: everyone sees the totals, never who picked what."
            : `${total} of ${members.length} travelers have voted.`}
        </p>
      </div>
    );
  }

  function stepPolls(n: number) {
    return polls.filter((p) => p.step_n === n).map(pollBlock);
  }

  function header(n: number) {
    const st = STEPS[n - 1];
    return (
      <>
        <div className="step-eyebrow">Step {n} of 9 · The Gatherwell Method</div>
        <h2>{st.t}</h2>
      </>
    );
  }

  function completeBtn(n: number, label: string, enabled = true, msg?: string) {
    if (completed.has(n)) return <span className="pill" style={{ background: "#F2F5EE", color: "var(--sage-deep)" }}>✓ Step complete</span>;
    if (!isOrganizer) return <span className="foot-note">The organizer completes this step when the group is ready.</span>;
    return (
      <button className="btn btn-primary" disabled={!enabled} onClick={() => completeStep(n, msg)}>
        {label}
      </button>
    );
  }

  /* ---------- step content ---------- */
  function stepContent(n: number) {
    switch (n) {
      case 1:
        return (
          <>
            {header(1)}
            <p className="lead">Trips die from soft commitments. Get real names in, then set a commitment device before anyone books anything.</p>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Your travelers ({members.length})</h3>
            <div className="member-chips">
              {members.map((m, i) => (
                <span key={m.user_id} className={`chip ${m.user_id === userId ? "you" : ""}`}>
                  <span className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{m.name[0]?.toUpperCase()}</span>
                  {m.name}{m.role === "organizer" ? " · organizer" : ""}
                </span>
              ))}
            </div>
            <div className="callout sage">
              <b>Invite your group</b>
              Anyone with your invite link can join free and vote on every decision.
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-sage btn-sm" onClick={copyInvite}>Copy invite link</button>
              </div>
            </div>
            <div className="callout">
              <b>Method rule: no planning around a “maybe”</b>
              Pick a commitment device with your group: a small deposit, a reply-by date, or the
              ticketed-means-in rule. Groups that set one in week one keep 90%+ of their headcount.
            </div>
            <div className="step-actions">{completeBtn(1, "Crew is in. Complete Step 1 →", members.length >= 2, undefined)}</div>
            {members.length < 2 && isOrganizer && !completed.has(1) && (
              <p className="foot-note">Invite at least one traveler to complete this step.</p>
            )}
          </>
        );
      case 2:
        return (
          <>
            {header(2)}
            <p className="lead">Before dates or dollars, the group aligns on what this trip is for. Everyone votes; the winners become your group&apos;s brief.</p>
            {stepPolls(2)}
            <div className="step-actions">{completeBtn(2, "Lock the Vision →")}</div>
          </>
        );
      case 3:
        return (
          <>
            {header(3)}
            <p className="lead">The date poll that ends the &quot;any weekend works&quot; spiral. Lock a window early: it&apos;s what makes the flight-savings step possible.</p>
            {stepPolls(3)}
            <div className="callout">
              <b>Method rule: 72-hour decision window</b>
              Set a deadline with your group, then lock the top window. Deadlines are what make group planning humane.
            </div>
            <div className="step-actions">{completeBtn(3, "Lock the Dates →", true, "Dates locked! Early dates mean cheap flights later.")}</div>
          </>
        );
      case 4:
        return (
          <>
            {header(4)}
            <p className="lead">Money talk sinks friendships when it&apos;s public. Everyone votes a comfortable number anonymously; the group adopts a target from the honest middle.</p>
            {stepPolls(4)}
            <div className="callout teal">
              <b>Track it in the Gatherwell Budgeting app</b>
              Once adopted, your budget becomes the yardstick for every later choice.
              <div style={{ marginTop: 12 }}>
                <a
                  className="btn btn-sage btn-sm"
                  href="https://apps.apple.com/us/app/gatherwell-travel/id6762874183"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get the Budgeting App
                </a>
              </div>
            </div>
            <div className="step-actions">
              {completeBtn(4, "Adopt Budget →", true, "Budget set. Advisor fee avoided: ~$40/person.")}
              <button className="btn btn-outline btn-sm" onClick={() => {
                const rows: [string, number][] = [
                  ["Flights", 600],
                  ["Accommodation", 480],
                  ["Activities", 240],
                  ["Food & local", 300],
                  ["Buffer (10%)", 162],
                  ["TOTAL", 1782],
                ];
                setModal({
                  title: "Group Budget",
                  fname: "Group-Budget.csv",
                  body:
`GROUP BUDGET · ${group.name}
Travelers: ${members.length}

${"Category".padEnd(16)}${"Per Person".padEnd(13)}Group Total
${rows.map(([c, v]) => c.padEnd(16) + fmt(v).padEnd(13) + fmt(v * members.length)).join("\n")}`,
                  fdata:
`Category,Per Person,Group Total\n` +
rows.map(([c, v]) => `"${c}","${fmt(v)}","${fmt(v * members.length)}"`).join("\n"),
                });
              }}>Preview budget spreadsheet</button>
            </div>
          </>
        );
      case 5:
        return (
          <>
            {header(5)}
            <p className="lead">Now, and only now, the group picks where. Vote from a short list that fits the locked vision, dates, and budget.</p>
            {stepPolls(5)}
            <div className="callout sage">
              <b>Why the shortlist stays short</b>
              Groups pick fastest and happiest from 3–5 vetted options. Unlimited options are where group trips go to die.
            </div>
            <div className="step-actions">{completeBtn(5, "Lock the Winner →")}</div>
          </>
        );
      case 6:
        return (
          <>
            {header(6)}
            <p className="lead">This is where most groups burn the most money. Your dates are locked, so buy in the data-backed window.</p>
            <div className="fw-timeline">
              <div className="fw-zone" style={{ left: 0, width: "22%", background: "#F3D8C6", color: "#96430F" }}>Too early<br />prices unsettled</div>
              <div className="fw-zone" style={{ left: "22%", width: "40%", background: "#CDE9E6", color: "#0B6A61", borderLeft: "2px solid #fff", borderRight: "2px solid #fff" }}>✓ Buying window<br />intl: ~2–6 months out</div>
              <div className="fw-zone" style={{ left: "62%", width: "38%", background: "#F3D8C6", color: "#96430F" }}>Too late<br />fares climb weekly</div>
            </div>
            <p className="foot-note">
              International fares have historically bottomed out around 2–6 months before departure; domestic 1–3 months out averages roughly 25% below peak. Airfare is dynamic and no window is guaranteed: this improves your odds, it is not a promise.
            </p>
            <div className="partner-card">
              <div className="lg" style={{ background: "#1E3A8A" }}>E</div>
              <div><h4>Book through Expedia <span className="badge">Partner link</span></h4><p>Everyone books in one place with your trip dates.</p></div>
              <a className="btn btn-sage btn-sm" href="https://www.expedia.com" target="_blank" rel="noopener noreferrer">Open</a>
            </div>
            <div className="partner-card">
              <div className="lg" style={{ background: "#4A3F35" }}>G</div>
              <div><h4>Have Gatherwell ticket the group <span className="badge">Upgrade</span></h4><p>Our advisors hold group space and ticket everyone together. Ideal for 10+.</p></div>
              <button className="btn btn-outline btn-sm" onClick={() => setContactOpen(true)}>Ask us</button>
            </div>
            <div className="step-actions">
              {completeBtn(6, "Flights Planned. Complete Step →", true, `Estimated ${fmt(Math.round(members.length * 600 * 0.12))} kept by buying in the window.`)}
              <button className="btn btn-outline btn-sm" onClick={() => setModal({
                title: "Flight Plan",
                fname: "Flight-Plan.txt",
                body:
`FLIGHT PLAN · ${group.name}

BUYING WINDOW
  Intl: ~2-6 months before departure (sweet spot ~129 days)
  Domestic: 1-3 months out, ~25% below peak on average
  Caveat: dynamic pricing. Windows improve odds, never guarantee.

BOOKING PATH
  1) Expedia partner link (group books individually)
  2) Or: Gatherwell advisors ticket the group together`,
              })}>Preview flight plan</button>
            </div>
          </>
        );
      case 7:
        return (
          <>
            {header(7)}
            <p className="lead">One house changes a group trip&apos;s chemistry. Compare true per-person cost, then book through our partners.</p>
            {stepPolls(7)}
            <div className="partner-card">
              <div className="lg" style={{ background: "#0E9488" }}>R</div>
              <div><h4>Rental Escapes &amp; Luxury Rentals <span className="badge">White label</span></h4><p>Gatherwell-branded booking with concierge included.</p></div>
              <a className="btn btn-sage btn-sm" href="https://gatherwelltravel.com" target="_blank" rel="noopener noreferrer">Browse homes</a>
            </div>
            <div className="step-actions">{completeBtn(7, "Book the Winner →", true, "Home base chosen. Group perks applied.")}</div>
          </>
        );
      case 8:
        return (
          <>
            {header(8)}
            <p className="lead">Plan 60% of the days and protect the rest. Vote on the anchors; whitespace stays sacred.</p>
            {stepPolls(8)}
            <div className="callout sage">
              <b>The 60/40 rule</b>
              A few shared anchor experiences, plenty of unscheduled space. Over-scheduled groups come home tired; under-scheduled ones never leave the pool.
            </div>
            <div className="step-actions">{completeBtn(8, "Anchor the Winners →", true, "Activities anchored. Group rates locked through partners.")}</div>
          </>
        );
      case 9: {
        const done = completed.has(9);
        return (
          <>
            {header(9)}
            <p className="lead">Everything the group decided, in one place. This is the moment the group chat goes blissfully silent.</p>
            <div className="sav-rows">
              <div className="sav-row">
                <span className="t">Total estimated savings this trip</span>
                <span className="v">{fmt(savings)}</span>
                <span className="d">vs. per-person advisor fees and un-timed flight purchases.</span>
              </div>
            </div>
            <div className="step-actions" style={{ marginTop: 22 }}>
              {completeBtn(9, done ? "Trip Planned 🎉" : "Generate Final Outputs →", true, "Trip complete! 🎉 Pause your subscription until the next adventure.")}
              <button className="btn btn-outline btn-sm" onClick={() => setModal({
                title: "Master Itinerary",
                fname: "Master-Itinerary.txt",
                body:
`${group.name.toUpperCase()} · MASTER ITINERARY
Travelers: ${members.length}

Assembled from your group's winning votes:
${polls.map((p) => {
  const counts = p.options.map((o) => ({ o, c: p.votes.filter((v) => v.option_id === o.id).length }));
  const win = counts.sort((a, b) => b.c - a.c)[0];
  return `  Step ${p.step_n}: ${p.question}\n    → ${win && win.c > 0 ? win.o.label : "(no votes yet)"}`;
}).join("\n")}

Booked through: Expedia · GetYourGuide · Rental Escapes · Luxury Rentals
Need a human? gatherwelltravel.com`,
              })}>Itinerary preview</button>
              <button className="btn btn-outline btn-sm" onClick={() => setModal({
                title: "Payment Schedule",
                fname: "Payment-Schedule.csv",
                body:
`PAYMENT SCHEDULE · ${group.name}

${"Traveler".padEnd(20)}${"Deposit (25%)".padEnd(16)}${"Balance".padEnd(11)}Balance Due
${members.map((m) => m.name.padEnd(20) + "$446".padEnd(16) + "$1,336".padEnd(11) + "60 days before departure").join("\n")}`,
                fdata:
`Traveler,Deposit (25%),Balance,Balance Due\n` +
members.map((m) => `"${m.name}","$446","$1,336","60 days before departure"`).join("\n"),
              })}>Payment schedule</button>
            </div>
            {done && (
              <div className="callout" style={{ marginTop: 26 }}>
                <b>Next trip?</b>
                Your group and its history stay saved. Start the next adventure from your dashboard.
              </div>
            )}
          </>
        );
      }
      default:
        return null;
    }
  }

  /* ---------- shell ---------- */
  return (
    <div className="app-shell">
      <div className="app-top">
        <div className="wrap">
          <Link className="logo" href="/app">Groups <b>by Gatherwell</b></Link>
          <span className="pill">{group.name}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-sage btn-sm" onClick={copyInvite}>Invite travelers</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setContactOpen(true)}>Need a human?</button>
            <Link className="btn btn-outline btn-sm" href="/app">All trips</Link>
          </div>
        </div>
      </div>

      <div className="app-main">
        <div className="savings-live">
          <svg className="ic" viewBox="0 0 24 24" aria-hidden><ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" /><path d="M5 11.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" /></svg>
          <div>
            <div className="amt">{fmt(savings)}</div>
            <div className="lbl">estimated savings your group has locked in so far. Updates as you complete steps.</div>
          </div>
        </div>

        <div className="app-grid">
          <aside>
            <div className="card side-steps">
              <div className="prog-wrap">
                <div className="prog-track"><div className="prog-fill" style={{ width: `${(completed.size / 9) * 100}%` }} /></div>
                <div className="prog-lbl">{completed.size} of 9 steps complete</div>
              </div>
              <div style={{ padding: 8 }}>
                {STEPS.map((st) => {
                  const done = completed.has(st.n);
                  const locked = !done && st.n > nextStep;
                  const active = st.n === current;
                  return (
                    <div key={st.n} className={`sstep ${active ? "active" : ""} ${done ? "done" : ""} ${locked ? "locked" : ""}`} onClick={() => goStep(st.n)}>
                      <div className="dot">{done ? "✓" : st.n}</div>
                      <div>
                        <div className="t">{st.t}</div>
                        <div className="s">{locked ? "Locked" : done ? "Complete" : st.s}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
          <main>
            <div className="card panel">{stepContent(current)}</div>
          </main>
        </div>
      </div>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setModal(null)}>×</button>
            <h3>{modal.title}</h3>
            <pre>{modal.body}</pre>
            {modal.fname && (
              <div className="step-actions">
                <button className="btn btn-primary btn-sm" onClick={() => download(modal.fname, modal.fdata ?? modal.body)}>Download file</button>
              </div>
            )}
          </div>
        </div>
      )}

      {contactOpen && (
        <div className="modal-bg" onClick={() => setContactOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setContactOpen(false)}>×</button>
            <h3>Talk to a real person</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.7 }}>
              The Gatherwell Travel advisory team is behind every step. Hand us one decision or
              the whole trip.
            </p>
            <a className="contact-row" href="mailto:hello@gatherwelltravel.com">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden>
                <rect x="3.5" y="5.5" width="17" height="13" />
                <path d="M4 6.5l8 6.5 8-6.5" />
              </svg>
              <span>
                <span className="cr-title">Email us</span>
                <br />
                <span className="cr-sub">hello@gatherwelltravel.com</span>
              </span>
            </a>
            <a className="contact-row" href="tel:+18886643090">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 4.5h4l1.5 4.5-2.2 1.8a13 13 0 0 0 5 5l1.8-2.2 4.4 1.5v4a1.5 1.5 0 0 1-1.6 1.4A16.5 16.5 0 0 1 3.6 6.1 1.5 1.5 0 0 1 5 4.5z" />
              </svg>
              <span>
                <span className="cr-title">Call us</span>
                <br />
                <span className="cr-sub">(888) 664-3090</span>
              </span>
            </a>
            <a className="contact-row" href="sms:+18886643090">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 5.5h16v11H9l-4.5 3.5V5.5z" />
                <path d="M8 9.5h8M8 12.5h5" />
              </svg>
              <span>
                <span className="cr-title">Text us</span>
                <br />
                <span className="cr-sub">Same number: (888) 664-3090</span>
              </span>
            </a>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
