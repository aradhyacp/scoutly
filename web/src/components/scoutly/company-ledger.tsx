"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { CompanyDialog, companyLayoutId } from "@/components/scoutly/company-dialog";
import { IndustryTag, MarketTags } from "@/components/scoutly/industry-tag";
import { GlowFrame } from "@/components/scoutly/glow-frame";
import { Revenue } from "@/components/scoutly/revenue";
import { city } from "@/lib/format";
import { industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * A ledger rather than a grid of cards: these companies are meant to be
 * compared, and comparing means scanning a column. Each row is a button that
 * grows into the company's full record.
 */

const GRID = "md:grid md:grid-cols-[minmax(0,2.3fr)_minmax(0,1.3fr)_3.5rem_4rem_6.5rem_6rem_7rem] md:items-center md:gap-4";

/** Revenue as a 0-1 share of the $200M cap on a log scale, so $1M and $100M are both visible. */
function revenueShare(value: number) {
  const floor = Math.log10(100_000);
  return Math.min(1, Math.max(0.04, (Math.log10(Math.max(value, 100_000)) - floor) / (Math.log10(200_000_000) - floor)));
}

export function CompanyLedger({ companies, dimmed = false }: { companies: Company[]; dimmed?: boolean }) {
  const [open, setOpen] = useState<Company | null>(null);

  return (
    <>
      {/* One frame around the header and rows; rows are divided by hairlines inside it. */}
      <GlowFrame>
        <div className="overflow-hidden rounded-xl border border-line bg-raised/25">
          <div
            aria-hidden="true"
            className={cn(GRID, "hidden border-b border-line bg-raised/60 px-4 py-3 text-xs text-ink-3 md:grid")}
          >
            <span className="pl-[3.375rem]">Company</span>
            <span>Based in</span>
            <span className="text-right">Team</span>
            <span>Founded</span>
            <span>YC batch</span>
            <span>Sells to</span>
            <span className="text-right">Revenue</span>
          </div>

          {/* While a refetch runs, hold the rows at lower opacity rather than flashing a skeleton. */}
          <ul className={cn("divide-y divide-line transition-opacity duration-200", dimmed && "opacity-50")}>
            {companies.map((company) => (
              <li key={company.id}>
                <motion.button
                  type="button"
                  layoutId={companyLayoutId(company)}
                  onClick={() => setOpen(company)}
                  // Radius set as a style so motion can animate it into the dialog's corners without stretching.
                  style={{ borderRadius: 0 }}
                  className={cn(
                    GRID,
                    "group relative flex w-full flex-col gap-1.5 px-4 py-4 text-left transition-colors hover:bg-raised focus-visible:-outline-offset-2 md:py-3.5",
                  )}
                >
                  {/* On hover the row picks up its industry's colour along the left edge. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: industryColour(company.industry) }}
                  />
                  <span className="flex min-w-0 items-center justify-between gap-4 md:block">
                    <span className="flex min-w-0 items-center gap-3.5">
                      <Monogram name={company.name} industry={company.industry} />
                      <span className="block min-w-0">
                        <span className="block truncate font-semibold text-ink">{company.name}</span>
                        <IndustryTag industry={company.industry} className="mt-0.5 text-sm" />
                      </span>
                    </span>
                    {/* Mobile keeps revenue beside the name; desktop gives it its own column. */}
                    <Revenue
                      value={company.annualRevenueUsd}
                      estimate={company.revenueIsEstimate}
                      interactive={false}
                      className="figures shrink-0 md:hidden"
                    />
                  </span>

                  <span className="truncate text-sm text-ink-2">
                    {city(company.primaryLocation)}
                    {company.country && <span className="text-ink-3">, {company.country}</span>}
                  </span>

                  {/* Mobile has no columns, so the two years share a line under the location. */}
                  <span className="text-sm text-ink-3 md:hidden">
                    Founded <span className="figures">{company.foundedYear}</span>, YC {company.batch}
                  </span>

                  <span className="figures hidden text-right text-sm text-ink-2 md:block">
                    {company.teamSize}
                    <span className="sr-only"> people</span>
                  </span>

                  <span className="figures hidden text-sm text-ink-2 md:block">{company.foundedYear}</span>

                  {/* The batch is when they went through YC, which can differ from when they were founded. */}
                  <span className="hidden truncate text-sm text-ink-2 md:block">{company.batch}</span>

                  <span className="hidden md:block">
                    <MarketTags isB2b={company.isB2b} isB2c={company.isB2c} />
                  </span>

                  <span className="hidden md:block">
                    <Revenue
                      value={company.annualRevenueUsd}
                      estimate={company.revenueIsEstimate}
                      interactive={false}
                      className="figures block text-right"
                    />
                    <RevenueBar value={company.annualRevenueUsd} estimate={company.revenueIsEstimate} />
                  </span>
                </motion.button>
              </li>
            ))}
          </ul>
        </div>
      </GlowFrame>

      <CompanyDialog company={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** The company's initial on a tile tinted with its industry colour: a quick visual anchor per row. */
export function Monogram({ name, industry, className }: { name: string; industry: string; className?: string }) {
  const colour = industryColour(industry);
  return (
    <span
      aria-hidden="true"
      className={cn("type-title grid size-10 shrink-0 place-items-center rounded-lg text-base", className)}
      style={{
        color: colour,
        backgroundColor: `color-mix(in oklab, ${colour} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${colour} 30%, transparent)`,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/*
 * Revenue against the $200M cap. Reported figures are a solid bar; estimates
 * are striped, the bar's version of the tilde.
 */
function RevenueBar({ value, estimate }: { value: number; estimate: boolean }) {
  return (
    <span aria-hidden="true" className="ml-auto mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-line">
      <span
        className="ml-auto block h-full rounded-full"
        style={{
          width: `${revenueShare(value) * 100}%`,
          background: estimate
            ? "repeating-linear-gradient(90deg, var(--ink-3) 0 3px, transparent 3px 5px)"
            : "var(--ink-2)",
        }}
      />
    </span>
  );
}

export function LedgerSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading companies" className="overflow-hidden rounded-xl border border-line bg-raised/25">
      <div className={cn(GRID, "hidden border-b border-line bg-raised/60 px-4 py-3.5 md:grid")}>
        {[40, 30, 20, 30, 40, 30, 30].map((width, index) => (
          <span key={index} className="shimmer h-2.5 rounded" style={{ width: `${width}%` }} />
        ))}
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className={cn(GRID, "flex flex-col gap-2 px-4 py-4")}>
            <span className="flex items-center gap-3.5">
              <span className="shimmer size-10 shrink-0 rounded-lg" />
              <span className="block flex-1">
                <span className="shimmer block h-3.5 rounded" style={{ width: `${55 + ((index * 17) % 35)}%` }} />
                <span className="shimmer mt-2 block h-2.5 w-1/3 rounded" />
              </span>
            </span>
            <span className="shimmer block h-3 w-2/3 rounded" />
            <span className="shimmer hidden h-3 w-8 justify-self-end rounded md:block" />
            <span className="shimmer hidden h-3 w-10 rounded md:block" />
            <span className="shimmer hidden h-3 w-16 rounded md:block" />
            <span className="shimmer hidden h-4 w-10 rounded md:block" />
            <span className="shimmer hidden h-3 w-14 justify-self-end rounded md:block" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading companies</span>
    </div>
  );
}

export function LedgerMessage({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-raised/25 px-4 py-16 text-center">
      <p className="type-title text-xl text-ink">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-ink-2">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
