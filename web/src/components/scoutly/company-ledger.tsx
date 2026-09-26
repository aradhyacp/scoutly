"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { CompanyDialog, companyLayoutId } from "@/components/scoutly/company-dialog";
import { IndustryTag, MarketTags } from "@/components/scoutly/industry-tag";
import { Revenue } from "@/components/scoutly/revenue";
import { city, shortBatch } from "@/lib/format";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * A ledger rather than a grid of cards: these companies are meant to be
 * compared, and comparing means scanning a column. Each row is a button that
 * grows into the company's full record.
 */

const GRID = "md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_4.5rem_5.5rem_6.5rem_6.5rem] md:items-center md:gap-4";

export function CompanyLedger({ companies, dimmed = false }: { companies: Company[]; dimmed?: boolean }) {
  const [open, setOpen] = useState<Company | null>(null);

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(GRID, "hidden border-b border-line px-4 pb-3 text-xs text-ink-3 md:grid")}
      >
        <span>Company</span>
        <span>Based in</span>
        <span className="text-right">Team</span>
        <span>Founded</span>
        <span>Sells to</span>
        <span className="text-right">Revenue</span>
      </div>

      {/* While a refetch runs, hold the rows at lower opacity rather than flashing a skeleton. */}
      <ul className={cn("transition-opacity duration-200", dimmed && "opacity-50")}>
        {companies.map((company) => (
          <li key={company.id} className="border-b border-line last:border-b-0">
            <motion.button
              type="button"
              layoutId={companyLayoutId(company)}
              onClick={() => setOpen(company)}
              className={cn(
                GRID,
                "group flex w-full flex-col gap-1.5 rounded-lg px-4 py-4 text-left transition-colors hover:bg-raised md:py-3.5",
              )}
            >
              <span className="flex min-w-0 items-baseline justify-between gap-4 md:block">
                <span className="block min-w-0">
                  <span className="block truncate font-semibold text-ink">{company.name}</span>
                  <IndustryTag industry={company.industry} className="mt-0.5 text-sm" />
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

              <span className="figures hidden text-right text-sm text-ink-2 md:block">
                {company.teamSize}
                <span className="sr-only"> people</span>
              </span>

              <span className="hidden text-sm text-ink-2 md:block">
                <span className="figures">{company.foundedYear}</span>
                <span className="ml-1.5 text-ink-3" title={company.batch}>
                  {shortBatch(company.batch)}
                </span>
              </span>

              <span className="hidden md:block">
                <MarketTags isB2b={company.isB2b} isB2c={company.isB2c} />
              </span>

              <Revenue
                value={company.annualRevenueUsd}
                estimate={company.revenueIsEstimate}
                interactive={false}
                className="figures hidden text-right md:block"
              />
            </motion.button>
          </li>
        ))}
      </ul>

      <CompanyDialog company={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function LedgerSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading companies">
      <div className={cn(GRID, "hidden border-b border-line px-4 pb-3 md:grid")}>
        {[40, 30, 20, 30, 30, 30].map((width, index) => (
          <span key={index} className="shimmer h-2.5 rounded" style={{ width: `${width}%` }} />
        ))}
      </div>
      <ul>
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className={cn(GRID, "flex flex-col gap-2 border-b border-line px-4 py-4")}>
            <span className="block">
              <span className="shimmer block h-3.5 rounded" style={{ width: `${55 + ((index * 17) % 35)}%` }} />
              <span className="shimmer mt-2 block h-2.5 w-1/3 rounded" />
            </span>
            <span className="shimmer block h-3 w-2/3 rounded" />
            <span className="shimmer hidden h-3 w-8 justify-self-end rounded md:block" />
            <span className="shimmer hidden h-3 w-12 rounded md:block" />
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
    <div className="border-y border-line px-4 py-16 text-center">
      <p className="type-title text-xl text-ink">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-ink-2">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
