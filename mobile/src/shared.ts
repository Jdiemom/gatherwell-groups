/**
 * The single bridge to the website's own data.
 *
 * Everything below is imported straight out of the Next.js app's `lib/` folder at
 * the repository root: the nine steps, the seeded polls, the destination library,
 * the matching algorithm, the airport list and the legal/pricing constants. The
 * app does NOT keep its own copy, so the phone cannot drift from the website.
 *
 * Metro is told to watch that folder in metro.config.js. This is the only file
 * that reaches outside mobile/, which keeps the relative paths in one place.
 */
export { STEPS, DEFAULT_POLLS } from "../../lib/steps";
export { AIRPORTS } from "../../lib/airports";
export { DESTINATIONS, type Destination } from "../../lib/destinations";
export { matchDestinations, type Match, type VisionInput } from "../../lib/match";
export {
  PRODUCT_NAME,
  LEGAL_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
  PLAN_PRICES,
  MAILING_ADDRESS,
  EFFECTIVE_DATE,
  PARTNERS,
  PROCESSORS,
} from "../../lib/legal";
