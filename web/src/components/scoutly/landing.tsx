// web/src/components/scoutly/landing.tsx
"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CompanyDialog } from "@/components/scoutly/company-dialog";
import { CompanyLedger, LedgerMessage, LedgerSkeleton } from "@/components/scoutly/company-ledger";
import { GlowFrame } from "@/components/scoutly/glow-frame";
import { TerritoryMap, type Rule } from "@/components/scoutly/territory-map";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { formatUsd } from "@/lib/format";
import { NAMED_INDUSTRIES, OTHER, industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ map -- */

export function ShortlistMap() {
  const { companies, error, isLoading, retry } = useCompanies();
  const [activeRule, setActiveRule] = useState<Rule | null>(null);
  const [open, setOpen] = useState<Company | null>(null);

  const facts = useMemo(() => {
    if (!companies?.length) return null;
    const reported = companies.filter((c) => !c.revenueIsEstimate);
    return {
      us: companies.filter((c) => c.region === "United States").length,
      europe: companies.filter((c) => c.region === "Europe").length,
      largestTeam: Math.max(...companies.map((c) => c.teamSize)),
      newest: Math.max(...companies.map((c) => c.foundedYear)),
      oldest: Math.min(...companies.map((c) => c.foundedYear)),
      topReported: reported.length ? Math.max(...reported.map((c) => c.annualRevenueUsd)) : null,
    };
  }, [companies]);

  const rules: { key: Rule; title: string; fact: string | null }[] = [
    {
      key: "region",
      title: "Based in the US or Europe",
      fact: facts && `${facts.us} in the US, ${facts.europe} in Europe`,
    },
    {
      key: "team",
      title: "500 people or fewer",
      fact: facts && `The largest team here has ${facts.largestTeam}. Bigger dots are bigger teams.`,
    },
    {
      key: "founded",
      title: "Founded in 2015 or later",
      fact: facts && `The left edge of the map. Founding years run ${facts.oldest} to ${facts.newest}.`,
    },
    {
      key: "revenue",
      title: "Under $200M a year",
      fact:
        facts &&
        (facts.topReported !== null
          ? `The ceiling of the map. The highest reported revenue is ${formatUsd(facts.topReported)}.`
          : "The ceiling of the map."),
    },
  ];

  return (
    <section id="map" aria-labelledby="map-heading" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="lg:col-span-2">
          <h2 id="map-heading" className="type-title max-w-[20ch] text-[clamp(2rem,4.5vw,3.25rem)] text-ink">
            The edges of the map are the bar.
          </h2>
          <p className="mt-5 max-w-[60ch] leading-relaxed text-ink-2">
            Each dot is a company, placed by the year it was founded and what it makes a year. Nothing
            on the list can sit left of 2015 or above $200M. Hover a dot to see who it is, or open it
            for the full record.
          </p>
        </div>

        <div className="min-w-0">
          {error && !companies ? (
            <LedgerMessage title="Couldn't load the map" action={<Button variant="outline" onClick={retry}>Try again</Button>}>
              {error.message}
            </LedgerMessage>
          ) : isLoading || !companies ? (
            <div role="status" aria-label="Loading the map" className="shimmer h-[440px] rounded-xl opacity-40" />
          ) : companies.length === 0 ? (
            <LedgerMessage title="The map is empty">
              Run the enrichment pipeline to add companies. Each one appears here as a dot.
            </LedgerMessage>
          ) : (
            <GlowFrame className="rounded-2xl">
              <div className="rounded-2xl border border-line bg-raised/25 px-2 pb-2 pt-4 sm:px-4">
                <TerritoryMap companies={companies} activeRule={activeRule} onOpen={setOpen} />
              </div>
            </GlowFrame>
          )}

          <MapLegend />
        </div>

        {/* The four rules double as the map's key: point at one to light its edge. */}
        <div>
          <h3 className="text-sm font-semibold text-ink">To make the list, a company has to be</h3>
          <ul className="mt-4 border-t border-line" onPointerLeave={() => setActiveRule(null)}>
            {rules.map((rule) => (
              <li key={rule.key} className="border-b border-line">
                <button
                  type="button"
                  onPointerEnter={() => setActiveRule(rule.key)}
                  onFocus={() => setActiveRule(rule.key)}
                  onBlur={() => setActiveRule(null)}
                  className={cn(
                    "relative block w-full py-4 pl-4 pr-2 text-left transition-colors",
                    activeRule === rule.key ? "text-ink" : "text-ink-2 hover:text-ink",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-3 left-0 w-0.5 rounded-full bg-signal transition-opacity",
                      activeRule === rule.key ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="block font-medium text-ink">{rule.title}</span>
                  {rule.fact && <span className="mt-1 block text-sm leading-snug text-ink-3">{rule.fact}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <CompanyDialog company={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function MapLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 pl-0 text-xs text-ink-2 sm:pl-16">
      <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Industry colours">
        {[...NAMED_INDUSTRIES, OTHER].map((name) => (
          <li key={name} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: industryColour(name) }} />
            {name}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-4 text-ink-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-ink-2" />
          Reported revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full border-[1.5px] border-ink-2" />
          Estimated
        </span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ pipeline -- */

const STEPS = [
  {
    title: "Pulled from YC’s directory",
    body: "A scraper reads Y Combinator’s public company index and keeps companies in the US or Europe, with 500 people or fewer, from a 2015 batch or later.",
  },
  {
    title: "Researched by an agent",
    body: "An AI agent reads the web for each one: where it’s really based, when it was founded, who it sells to, its funding rounds, and its revenue.",
  },
  {
    title: "Checked against the cap",
    body: "Anything making $200M a year or more is dropped, and so is anything the research places outside the US or Europe. Dropped companies are never stored.",
  },
  {
    title: "Added to the list",
    body: "What’s left is saved and shows up here. When no revenue figure is published, the agent estimates one and it’s marked as an estimate.",
  },
];

export function Pipeline() {
  return (
    <section aria-labelledby="pipeline-heading" className="border-y border-line bg-raised/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <h2 id="pipeline-heading" className="type-title max-w-[22ch] text-[clamp(2rem,4.5vw,3.25rem)] text-ink">
          How a company gets on the list.
        </h2>

        {/*
          A genuine sequence, so it is numbered and joined by a rail. When it scrolls into view the
          rail draws once and each step fades in as the rail reaches it. The words never move.
        */}
        <motion.ol
          className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-8"
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.span
            aria-hidden="true"
            className="absolute left-[15px] top-4 bottom-4 w-px origin-top bg-line-strong md:left-4 md:right-4 md:top-[15px] md:bottom-auto md:h-px md:w-auto md:origin-left"
            variants={{ hidden: { scaleX: 0, scaleY: 0 }, shown: { scaleX: 1, scaleY: 1 } }}
            transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          />
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-4 md:block"
              variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.22 }}
            >
              <span className="figures relative grid size-8 place-items-center rounded-full border border-line-strong bg-plane text-sm font-semibold text-ink">
                {index + 1}
              </span>
              <div className="md:mt-6">
                <h3 className="type-title text-xl text-ink">{step.title}</h3>
                <p className="mt-3 max-w-[40ch] text-[0.95rem] leading-relaxed text-ink-2">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- preview -- */

export function TopCompanies() {
  const { companies, error, isLoading, retry } = useCompanies();

  const top = useMemo(
    () => (companies ?? []).filter((c) => !c.revenueIsEstimate).sort((a, b) => b.annualRevenueUsd - a.annualRevenueUsd).slice(0, 5),
    [companies],
  );

  if (companies && top.length === 0) return null;

  return (
    <section aria-labelledby="top-heading" className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="top-heading" className="type-title text-[clamp(2rem,4.5vw,3.25rem)] text-ink">
            Highest reported revenue.
          </h2>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-ink-2">
            The five biggest companies on the list with a published figure. Select one to see its funding history.
          </p>
        </div>
        {companies && (
          <Link
            href="/companies"
            className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-sm font-medium text-ink transition-colors hover:bg-raised"
          >
            See all {companies.length} companies
          </Link>
        )}
      </div>

      {error && !companies ? (
        <LedgerMessage title="Couldn't load the companies" action={<Button variant="outline" onClick={retry}>Try again</Button>}>
          {error.message}
        </LedgerMessage>
      ) : isLoading || !companies ? (
        <LedgerSkeleton rows={5} />
      ) : (
        <CompanyLedger companies={top} />
      )}
    </section>
  );
}
