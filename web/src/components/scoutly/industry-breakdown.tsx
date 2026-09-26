"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { CompanyLedger, LedgerMessage, LedgerSkeleton, Monogram } from "@/components/scoutly/company-ledger";
import { GlowFrame } from "@/components/scoutly/glow-frame";
import { Revenue } from "@/components/scoutly/revenue";
import { DonutSkeleton, IndustryDonut, type Slice } from "@/components/scoutly/industry-donut";
import { Button } from "@/components/ui/button";
import { useCompanies, useIndustries } from "@/hooks/use-scoutly-data";
import { formatUsd } from "@/lib/format";
import { OTHER, industryBucket, industryColour, industryOrder } from "@/lib/industries";
import type { Company, IndustryCount } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Selection is by *bucket*: a named industry selects itself, and any industry
 * folded into Other selects Other on the chart while its own row stays marked
 * in the list. So both "click a slice" and "click a row" land on the same
 * state, and the chart and list can never disagree.
 */

export function IndustryBreakdown() {
  const { data, error, isLoading, retry } = useIndustries();
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const rows = useMemo(() => data?.industries ?? [], [data]);

  // Named industries keep their own slice; the rest fold into one Other.
  const slices = useMemo<Slice[]>(() => {
    const buckets = new Map<string, number>();
    for (const row of rows) {
      const bucket = industryBucket(row.industry);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + row.count);
    }
    return [...buckets.entries()]
      .map(([key, count]) => ({ key, label: key, count, colour: industryColour(key) }))
      .sort((a, b) => industryOrder(a.key) - industryOrder(b.key));
  }, [rows]);

  const selectedBucket = selected ? industryBucket(selected) : null;
  const highlightedBucket = highlighted ? industryBucket(highlighted) : null;

  function toggle(industry: string) {
    setSelected((current) => (current === industry ? null : industry));
  }

  if (error && !data) {
    return (
      <LedgerMessage
        title="Couldn't load the industries"
        action={
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        }
      >
        {error.message}
      </LedgerMessage>
    );
  }

  return (
    <>
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-16">
        {isLoading || !data ? (
          <DonutSkeleton />
        ) : data.total === 0 ? (
          <LedgerMessage title="No companies yet">
            Once the pipeline stores some companies, their industries show up here.
          </LedgerMessage>
        ) : (
          <IndustryDonut
            slices={slices}
            total={data.total}
            selected={selectedBucket}
            highlighted={highlightedBucket}
            // A slice click selects the bucket; for Other that is Other itself.
            onSelect={(bucket) => toggle(bucket)}
            onHighlight={setHighlighted}
          />
        )}

        <IndustryList
          rows={rows}
          total={data?.total ?? 0}
          loading={isLoading || !data}
          selected={selected}
          onSelect={toggle}
          onHighlight={setHighlighted}
        />
      </div>

      <SelectedIndustry selected={selected} onSelect={setSelected} onClear={() => setSelected(null)} />
    </>
  );
}

/**
 * The chart's table twin: every value the donut shows, readable without it,
 * and the keyboard path into the same selection. Focusing a row lights the
 * slice exactly as hovering it would.
 */
function IndustryList({
  rows,
  total,
  loading,
  selected,
  onSelect,
  onHighlight,
}: {
  rows: IndustryCount[];
  total: number;
  loading: boolean;
  selected: string | null;
  onSelect: (industry: string) => void;
  onHighlight: (industry: string | null) => void;
}) {
  if (loading) {
    return (
      <ul aria-hidden="true" className="space-y-1">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="flex items-center justify-between gap-4 px-3 py-3">
            <span className="shimmer h-3.5 rounded" style={{ width: `${30 + ((index * 23) % 40)}%` }} />
            <span className="shimmer h-3.5 w-12 rounded" />
          </li>
        ))}
      </ul>
    );
  }

  const largest = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div>
      <h2 className="type-title text-2xl text-ink">By industry</h2>
      <p className="mt-2 text-sm text-ink-2">Pick an industry to see its companies.</p>

      <ul className="mt-6 space-y-0.5" onPointerLeave={() => onHighlight(null)}>
        {rows.map((row, index) => {
          const isSelected = selected === row.industry;
          const share = total ? Math.round((row.count / total) * 100) : 0;
          const folded = industryBucket(row.industry) === OTHER;

          return (
            <li key={row.industry}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(row.industry)}
                onPointerEnter={() => onHighlight(row.industry)}
                onFocus={() => onHighlight(row.industry)}
                onBlur={() => onHighlight(null)}
                className={cn(
                  "group relative grid w-full grid-cols-[minmax(0,1fr)_2.5rem_3rem] items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                  isSelected ? "bg-raised" : "hover:bg-raised/60",
                )}
              >
                {/* Selection is marked by the amber rail, not by colour alone: aria-pressed too. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-2 left-0 w-0.5 rounded-full bg-signal transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2.5 text-ink">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: industryColour(row.industry) }}
                    />
                    <span className="truncate">{row.industry}</span>
                    {folded && <span className="shrink-0 text-xs text-ink-3">in Other</span>}
                  </span>
                  {/* A length cue for comparing counts that a donut makes hard to judge. */}
                  <span aria-hidden="true" className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className="block h-full origin-left rounded-full"
                      style={{ width: `${(row.count / largest) * 100}%`, backgroundColor: industryColour(row.industry) }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 + index * 0.05 }}
                    />
                  </span>
                </span>
                <span className="figures text-right text-ink">{row.count}</span>
                <span className="figures text-right text-sm text-ink-3">{share}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SelectedIndustry({
  selected,
  onSelect,
  onClear,
}: {
  selected: string | null;
  onSelect: (industry: string) => void;
  onClear: () => void;
}) {
  // Named industries are filtered by the API; Other spans several, so it takes
  // the full list and filters here.
  const isOther = selected === OTHER;
  const { companies, error, isLoading, isValidating, retry } = useCompanies(selected && !isOther ? selected : null);

  const shown = useMemo(() => {
    if (!selected || !companies) return companies;
    return isOther ? companies.filter((company) => industryBucket(company.industry) === OTHER) : companies;
  }, [companies, selected, isOther]);

  return (
    <section aria-live="polite" className="mt-16 border-t border-line pt-10">
      <AnimatePresence mode="wait" initial={false}>
        {!selected ? (
          <motion.div key="leaders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IndustryLeaders onSelect={onSelect} />
          </motion.div>
        ) : (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 className="type-display flex items-center gap-4 text-[clamp(2rem,4.5vw,3.25rem)] text-ink">
                <span aria-hidden="true" className="size-4 shrink-0 rounded-[4px]" style={{ backgroundColor: industryColour(selected) }} />
                {selected}
              </h2>
              <Button variant="outline" onClick={onClear} className="h-10 rounded-full px-4 text-ink-2">
                Show all industries
              </Button>
            </div>

            {shown && shown.length > 0 && <IndustryFacts companies={shown} colour={industryColour(selected)} />}

            {error && !companies ? (
              <LedgerMessage title="Couldn't load these companies" action={<Button variant="outline" onClick={retry}>Try again</Button>}>
                {error.message}
              </LedgerMessage>
            ) : isLoading || !shown ? (
              <LedgerSkeleton rows={3} />
            ) : (
              <CompanyLedger companies={shown} dimmed={isValidating && !isLoading} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** A strip of plain figures about the chosen industry, above its list. */
function IndustryFacts({ companies, colour }: { companies: Company[]; colour: string }) {
  const teams = companies.map((c) => c.teamSize).sort((a, b) => a - b);
  const median = teams[Math.floor(teams.length / 2)]!;
  const us = companies.filter((c) => c.region === "United States").length;
  const europe = companies.filter((c) => c.region === "Europe").length;
  const combined = companies.reduce((sum, c) => sum + c.annualRevenueUsd, 0);
  const reported = companies.filter((c) => !c.revenueIsEstimate).length;

  const facts = [
    { label: "Companies", value: String(companies.length), note: `${us} in the US, ${europe} in Europe` },
    { label: "Typical team", value: `${median} people`, note: `Median. The largest has ${teams[teams.length - 1]}.` },
    { label: "Combined revenue", value: formatUsd(combined), note: `${reported} of ${companies.length} figures reported, the rest estimated` },
  ];

  return (
    <GlowFrame className="mb-8">
      <dl
        className="grid overflow-hidden rounded-xl border border-line sm:grid-cols-3"
        style={{ backgroundImage: `linear-gradient(120deg, color-mix(in oklab, ${colour} 14%, transparent), transparent 60%)` }}
      >
        {facts.map((fact) => (
          <div key={fact.label} className="border-line px-5 py-5 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r">
            <dt className="text-sm text-ink-2">{fact.label}</dt>
            <dd className="type-title mt-2 text-3xl text-ink">{fact.value}</dd>
            <dd className="mt-1.5 text-xs leading-snug text-ink-3">{fact.note}</dd>
          </div>
        ))}
      </dl>
    </GlowFrame>
  );
}

/**
 * Before anything is picked, the space under the chart shows the biggest
 * company in each industry, so the page has something to read and each row is
 * a way in.
 */
function IndustryLeaders({ onSelect }: { onSelect: (industry: string) => void }) {
  const { companies } = useCompanies();

  const leaders = useMemo(() => {
    const best = new Map<string, Company>();
    for (const company of companies ?? []) {
      const bucket = industryBucket(company.industry);
      const current = best.get(bucket);
      if (!current || company.annualRevenueUsd > current.annualRevenueUsd) best.set(bucket, company);
    }
    return [...best.entries()].sort(([a], [b]) => industryOrder(a) - industryOrder(b));
  }, [companies]);

  if (!companies) return <LedgerSkeleton rows={3} />;
  if (leaders.length === 0) return null;

  return (
    <div>
      <h2 className="type-title text-2xl text-ink">The biggest in each industry</h2>
      <p className="mt-2 text-sm text-ink-2">By annual revenue. Pick one to see the rest of its industry.</p>

      {/* The list tucks 1px under the frame, so the last row's divider never doubles its bottom edge. */}
      <GlowFrame className="mt-6">
        <div className="overflow-hidden rounded-xl border border-line">
          <ul className="-mb-px grid md:grid-cols-2">
            {leaders.map(([bucket, company]) => (
              <li key={bucket} className="border-b border-line md:odd:border-r">
                <button
                  type="button"
                  onClick={() => onSelect(bucket)}
                  className="group relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-raised"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: industryColour(bucket) }}
                  />
                  <Monogram name={company.name} industry={company.industry} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{company.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-ink-2">
                      <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: industryColour(bucket) }} />
                      {bucket}
                    </span>
                  </span>
                  <Revenue
                    value={company.annualRevenueUsd}
                    estimate={company.revenueIsEstimate}
                    interactive={false}
                    className="figures shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </GlowFrame>
    </div>
  );
}
