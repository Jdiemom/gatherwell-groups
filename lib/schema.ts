/**
 * Structured data (JSON-LD). This is the machine-readable version of the
 * homepage: it tells Google, and increasingly AI assistants, what this business
 * is, what the product is, and what it costs.
 *
 * Rule to keep: every claim here must match something a visitor can actually see
 * on the page. Never add ratings or reviews we have not received.
 */

import {
  ADDRESS_PARTS,
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  LEGAL_NAME,
  PLAN_PRICES,
  PRODUCT_NAME,
  SITE_URL,
} from "./legal";

const ORG_ID = `${SITE_URL}/#organization`;

export function homepageSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: LEGAL_NAME,
        alternateName: PRODUCT_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/groups-logo.png`,
        image: `${SITE_URL}/opengraph-image.png`,
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE_HREF,
        address: {
          "@type": "PostalAddress",
          streetAddress: ADDRESS_PARTS.street,
          addressLocality: ADDRESS_PARTS.city,
          addressRegion: ADDRESS_PARTS.region,
          postalCode: ADDRESS_PARTS.postalCode,
          addressCountry: ADDRESS_PARTS.country,
        },
        sameAs: [
          "https://gatherwelltravel.com",
          "https://apps.apple.com/us/app/gatherwell-travel/id6762874183",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: PRODUCT_NAME,
        publisher: { "@id": ORG_ID },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: PRODUCT_NAME,
        url: SITE_URL,
        applicationCategory: "TravelApplication",
        applicationSubCategory: "Group trip planning",
        operatingSystem: "Web browser",
        provider: { "@id": ORG_ID },
        description:
          "A guided nine-step method, built by working travel advisors, that walks a whole group through every trip decision: dates, budget, destination, flights, stays, activities, itinerary and payments. Everyone votes, each step produces a document the group keeps, and the supplier rates and advisory team of a real travel agency sit behind it.",
        featureList: [
          "Date availability polling across the whole group",
          "Anonymous budget voting with tie detection",
          "Destination matching against the group's answers",
          "Flight buying-window guidance",
          "Group stay and villa comparison",
          "Activity voting",
          "Day-by-day itinerary builder with printable output",
          "Payment schedules split across travelers",
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: Math.min(...PLAN_PRICES.map((p) => p.amount)).toFixed(2),
          highPrice: Math.max(...PLAN_PRICES.map((p) => p.amount)).toFixed(2),
          offerCount: PLAN_PRICES.length,
          offers: PLAN_PRICES.map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            price: plan.amount.toFixed(2),
            priceCurrency: "USD",
            category: "subscription",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/#pricing`,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: plan.amount.toFixed(2),
              priceCurrency: "USD",
              billingDuration: 1,
              billingIncrement: 1,
              unitCode: "MON",
            },
          })),
        },
      },
    ],
  };
}
