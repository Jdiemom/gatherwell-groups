export const STEPS = [
  { n: 1, t: "Build Your Crew", s: "Invite travelers & commit" },
  { n: 2, t: "Dream & Align", s: "Vision survey" },
  { n: 3, t: "Lock the Dates", s: "Availability poll" },
  { n: 4, t: "Set the Budget", s: "Anonymous comfort survey" },
  { n: 5, t: "Choose the Destination", s: "Destination poll" },
  { n: 6, t: "Buy Flights on Time", s: "Booking-window plan" },
  { n: 7, t: "Pick Your Home Base", s: "Accommodation poll" },
  { n: 8, t: "Plan the Fun", s: "Activity polls" },
  { n: 9, t: "Itinerary & Payments", s: "Final outputs" },
];

/** Default polls seeded for every new group. */
export const DEFAULT_POLLS: {
  step_n: number;
  kind: "choice" | "budget";
  question: string;
  options: { label: string; meta?: string }[];
}[] = [
  {
    step_n: 2,
    kind: "choice",
    question: "What kind of trip is this?",
    options: [
      { label: "🏖️ Rest & reconnect", meta: "Beach house, slow mornings, long dinners" },
      { label: "🎉 Celebration", meta: "Milestone birthday, reunion, bachelorette" },
      { label: "🥾 Adventure", meta: "Hikes, excursions, a full dance card" },
      { label: "🏛️ Culture & food", meta: "Cities, museums, restaurant lists" },
    ],
  },
  {
    step_n: 2,
    kind: "choice",
    question: "Top non-negotiable?",
    options: [
      { label: "Everyone under one roof", meta: "One big house beats five hotel rooms" },
      { label: "Direct flights only", meta: "Protect the short trip" },
      { label: "Keep it affordable", meta: "Nobody stretches, nobody stresses" },
      { label: "Kid & grandparent friendly", meta: "Multigenerational pacing" },
    ],
  },
  {
    step_n: 3,
    kind: "choice",
    question: "Which window works for you?",
    options: [
      { label: "3–4 months out" },
      { label: "5–6 months out" },
      { label: "7–9 months out" },
      { label: "10–12 months out" },
    ],
  },
  {
    step_n: 4,
    kind: "budget",
    question: "Your comfortable all-in budget (votes stay anonymous; only totals show)",
    options: [
      { label: "$750 – $1,200 per person", meta: "Drive-to or short-haul trip" },
      { label: "$1,200 – $2,000 per person", meta: "Domestic flights + good house" },
      { label: "$2,000 – $3,500 per person", meta: "International, full experience" },
      { label: "$3,500+ per person", meta: "Luxury pace, luxury places" },
    ],
  },
  {
    step_n: 5,
    kind: "choice",
    question: "Destination shortlist: pick your winner",
    options: [
      { label: "🇲🇽 Riviera Maya, Mexico", meta: "Direct flights · villa-friendly" },
      { label: "🇵🇹 Algarve, Portugal", meta: "Shoulder-season value" },
      { label: "🇺🇸 Scottsdale, Arizona", meta: "Shortest travel day · big houses" },
      { label: "🇨🇷 Guanacaste, Costa Rica", meta: "Adventure-heavy · great group tours" },
    ],
  },
  {
    step_n: 7,
    kind: "choice",
    question: "Home base: which stay wins?",
    options: [
      { label: "Big villa, all under one roof", meta: "via Rental Escapes / Luxury Rentals" },
      { label: "Two houses side by side", meta: "Privacy + togetherness" },
      { label: "Resort block of rooms", meta: "All-inclusive ease" },
    ],
  },
  {
    step_n: 8,
    kind: "choice",
    question: "Anchor experience: pick your must-do",
    options: [
      { label: "🚤 Private boat day", meta: "via GetYourGuide" },
      { label: "🏛️ Big landmark excursion", meta: "via GetYourGuide" },
      { label: "🍮 Food or cooking experience", meta: "via GetYourGuide" },
      { label: "🤿 Water adventure", meta: "via GetYourGuide" },
    ],
  },
];
