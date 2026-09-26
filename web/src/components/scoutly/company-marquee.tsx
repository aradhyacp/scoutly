// web/src/components/scoutly/company-marquee.tsx
"use client";

import { useReducedMotion } from "motion/react";
import { useMemo } from "react";

import ScrollVelocity from "@/components/ScrollVelocity";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";

/*
 * Two bands of the real company names drifting in opposite directions, faster
 * while you scroll (reactbits ScrollVelocity). Each name carries its industry
 * swatch. It repeats names already on the page, so it is hidden from assistive
 * tech, and it holds still for anyone who asks for reduced motion.
 */
export function CompanyMarquee() {
  const { companies } = useCompanies();
  const reduceMotion = useReducedMotion();

  const rows = useMemo(() => {
    if (!companies?.length) return null;
    const half = Math.ceil(companies.length / 2);
    return [companies.slice(0, half), companies.slice(half)];
  }, [companies]);

  if (!rows) return <div className="h-40" aria-hidden="true" />;

  return (
    <div aria-hidden="true" className="select-none border-y border-line py-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <ScrollVelocity
        texts={rows.map((row, index) => <Band key={index} companies={row} outlined={index % 2 === 1} />)}
        velocity={reduceMotion ? 0 : 36}
        numCopies={3}
        className="type-display text-[clamp(1.75rem,4.5vw,3.5rem)] leading-[1.25]"
        scrollerStyle={{ filter: "none" }}
      />
    </div>
  );
}

function Band({ companies, outlined }: { companies: Company[]; outlined: boolean }) {
  return (
    <span className="inline-flex items-center">
      {companies.map((company) => (
        <span key={company.id} className="inline-flex items-center">
          <span
            className={outlined ? "text-transparent [-webkit-text-stroke:1px_var(--ink-3)]" : "text-ink"}
          >
            {company.name}
          </span>
          <span
            className="mx-[0.5em] inline-block size-[0.28em] rounded-[0.06em]"
            style={{ backgroundColor: industryColour(company.industry) }}
          />
        </span>
      ))}
    </span>
  );
}
