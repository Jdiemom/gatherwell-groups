import Calculator from "./components/Calculator";
import Waitlist from "./components/Waitlist";

const STEPS = [
  { n: 1, t: "Build Your Crew", teaser: "Get the right people in, plus a commitment device that stops the flakes early." },
  { n: 2, t: "Dream & Align", teaser: "A short survey that surfaces what the group actually wants before anyone argues." },
  { n: 3, t: "Lock the Dates", teaser: "The date poll that ends the “any weekend works for me” spiral." },
  { n: 4, t: "Set the Budget", teaser: "Anonymous budget votes so nobody is embarrassed and nobody overcommits." },
  { n: 5, t: "Choose the Destination", teaser: "A shortlist method that matches the winning budget to the winning vibe." },
  { n: 6, t: "Buy Flights on Time", teaser: "Data-backed buying windows so the group stops overpaying for airfare." },
  { n: 7, t: "Pick Your Home Base", teaser: "Compare group stays side by side and book with real support behind you." },
  { n: 8, t: "Plan the Fun", teaser: "Vote on experiences so the planners plan less and everyone shows up." },
  { n: 9, t: "Itinerary & Payments", teaser: "One beautiful itinerary, a payment schedule, and a group that still likes each other." },
];

const FEATURES = [
  { ico: "🗳️", t: "Everyone votes, once", p: "Dates, budget, destination, stays, activities: each decision is a quick poll with a deadline. No 400-message threads. No one left out." },
  { ico: "📊", t: "Real outputs at every step", p: "Each completed step produces something you keep: a budget spreadsheet, a flight plan, a payment schedule, a final itinerary PDF." },
  { ico: "✈️", t: "Buy flights at the right time", p: "We watch the data on booking windows and tell your group when to buy, with an honest caveat that airfare is never a sure thing." },
  { ico: "🏡", t: "Group-sized stays", p: "Book villas and vacation homes through our Rental Escapes and Luxury Rentals partners, backed by real humans if anything goes sideways." },
  { ico: "💸", t: "Built-in budget tool", p: "Pairs with the Gatherwell Budgeting app so everyone knows the number, agrees to the number, and sticks to the number." },
  { ico: "🤝", t: "Humans on standby", p: "Ever get stuck? Hand any step, or the whole trip, to the Gatherwell Travel advisory team. You're never on your own." },
];

const PLANS = [
  {
    name: "Solo Organizer", price: "$19", per: "For the one brave friend planning it all", pop: false,
    items: ["Full 9-step guided method", "1 active group · up to 8 travelers", "All polls & surveys", "Budget spreadsheet + itinerary outputs"],
  },
  {
    name: "Group", price: "$29", per: "One subscription covers the whole group", pop: true,
    items: ["Everything in Solo Organizer", "Unlimited travelers, 3 active trips", "Flight buying-window alerts", "Partner booking perks & support", "Split-pay tracking & reminders"],
  },
  {
    name: "Concierge", price: "$79", per: "We check your work at every step", pop: false,
    items: ["Everything in Group", "Advisor review of each step", "Priority support, 1 business day", "Custom negotiated group rates", "Upgrade path to Full Service"],
  },
];

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a className="logo" href="#top">
            Groups <b>by Gatherwell</b>
            <small>Group Travel, Solved</small>
          </a>
          <div className="nav-links">
            <a href="#how">How It Works</a>
            <a href="#savings">Your Savings</a>
            <a href="#pricing">Pricing</a>
            <a href="#fullservice">Full Service</a>
            <a className="btn btn-primary btn-sm" href="#waitlist">Join the Waitlist</a>
          </div>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="hero-inner">
          <div className="eyebrow">A Gatherwell Travel Company</div>
          <h1>
            Plan the Group Trip.
            <br />
            Skip the Group Chaos.
          </h1>
          <p className="sub">
            One subscription walks your whole group through every decision, step by step: dates,
            budget, flights, stays, and activities. Everyone votes. Nobody chases. You keep the
            money a big group usually wastes.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#waitlist">Join the Waitlist</a>
            <a className="btn btn-light" href="#savings">See What You&apos;d Save</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">$2,300+</div>
              <div className="lbl">typical 12-person group savings*</div>
            </div>
            <div className="hero-stat">
              <div className="num">9 steps</div>
              <div className="lbl">from idea to itinerary</div>
            </div>
            <div className="hero-stat">
              <div className="num">1 place</div>
              <div className="lbl">for every vote &amp; decision</div>
            </div>
          </div>
        </div>
      </header>

      <section id="how">
        <div className="wrap center">
          <div className="eyebrow">How It Works</div>
          <h2 className="sec-title">A guided path, one step at a time</h2>
          <p className="sec-sub">
            Group trips fall apart when everything happens at once. Our method unlocks each step
            only when the one before it is done, so your group makes one decision at a time and
            actually finishes.
          </p>
          <div className="method-steps">
            {STEPS.map((s) => (
              <div key={s.n} className={`mstep ${s.n > 2 ? "locked" : ""}`}>
                {s.n > 2 && <span className="lock">🔒</span>}
                <div className="n">Step {s.n} of 9</div>
                <h3>{s.t}</h3>
                <p className={s.n > 2 ? "blur-tease" : ""}>{s.teaser}</p>
              </div>
            ))}
          </div>
          <p className="foot-note" style={{ maxWidth: 560, margin: "26px auto 0" }}>
            The full method, with the exact questions, timing rules, and money-saving checkpoints
            inside each step, unlocks when your group signs up.
          </p>
        </div>
      </section>

      <Calculator />

      <section>
        <div className="wrap center">
          <div className="eyebrow">Why Groups Choose Us</div>
          <h2 className="sec-title">
            More convenient than the group chat. Cheaper than an advisor.
          </h2>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="card feature" style={{ textAlign: "left" }}>
                <div className="ico">{f.ico}</div>
                <h3>{f.t}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="savings" id="pricing">
        <div className="wrap center">
          <div className="eyebrow">Pricing</div>
          <h2 className="sec-title">Subscribe while you plan. Cancel when you&apos;re booked.</h2>
          <p className="sec-sub">
            Launching soon. Join the waitlist and you&apos;ll get founding-member pricing when we
            open the doors.
          </p>
          <div className="plans">
            {PLANS.map((p) => (
              <div key={p.name} className={`card plan ${p.pop ? "pop" : ""}`}>
                {p.pop && <div className="tag">Most Popular</div>}
                <h3>{p.name}</h3>
                <div className="price">
                  {p.price}
                  <span style={{ fontSize: 16 }}>/mo</span>
                </div>
                <div className="per">{p.per}</div>
                <ul>
                  {p.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <a className={`btn ${p.pop ? "btn-primary" : "btn-outline"}`} href="#waitlist">
                  Join the Waitlist
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
              <div className="eyebrow" style={{ color: "#F5DFA8" }}>
                Gatherwell Travel · Full Service
              </div>
              <h2>Big budget? One person paying? Let us do all of it.</h2>
              <p>
                If your group would rather enjoy the trip than plan it, or one generous host is
                covering everyone, our full-service advisory team designs and books the entire
                journey. Meaningful travel, beautifully planned, zero effort from your group.
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
              <p style={{ fontSize: "12.5px", marginTop: 10, color: "rgba(255,255,255,.7)" }}>
                The DIY subscription is for saving money.
                <br />
                Full Service is for saving time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Waitlist />

      <footer>
        <div className="wrap">
          <div>
            <div className="logo" style={{ color: "#fff" }}>
              Groups <b>by Gatherwell</b>
            </div>
            <p style={{ marginTop: 8, maxWidth: 340 }}>
              Meaningful travel, beautifully planned, now for groups who&apos;d rather do it
              themselves and keep the difference.
            </p>
          </div>
          <div>
            <p>
              <a href="https://gatherwelltravel.com" style={{ color: "#F5DFA8" }}>
                Gatherwell Travel (Full Service)
              </a>
            </p>
            <p style={{ marginTop: 10, fontSize: 12 }}>
              © {new Date().getFullYear()} Gatherwell Travel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
