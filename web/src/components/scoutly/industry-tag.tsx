import { industryColour } from "@/lib/industries";
import { cn } from "@/lib/utils";

/**
 * An industry's name with its chart colour beside it. The swatch carries
 * identity *alongside* the name, never instead of it — text stays in ink.
 */
export function IndustryTag({ industry, className }: { industry: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink-2", className)}>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-[2px]"
        style={{ backgroundColor: industryColour(industry) }}
      />
      {industry}
    </span>
  );
}

/** B2B / B2C, as the words themselves. A company can be both. */
export function MarketTags({ isB2b, isB2c }: { isB2b: boolean; isB2c: boolean }) {
  const markets = [isB2b && "B2B", isB2c && "B2C"].filter(Boolean) as string[];
  if (markets.length === 0) return <span className="text-ink-3">—</span>;

  return (
    <span className="inline-flex gap-1">
      {markets.map((market) => (
        <span
          key={market}
          className="rounded-sm border border-line-strong px-1.5 py-px text-xs font-medium text-ink-2"
        >
          {market}
        </span>
      ))}
    </span>
  );
}
