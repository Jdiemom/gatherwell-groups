import type { MetadataRoute } from "next";
import { SITE_URL, EFFECTIVE_DATE } from "@/lib/legal";

/**
 * The list of pages we want indexed. Google finds pages on its own eventually,
 * but a sitemap is how you tell it directly, and it is what you submit in
 * Search Console. Add a line here whenever a new public page ships.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const policyDate = new Date(EFFECTIVE_DATE);
  const legalLastMod = isNaN(policyDate.valueOf()) ? new Date() : policyDate;

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: legalLastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: legalLastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/refunds`,
      lastModified: legalLastMod,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
