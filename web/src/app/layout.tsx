import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { Rails } from "@/components/scoutly/frame";
import { Providers } from "@/components/scoutly/providers";
import { SiteFooter } from "@/components/scoutly/site-footer";
import { SiteHeader } from "@/components/scoutly/site-header";
import { getInitialData } from "@/lib/server/companies";

import "./globals.css";

/*
 * The table only changes when the enrichment pipeline runs, so rendering it
 * fresh on every request bought nothing and cost a Postgres round trip each
 * time. Five minutes means at most one query per route per five minutes, no
 * matter how many people are reading.
 */
export const revalidate = 300;

/*
 * One family, used on its width axis: expanded for display, normal for
 * reading. The width axis is opt-in with next/font, hence `axes`.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

/*
 * Social cards need absolute URLs. NEXT_PUBLIC_SITE_URL wins when set (a custom
 * domain); otherwise Vercel's production domain, and localhost in development.
 * The card itself is the opengraph-image.jpg / twitter-image.jpg beside this file.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const TITLE = "Scoutly · Find the companies that move your business forward";
const DESCRIPTION =
  "AI-powered B2B prospecting for growing teams. Scoutly researches companies, qualifies them against your ideal customer profile, and delivers a shortlist of customers, design partners and strategic partners in Slack, Teams and beyond.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: TITLE, template: "%s | Scoutly" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Scoutly",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read once, here, and seed the client cache with it: every page below shares
  // these two keys, so the whole site boots with its data already in hand.
  const initial = await getInitialData();
  const fallback = initial
    ? {
        "/api/companies": { companies: initial.companies },
        "/api/industries": { total: initial.total, industries: initial.industries },
      }
    : undefined;

  return (
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers fallback={fallback}>
          <SiteHeader />
          <main className="relative isolate flex-1">
            <Rails />
            <div className="relative">{children}</div>
          </main>
          <SiteFooter />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
