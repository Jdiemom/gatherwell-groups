/**
 * Every fact that appears in the Terms, Privacy and Refund pages lives here.
 * Julie: check the four values in CONFIRM BEFORE LIVE before switching Stripe to live mode.
 * Changing a value here updates all three legal pages at once.
 */

/* ---------------- CONFIRM BEFORE LIVE ---------------- */

export const LEGAL_NAME = "Gatherwell Travel LLC";

export const GOVERNING_LAW = "the State of Arizona";

/** A real postal address. Stripe and most email rules expect one. Leave "" to hide the line. */
export const MAILING_ADDRESS = "";

/** Bump this whenever you change the wording of any policy. */
export const EFFECTIVE_DATE = "September 4, 2026";

/* ---------------- stable details ---------------- */

export const PRODUCT_NAME = "Groups by Gatherwell";
export const SITE_URL = "https://www.groupsbygatherwell.com";
export const CONTACT_EMAIL = "hello@gatherwelltravel.com";
export const CONTACT_PHONE = "(888) 664-3090";
export const CONTACT_PHONE_HREF = "+18886643090";

/** Kept in one place so the Terms and the pricing section can never drift apart. */
export const PLAN_PRICES = [
  { name: "Solo Organizer", price: "$19 USD per month" },
  { name: "Group", price: "$29 USD per month" },
  { name: "Concierge", price: "$79 USD per month" },
];

/** Named in the Privacy Policy as the companies that handle data on our behalf. */
export const PROCESSORS = [
  { name: "Vercel", role: "hosts the website and keeps server logs" },
  { name: "Supabase", role: "stores your account, your group, and every answer and vote" },
  { name: "Stripe", role: "takes the payment and stores the card details, which we never see" },
  { name: "Resend", role: "delivers the emails the service sends you" },
];

/** Disclosed in the Terms so the affiliate relationship is never a surprise. */
export const PARTNERS = [
  "GetYourGuide",
  "Expedia",
  "Rental Escapes",
  "Luxury Rentals",
  "Welcome Pickups",
];
