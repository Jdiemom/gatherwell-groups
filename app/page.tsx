import type { Metadata } from "next";
import Calculator from "./components/Calculator";
import SiteFooter from "./components/SiteFooter";
import Waitlist from "./components/Waitlist";
import { homepageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/* Hand-drawn-feel line icons, 1.4px stroke, brand gold */
const Icons = {
  ballot: (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="3.5" width="16" height="17" />
      <path d="M8 9l2.2 2.2L14.5 6.5" />
      <path d="M8 15.5h8M8 18h5" />
    </svg>
  ),
  document: (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 3.5h8.5L19 8v12.5H6z" />
      <path d="M14.5 3.5V8H19" />
      <path d="M9 12h6M9 15h6M9 18h3.5" />
    </svg>
  ),
  plane: (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden>
      <path d="M3.5 12.5l17-8-4.5 17-4.5-6.5z" />
      <path d="M11.5 15l9-10.5" />
    </svg>
  ),
  house: (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 11.5L12 4.5l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  ),
  coins: (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" />
      <path d="M5 6.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
      <path d="M5 11.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
    </svg>
  ),
  hands: (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20.5s-7.5-4.7-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.3-7.5 10-7.5 10z" />
    </svg>
  ),
  lock: (
    <svg className="ic sm" viewBox="0 0 24 24" aria-hidden style={{ opacity: 0.55 }}>
      <rect x="6" y="10.5" width="12" height="9.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  ),
};

const STEPS = [
  { n: 1, t: "Build Your Crew", teaser: "Get the right people in and stop the flakes early." },
  { n: 2, t: "Dream & Align", teaser: "A short survey that surfaces what the group actually wants." },
  { n: 3, t: "Lock the Dates", teaser: "The date poll that ends the “any weekend works for me” spiral." },
  { n: 4, t: "Set the Budget", teaser: "Anonymous budget votes so nobody overcommits." },
  { n: 5, t: "Choose the Destination", teaser: "A shortlist that matches the winning budget to the winning vibe." },
  { n: 6, t: "Buy Flights on Time", teaser: "Data-backed buying windows so the group stops overpaying." },
  { n: 7, t: "Pick Your Home Base", teaser: "Compare group stays side by side, then book." },
  { n: 8, t: "Plan the Fun", teaser: "Vote on experiences so everyone shows up." },
  { n: 9, t: "Itinerary & Payments", teaser: "One itinerary, a payment schedule, and a group that still likes each other." },
];

const FEATURES = [
  { icon: Icons.hands, t: "A travel agency, not just an app", p: "Every step is backed by working advisors with real supplier relationships. Get stuck, and you can hand any step, or the whole trip, to the Gatherwell Travel team." },
  { icon: Icons.coins, t: "The budget is a gate, not a note", p: "Your group agrees the per-person number before anyone falls in love with a destination, and every step after that respects it. Budget votes stay anonymous so nobody overcommits to keep up." },
  { icon: Icons.plane, t: "We tell you when to buy the flights", p: "We watch the data on booking windows and tell your group when to buy. Airfare is never a sure thing, and we say so." },
  { icon: Icons.house, t: "Rates you cannot get yourself", p: "Villas and group stays through our Rental Escapes and Luxury Rentals partnerships, alongside the destinations we have personally tested." },
  { icon: Icons.ballot, t: "Everyone votes, once", p: "Dates, budget, destination, stays, activities: each decision is a quick poll with a deadline. No 400-message threads, and no organizer left chasing." },
  { icon: Icons.document, t: "Real outputs at every step", p: "Each completed step produces something you keep: a budget spreadsheet, a flight plan, a payment schedule, and a printable final itinerary." },
];

/* The short answer to "why not one of the free planning apps?" */
const DIFFERENCE = [
  {
    t: "Most group planners are software. This one is a travel agency.",
    p: "The apps you have tried were built by software companies. Groups by Gatherwell was built by advisors who book group travel for a living, which is why there are negotiated supplier rates and real people behind the steps rather than a support inbox.",
  },
  {
    t: "It decides, instead of just collecting opinions.",
    p: "A shared canvas is where group trips go to die. Each step here unlocks only when the one before it is settled, so the group moves forward instead of circling for six weeks.",
  },
  {
    t: "The money is handled in the open, and it is free.",
    p: "Our Gatherwell Travel app is a free companion for the part that ruins friendships: shared budgets, pledges, contributions, split expenses and live balances, so one person is never quietly fronting three thousand dollars.",
  },
];

const PLANS = [
  {
    id: "solo",
    name: "Solo Organizer", price: "$19", per: "For the one brave friend planning it all", pop: false,
    items: ["Full 9-step guided method", "1 active group · up to 8 travelers", "All polls & surveys", "Budget spreadsheet + itinerary outputs"],
  },
  {
    id: "group",
    name: "Group", price: "$29", per: "One subscription covers the whole group", pop: true,
    items: ["Everything in Solo Organizer", "Unlimited travelers, 3 active trips", "Flight buying-window alerts", "Partner booking perks & support", "Split-pay tracking & reminders"],
  },
  {
    id: "concierge",
    name: "Concierge", price: "$79", per: "We check your work at every step", pop: false,
    items: ["Everything in Group", "Advisor review of each step", "Priority support, 1 business day", "Custom negotiated group rates", "Upgrade path to Full Service"],
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageSchema()) }}
      />

      <nav className="nav">
        <div className="nav-inner">
          <a className="logo" href="#top">
            Groups <b>by Gatherwell</b>
            <small>Group Travel, Solved</small>
          </a>
          <div className="nav-links">
            <a href="#how">The Method</a>
            <a href="#savings">Your Savings</a>
            <a href="#pricing">Membership</a>
            <a href="#fullservice">Full Service</a>
            <a href="/login">Sign In</a>
            <a className="btn btn-primary btn-sm" href="#pricing">Start Your Group</a>
          </div>
        </div>
      </nav>

      <header className="hero hero-photo" id="top">
        <div className="hero-inner">
          <div className="kicker">By the advisors at Gatherwell Travel</div>
          <h1>
            Plan the group trip.
            <br />
            Skip the <em>chaos</em>.
          </h1>
          <p className="sub">
            Nine guided steps take your whole group from idea to itinerary. Everyone votes,
            nobody chases, and you keep the money big groups usually waste. Behind every step
            is a working travel agency, not just an app.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#pricing">Start Your Group Trip</a>
            <a className="btn btn-light" href="#savings">See What You&apos;d Save</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">$2,300+</div>
              <div className="lbl">typical 12-person savings*</div>
            </div>
            <div className="hero-stat">
              <div className="num">Nine steps</div>
              <div className="lbl">from idea to itinerary</div>
            </div>
            <div className="hero-stat">
              <div className="num">One place</div>
              <div className="lbl">for every vote &amp; decision</div>
            </div>
          </div>
        </div>
      </header>

      <section id="how">
        <div className="wrap center">
          <div className="eyebrow">The Gatherwell Method</div>
          <h2 className="sec-title">A guided path, <em>one step at a time</em></h2>
          <p className="sec-sub">
            Group trips fall apart when everything happens at once. Each step unlocks only when
            the one before it is done. One decision at a time.
          </p>
          <div className="method-steps">
            {STEPS.map((s) => (
              <div key={s.n} className={`mstep ${s.n > 2 ? "locked" : ""}`}>
                <div className="n">
                  <span>N°{String(s.n).padStart(2, "0")}</span>
                  {s.n > 2 && Icons.lock}
                </div>
                <h3>{s.t}</h3>
                <p className={s.n > 2 ? "blur-tease" : ""}>{s.teaser}</p>
              </div>
            ))}
          </div>
          <p className="foot-note" style={{ maxWidth: 540, margin: "30px auto 0" }}>
            The full method unlocks when your group signs up.
          </p>
        </div>
      </section>

      <section className="savings" id="difference">
        <div className="wrap center">
          <div className="eyebrow">Why Not One of the Free Apps</div>
          <h2 className="sec-title">
            You have tried the planning apps.
            <br />
            <em>This is not one of those.</em>
          </h2>
          <div className="diff-grid">
            {DIFFERENCE.map((d) => (
              <div key={d.t} className="diff">
                <h3>{d.t}</h3>
                <p>{d.p}</p>
              </div>
            ))}
          </div>
          <p className="foot-note" style={{ maxWidth: 620, margin: "34px auto 0" }}>
            The Gatherwell Travel app is free on the App Store, with or without a membership.{" "}
            <a href="https://apps.apple.com/us/app/gatherwell-travel/id6762874183" target="_blank" rel="noopener noreferrer">
              Download it here
            </a>
            .
          </p>
        </div>
      </section>

      <Calculator />

      <section>
        <div className="wrap center">
          <div className="eyebrow">Why Groups Choose Us</div>
          <h2 className="sec-title">
            More convenient than the group chat.
            <br />
            <em>Better connected than any app.</em>
          </h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.t} className="feature">
                <div className="f-head">
                  {f.icon}
                  <h3>{f.t}</h3>
                </div>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="savings" id="pricing">
        <div className="wrap center">
          <div className="eyebrow">Membership</div>
          <h2 className="sec-title">Subscribe while you plan. <em>Cancel when you&apos;re booked.</em></h2>
          <p className="sec-sub">
            One membership covers your whole group. Travelers join free with an invite link;
            only the organizer subscribes.
          </p>
          <div className="plans">
            {PLANS.map((p) => (
              <div key={p.name} className={`card plan ${p.pop ? "pop" : ""}`}>
                {p.pop && <div className="tag">Most Popular</div>}
                <h3>{p.name}</h3>
                <div className="price">
                  {p.price}
                  <span> / month</span>
                </div>
                <div className="per">{p.per}</div>
                <ul>
                  {p.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <a className={`btn ${p.pop ? "btn-primary" : "btn-outline"}`} href={`/api/stripe/checkout?plan=${p.id}`}>
                  Choose {p.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fullservice">
        <div className="wrap">
          <div className="fs-band">
            <div>
              <div className="eyebrow">Gatherwell Travel · Full Service</div>
              <h2>Big budget? One person paying? <em>Let us do all of it.</em></h2>
              <p>
                If your group would rather enjoy the trip than plan it, or one generous host is
                covering everyone, our full-service advisory team designs and books the entire
                journey. Meaningful travel, beautifully planned.
              </p>
            </div>
            <div className="right">
              <a
                className="btn btn-primary"
                href="https://gatherwelltravel.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Schedule a Consultation
              </a>
              <p style={{ fontSize: "14px", marginTop: 14, color: "rgba(255,255,255,.78)" }}>
                The membership is for saving money.
                <br />
                Full Service is for saving time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Waitlist />

      <SiteFooter />
    </>
  );
}
