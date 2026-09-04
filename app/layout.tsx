import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import FeedbackWidget from "./components/FeedbackWidget";
import { LEGAL_NAME, PRODUCT_NAME, SITE_URL } from "@/lib/legal";

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const DESCRIPTION =
  "The group trip planner built by working travel advisors. Nine guided steps take your group from dates and budget to flights, stays and a final itinerary, with real supplier rates behind every one. From $19 a month.";

export const metadata: Metadata = {
  // Makes every relative URL below resolve to the www domain, and stops
  // groupsbygatherwell.com and www.groupsbygatherwell.com competing in search.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Groups by Gatherwell: Plan Group Trips Together, Save Together",
    template: "%s · Groups by Gatherwell",
  },
  description: DESCRIPTION,
  applicationName: PRODUCT_NAME,
  keywords: [
    "group trip planner",
    "plan a group trip",
    "group travel planning",
    "group trip date poll",
    "split payments group trip",
    "group villa booking",
    "family reunion trip planning",
  ],
  authors: [{ name: LEGAL_NAME, url: "https://gatherwelltravel.com" }],
  creator: LEGAL_NAME,
  publisher: LEGAL_NAME,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: "Plan the group trip. Skip the chaos.",
    description: DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: PRODUCT_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan the group trip. Skip the chaos.",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
