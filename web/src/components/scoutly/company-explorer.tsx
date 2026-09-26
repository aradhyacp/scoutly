"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CompanyLedger, LedgerMessage, LedgerSkeleton } from "@/components/scoutly/company-ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { pluralise } from "@/lib/format";
import { industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";

type Market = "all" | "b2b" | "b2c";
type Sort = "revenue" | "name" | "newest" | "team";

const ANY = "any";

const SORTS: Record<Sort, { label: string; compare: (a: Company, b: Company) => number }> = {
  revenue: { label: "Highest revenue", compare: (a, b) => b.annualRevenueUsd - a.annualRevenueUsd },
  name: { label: "Name", compare: (a, b) => a.name.localeCompare(b.name) },
  newest: { label: "Newest", compare: (a, b) => b.foundedYear - a.foundedYear || a.name.localeCompare(b.name) },
  team: { label: "Largest team", compare: (a, b) => b.teamSize - a.teamSize },
};

export function CompanyExplorer() {
  const { companies, error, isLoading, isValidating, retry } = useCompanies();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>(ANY);
  const [industry, setIndustry] = useState<string>(ANY);
  const [market, setMarket] = useState<Market>("all");
  const [sort, setSort] = useState<Sort>("revenue");

  const industries = useMemo(
    () => [...new Set((companies ?? []).map((company) => company.industry))].sort(),
    [companies],
  );
  const regions = useMemo(
    () => [...new Set((companies ?? []).map((company) => company.region))].filter((r) => r !== "Unknown").sort(),
    [companies],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (companies ?? [])
      .filter((company) => !needle || company.name.toLowerCase().includes(needle))
      .filter((company) => region === ANY || company.region === region)
      .filter((company) => industry === ANY || company.industry === industry)
      .filter((company) => market === "all" || (market === "b2b" ? company.isB2b : company.isB2c))
      .sort(SORTS[sort].compare);
  }, [companies, query, region, industry, market, sort]);

  const filtered = query.trim() !== "" || region !== ANY || industry !== ANY || market !== "all";
  const hasEstimates = visible.some((company) => company.revenueIsEstimate);

  function clearFilters() {
    setQuery("");
    setRegion(ANY);
    setIndustry(ANY);
    setMarket("all");
  }

  return (
    <section aria-labelledby="companies-heading" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <h2 id="companies-heading" className="sr-only">
        Companies
      </h2>

      {/* One filter row, above everything it scopes. Sticks while you scroll the list. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-plane/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <label htmlFor="company-search" className="sr-only">
              Search companies by name
            </label>
            <Input
              id="company-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              className="h-9 bg-raised pl-9"
              autoComplete="off"
            />
          </div>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger aria-label="Filter by region" className="h-9 w-auto min-w-[9rem] bg-raised">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any region</SelectItem>
              {regions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger aria-label="Filter by industry" className="h-9 w-auto min-w-[10rem] bg-raised">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All industries</SelectItem>
              {industries.map((name) => (
                <SelectItem key={name} value={name}>
                  <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: industryColour(name) }} />
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={market}
            onValueChange={(value) => value && setMarket(value as Market)}
            aria-label="Filter by who they sell to"
            className="h-9 rounded-md bg-raised p-0.5"
            spacing={0}
          >
            <ToggleGroupItem value="all" className="h-8 px-3 text-sm data-[state=on]:bg-overlay data-[state=on]:text-ink">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="b2b" className="h-8 px-3 text-sm data-[state=on]:bg-overlay data-[state=on]:text-ink">
              B2B
            </ToggleGroupItem>
            <ToggleGroupItem value="b2c" className="h-8 px-3 text-sm data-[state=on]:bg-overlay data-[state=on]:text-ink">
              B2C
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="ml-auto flex items-center gap-2">
            <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
              <SelectTrigger aria-label="Sort companies" className="h-9 w-auto min-w-[9.5rem] bg-raised">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(SORTS) as Sort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORTS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-ink-3">
          <p aria-live="polite">
            {companies
              ? filtered
                ? `${visible.length} of ${pluralise(companies.length, "company", "companies")}`
                : pluralise(companies.length, "company", "companies")
              : " "}
            {filtered && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-3 inline-flex items-center gap-1 rounded text-ink-2 hover:text-ink"
              >
                <X className="size-3" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </p>
          {hasEstimates && (
            <p>
              <span className="text-ink-2 underline decoration-ink-3 decoration-dotted underline-offset-4">~$20M</span>{" "}
              is an estimate. The agent found no published figure.
            </p>
          )}
        </div>
      </div>

      <div className="mt-2">
        {error && !companies ? (
          <LedgerMessage
            title="Couldn't load the companies"
            action={
              <Button variant="outline" onClick={retry}>
                Try again
              </Button>
            }
          >
            {error.message} Try again in a moment.
          </LedgerMessage>
        ) : isLoading || !companies ? (
          <LedgerSkeleton />
        ) : companies.length === 0 ? (
          <LedgerMessage title="No companies yet">
            Run the enrichment pipeline to research and add companies. They appear here as soon as they&rsquo;re written.
          </LedgerMessage>
        ) : visible.length === 0 ? (
          <LedgerMessage
            title="Nothing matches these filters"
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          >
            Try a different name, or widen the region, industry, or market.
          </LedgerMessage>
        ) : (
          <CompanyLedger companies={visible} dimmed={isValidating && !isLoading} />
        )}
      </div>
    </section>
  );
}
