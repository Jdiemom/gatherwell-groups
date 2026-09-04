import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

/**
 * Tells crawlers what to read and what to leave alone.
 * The marketing and policy pages are public. Everything behind sign-in is not:
 * those pages are private to a group and would be worthless in search anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/app", "/app/", "/join/", "/login", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
