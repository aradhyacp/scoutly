import type { Metadata } from "next";
import { Archivo } from "next/font/google";

import { Providers } from "@/components/scoutly/providers";
import { SiteHeader } from "@/components/scoutly/site-header";

import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
