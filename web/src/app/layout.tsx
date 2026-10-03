import type { Metadata } from "next";
import { Archivo } from "next/font/google";

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

export const metadata: Metadata = {
  title: { default: "Scoutly", template: "%s | Scoutly" },
  description:
    "Y Combinator companies that pass the bar: US or Europe, 500 people or fewer, founded 2015 or later, under $200M in revenue.",
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
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
