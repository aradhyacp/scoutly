"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatUsd, spokenUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Annual revenue, and — this is the point — whether anyone actually reported
 * it. Most early-stage companies publish nothing, so the agent estimates from
 * headcount, stage, and funding. An estimate shown with the same confidence as
 * a filed number would be the most misleading thing on the page, so the two
 * are drawn differently: estimates get a tilde, quieter ink, and a dotted
 * underline that opens the explanation.
 */
export function Revenue({
  value,
  estimate,
  className,
  interactive = true,
}: {
  value: number;
  estimate: boolean;
  className?: string;
  /**
   * False inside another control (a ledger row is a button): a focusable
   * tooltip nested in a button is an invalid, confusing tab stop. The
   * explanation is then carried by the key above the list instead.
   */
  interactive?: boolean;
}) {
  if (!estimate) {
    return (
      <span className={cn("text-ink", className)}>
        <span aria-hidden="true">{formatUsd(value)}</span>
        <span className="sr-only">{spokenUsd(value)}, reported</span>
      </span>
    );
  }

  const estimated = (
    <>
      <span aria-hidden="true">~{formatUsd(value)}</span>
      <span className="sr-only">about {spokenUsd(value)}, estimated</span>
    </>
  );

  if (!interactive) {
    return <span className={cn("text-ink-2", className)}>{estimated}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "cursor-help rounded-sm text-ink-2 underline decoration-ink-3 decoration-dotted underline-offset-4",
            className,
          )}
        >
          {estimated}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-pretty">
        No published figure. The agent estimated this from team size, stage, and funding.
      </TooltipContent>
    </Tooltip>
  );
}
