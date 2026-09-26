// web/src/components/scoutly/industry-mix.tsx
"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

import { OTHER, industryBucket, industryColour, industryOrder } from "@/lib/industries";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The list's make-up as one bar, split by industry. It is also a filter:
 * pressing a segment (or its label) narrows the list to that industry, and
 * pressing it again clears it. The segments grow in from the left on load.
 */
export function IndustryMix({
  companies,
  selected,
  onSelect,
}: {
  companies: Company[];
  selected: string | null;
  onSelect: (bucket: string | null) => void;
}) {
  const buckets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const company of companies) {
      const bucket = industryBucket(company.industry);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => industryOrder(a.key) - industryOrder(b.key));
  }, [companies]);

  const total = companies.length;
  const toggle = (key: string) => onSelect(selected === key ? null : key);

  return (
    <div>
      <div className="flex h-3 w-full gap-[3px]" aria-hidden="true">
        {buckets.map((bucket, index) => (
          <motion.button
            key={bucket.key}
            type="button"
            tabIndex={-1}
            onClick={() => toggle(bucket.key)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1, opacity: selected && selected !== bucket.key ? 0.25 : 1 }}
            transition={{ scaleX: { duration: 0.7, delay: 0.3 + index * 0.06, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
            className="h-full origin-left rounded-full transition-[height] hover:h-4"
            style={{ flexGrow: bucket.count, flexBasis: 0, backgroundColor: industryColour(bucket.key) }}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-1 gap-y-1" aria-label="Filter by industry">
        {buckets.map((bucket) => {
          const active = selected === bucket.key;
          return (
            <li key={bucket.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(bucket.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-overlay text-ink" : "text-ink-2 hover:bg-raised hover:text-ink",
                )}
              >
                <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: industryColour(bucket.key) }} />
                {bucket.key === OTHER ? "Other" : bucket.key}
                <span className="figures text-ink-3">{Math.round((bucket.count / total) * 100)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
