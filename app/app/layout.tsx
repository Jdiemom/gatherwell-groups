import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Groups by Gatherwell: Plan Group Trips Together, Save Together",
  description:
    "One subscription walks your whole group through every trip decision, step by step: dates, budget, flights, stays, and activities. Everyone votes. Nobody chases. Join the waitlist.",
  openGraph: {
    title: "Groups by Gatherwell",
    description:
      "Plan the group trip. Skip the group chaos. A guided, step-by-step way to plan group travel and keep the money big groups usually waste.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
