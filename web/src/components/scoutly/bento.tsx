// web/src/components/scoutly/bento.tsx
"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";

import { SectionTitle } from "@/components/scoutly/frame";
import { GlowFrame } from "@/components/scoutly/glow-frame";
import { Logo } from "@/components/scoutly/logo";
import { MarketGlobe } from "@/components/scoutly/market-globe";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { formatUsd } from "@/lib/format";
import { industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * What you get, as a bento: two rows of uneven cards, each with a short title
 * and a picture of the thing itself bleeding off its edge. The record card and
 * the region counts come from the live data; the rest are illustrations.
 */

function Card({ title, body, className, children, top = true }: {
  title: string;
  body: string;
  className?: string;
  children: React.ReactNode;
  /** Text above the picture (true) or below it. */
  top?: boolean;
}) {
  const text = (
    <div className="px-7 pt-7 sm:px-8">
      <h3 className="text-xl font-medium text-ink">{title}</h3>
      <p className="mt-2 max-w-[44ch] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
  return (
    <GlowFrame className={cn("rounded-3xl", className)}>
      <div className="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border border-line bg-raised/60">
        {top && text}
        <div className="relative flex-1">{children}</div>
        {!top && <div className="pb-7">{text}</div>}
      </div>
    </GlowFrame>
  );
}

/* Ask once: question, agent, shortlist, joined by a wire. */
function AskFlow() {
  return (
    <div className="flex h-full items-center justify-center px-6 pb-4 pt-10" aria-hidden="true">
      <div className="relative flex w-full max-w-[560px] items-stretch justify-between gap-3">
        <svg className="absolute inset-x-0 top-1/2 -z-0 h-px w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
          <line x1="0" y1="0.5" x2="100" y2="0.5" stroke="var(--line-strong)" strokeDasharray="1.5 1.5" />
        </svg>
        <div className="relative flex aspect-square flex-1 flex-col justify-center rounded-2xl border border-line bg-plane p-4 font-mono text-[11px] leading-relaxed text-ink-2 shadow-xl shadow-black/30">
          <span className="text-ink-3">@Scoutly</span>
          find 30 fintech design partners, US, &lt; 50 people
        </div>
        <div className="relative grid aspect-square flex-1 place-items-center rounded-2xl border border-line bg-plane shadow-xl shadow-black/30">
          <span className="grid size-14 place-items-center rounded-2xl bg-signal text-on-signal">
            <Logo className="size-8" />
          </span>
        </div>
        <div className="relative flex aspect-square flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-plane p-4 text-center shadow-xl shadow-black/30">
          <span className="type-title text-3xl text-ink">30</span>
          <span className="text-xs text-ink-2">matches, ranked</span>
          <span className="mt-1 flex items-center gap-1 text-[11px] text-signal">
            <Check className="size-3" /> ready in Slack
          </span>
        </div>
      </div>
    </div>
  );
}

/* A real researched record, bleeding off the bottom-right corner. */
function RecordPeek({ company }: { company: Company | null }) {
  const rows = company
    ? [
        ["Industry", company.industry],
        ["Team", `${company.teamSize} people`],
        ["Region", company.region],
        ["Founded", String(company.foundedYear)],
        ["Model", [company.isB2b && "B2B", company.isB2c && "B2C"].filter(Boolean).join(" + ") || "Unknown"],
        ["Revenue", `${company.revenueIsEstimate ? "~" : ""}${formatUsd(company.annualRevenueUsd)}${company.revenueIsEstimate ? " est." : ""}`],
        ["Raised", company.totalRaisedUsd ? formatUsd(company.totalRaisedUsd) : "Undisclosed"],
      ]
    : [];

  return (
    <div className="absolute -bottom-6 left-7 right-[-2rem] top-8 rounded-tl-2xl border border-line-strong bg-plane p-5 shadow-2xl shadow-black/40 sm:left-8">
      {company ? (
        <>
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: industryColour(company.industry) }} />
            <span className="font-semibold text-ink">{company.name}</span>
            <span className="text-xs text-ink-3">{company.batch}</span>
          </p>
          <dl className="mt-4 divide-y divide-line text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="text-ink-3">{label}</dt>
                <dd className="truncate text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="shimmer h-full rounded-xl opacity-40" />
      )}
    </div>
  );
}

/* The ICP as a settings panel, bleeding off the bottom-right corner. */
function IcpPanel() {
  const rows: [string, string, boolean][] = [
    ["Geography", "United States, Europe", true],
    ["Team size", "Under 50 people", true],
    ["Industry", "Fintech, Insurance", true],
    ["Funding stage", "Seed to Series A", true],
    ["Business model", "B2B", true],
    ["Buying signal", "Raised in the last 6 months", false],
    ["Looking for", "Design partners", true],
  ];
  return (
    <div className="absolute -bottom-6 left-7 right-[-2rem] top-8 rounded-tl-2xl border border-line-strong bg-plane shadow-2xl shadow-black/40 sm:left-8" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="text-sm font-semibold text-ink">Ideal customer profile</span>
        <span className="mr-10 rounded-full bg-signal/10 px-2.5 py-0.5 text-xs text-signal">Fintech design partners</span>
      </div>
      <div className="divide-y divide-line">
        {rows.map(([label, value, on]) => (
          <div key={label} className="flex items-center gap-4 px-5 py-2.5 text-sm">
            <span className="w-32 shrink-0 text-ink-3">{label}</span>
            <span className="flex-1 truncate text-ink">{value}</span>
            <span className={cn("mr-10 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors", on ? "bg-signal" : "bg-overlay")}>
              <span className={cn("block size-4 rounded-full bg-plane transition-transform", on && "translate-x-4")} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bento() {
  const { companies } = useCompanies();

  const featured = useMemo(
    () => companies?.find((c) => c.totalRaisedUsd && !c.revenueIsEstimate) ?? companies?.[0] ?? null,
    [companies],
  );
  const regions = useMemo(
    () =>
      companies && {
        us: companies.filter((c) => c.region === "United States").length,
        europe: companies.filter((c) => c.region === "Europe").length,
      },
    [companies],
  );

  return (
    <section id="features" aria-labelledby="bento-heading" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-10">
      <div className="text-center">
        <SectionTitle id="bento-heading">Prospecting, made easy.</SectionTitle>
        <p className="mt-4 text-ink-2">Ask in plain English. Leave the research to Scoutly.</p>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-12">
        <Card
          className="lg:col-span-7"
          top={false}
          title="Ask once, get a shortlist"
          body="Describe who you're looking for the way you'd brief a colleague. Scoutly replies with a ranked list, not a spreadsheet to sort."
        >
          <AskFlow />
        </Card>

        <Card
          className="lg:col-span-5"
          title="Researched, not scraped"
          body="Every company is read on the open web: funding, revenue, region, who it sells to. Estimates are always marked."
        >
          <div className="h-[300px] lg:h-full">
            <RecordPeek company={featured} />
          </div>
        </Card>

        <Card
          className="lg:col-span-5"
          title="Starting in the US and Europe"
          body={
            regions
              ? `${regions.us} companies in the US and ${regions.europe} in Europe are researched and ready to search today.`
              : "Researched companies across the US and Europe, ready to search today."
          }
        >
          <div className="relative h-[320px] overflow-hidden lg:h-full">
            <div className="absolute inset-x-[-15%] -bottom-[45%] top-0">
              <MarketGlobe />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-raised/80" />
          </div>
        </Card>

        <Card
          className="lg:col-span-7"
          title="Your ICP, your rules"
          body="A cybersecurity startup and a fintech startup shouldn't share a definition of a good lead. Set yours, and Scoutly qualifies against it."
        >
          <div className="h-[340px] lg:h-full">
            <IcpPanel />
          </div>
        </Card>
      </div>
    </section>
  );
}
