"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { CompanyLedger, LedgerMessage, LedgerSkeleton } from "@/components/scoutly/company-ledger";
import { DonutSkeleton, IndustryDonut, type Slice } from "@/components/scoutly/industry-donut";
import { Button } from "@/components/ui/button";
import { useCompanies, useIndustries } from "@/hooks/use-scoutly-data";
import { pluralise } from "@/lib/format";
import { OTHER, industryBucket, industryColour, industryOrder } from "@/lib/industries";
import type { IndustryCount } from "@/lib/types";
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

      <SelectedIndustry selected={selected} onClear={() => setSelected(null)} />
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
        {rows.map((row) => {
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
                  {/* A quiet length cue for comparing counts that a donut makes hard to judge. */}
                  <span aria-hidden="true" className="mt-2 block h-px bg-line">
                    <span
                      className="block h-px bg-ink-3 transition-[width] duration-300"
                      style={{ width: `${(row.count / largest) * 100}%` }}
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

function SelectedIndustry({ selected, onClear }: { selected: string | null; onClear: () => void }) {
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
          <motion.p
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 text-center text-sm text-ink-3"
          >
            Select a slice or an industry above to list its companies here.
          </motion.p>
        ) : (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="type-title flex items-center gap-3 text-2xl text-ink">
                <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ backgroundColor: industryColour(selected) }} />
                {selected}
                {shown && <span className="text-base font-normal text-ink-3">{pluralise(shown.length, "company", "companies")}</span>}
              </h2>
              <Button variant="ghost" size="sm" onClick={onClear} className="text-ink-2">
                Show all industries
              </Button>
            </div>

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
