"use client";

import { useState } from "react";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function calcSavings(size: number, airfare: number, style: string) {
  const feePP = 100; // Gatherwell Travel's full-service planning fee per traveler (USD)
  const advisorFees = size * feePP;
  const flightPct = style === "domestic" ? 0.15 : 0.12;
  const flightSave = size * airfare * flightPct;
  const activitySave = size * (style === "lux" ? 55 : 35);
  const subCost = 3 * 29; // ~3 months on the Group plan
  return {
    advisorFees,
    flightSave,
    activitySave,
    subCost,
    total: advisorFees + flightSave + activitySave - subCost,
  };
}

export default function Calculator() {
  const [size, setSize] = useState(12);
  const [air, setAir] = useState(600);
  const [style, setStyle] = useState("intl");

  const r = calcSavings(size, air, style);
  const mx = Math.max(r.advisorFees, r.subCost);

  return (
    <section className="savings" id="savings">
      <div className="wrap">
        <div className="center">
          <div className="eyebrow">The Math</div>
          <h2 className="sec-title">Where a group loses money</h2>
          <p className="sec-sub">
            Move the sliders. This is what a group your size typically hands away, and what our
            subscription costs instead.
          </p>
        </div>
        <div className="sav-grid">
          <div className="card calc">
            <label>
              Travelers in your group <span className="range-val">{size}</span>
            </label>
            <input
              type="range"
              min={4}
              max={40}
              value={size}
              onChange={(e) => setSize(+e.target.value)}
            />
            <label>
              Average round-trip airfare per person <span className="range-val">{fmt(air)}</span>
            </label>
            <input
              type="range"
              min={200}
              max={2000}
              step={50}
              value={air}
              onChange={(e) => setAir(+e.target.value)}
            />
            <label>Trip style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="domestic">Domestic getaway</option>
              <option value="intl">International trip</option>
              <option value="lux">Luxury / milestone trip</option>
            </select>
            <div className="sav-total">
              <div className="amt">{fmt(r.total)}</div>
              <div className="cap">
                estimated money your group keeps
              </div>
            </div>
          </div>
          <div>
            <div className="sav-rows">
              <div className="sav-row">
                <span className="t">Advisor planning fees you skip</span>
                <span className="v">{fmt(r.advisorFees)}</span>
                <span className="d">
                  Full-service planning runs about $100 per traveler on custom group trips.
                </span>
              </div>
              <div className="sav-row">
                <span className="t">Flights bought in the right window</span>
                <span className="v">{fmt(r.flightSave)}</span>
                <span className="d">
                  Booking domestic trips 1–3 months out has averaged ~25% below peak fares.
                </span>
              </div>
              <div className="sav-row">
                <span className="t">Group rates &amp; partner perks</span>
                <span className="v">{fmt(r.activitySave)}</span>
                <span className="d">
                  Activity and stay perks through GetYourGuide, Expedia, Rental Escapes &amp;
                  Luxury Rentals.
                </span>
              </div>
              <div className="sav-row">
                <span className="t">Your subscription (~3 months)</span>
                <span className="v" style={{ color: "var(--terracotta)" }}>
                  −{fmt(r.subCost)}
                </span>
                <span className="d">Cancel as soon as the trip is booked.</span>
              </div>
            </div>
            <div className="foot-note">
              *Estimates. The advisor-fee figure reflects Gatherwell Travel&apos;s own full-service
              planning fee of about $100 USD per traveler; industry fees commonly run $25–$100+ per
              person for custom group trips (
              <a
                href="https://hostagencyreviews.com/blog/travel-agents-guide-to-charging-fees"
                target="_blank"
                rel="noopener noreferrer"
              >
                Host Agency Reviews
              </a>
              ). Booking domestic flights in the 1–3 month window has averaged roughly 25% below
              peak pricing (
              <a
                href="https://www.forbes.com/advisor/credit-cards/travel-rewards/best-time-to-buy-flights/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Forbes Advisor
              </a>
              ). Airfare timing is never guaranteed.
            </div>
          </div>
        </div>
        <div className="card bar-wrap">
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Cost to plan this trip</h3>
          <div className="bar-line">
            <span>Traditional advisor fees</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ background: "#B4531A", width: `${(r.advisorFees / mx) * 100}%` }}
              />
            </div>
            <span className="bar-val" style={{ color: "#B4531A" }}>
              {fmt(r.advisorFees)}
            </span>
          </div>
          <div className="bar-line">
            <span>Groups by Gatherwell</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  background: "#0E9488",
                  width: `${Math.max((r.subCost / mx) * 100, 4)}%`,
                }}
              />
            </div>
            <span className="bar-val" style={{ color: "#0E9488" }}>
              {fmt(r.subCost)}
            </span>
          </div>
          <p className="foot-note">Based on a 3-month planning timeline on the Group plan.</p>
        </div>
      </div>
    </section>
  );
}
