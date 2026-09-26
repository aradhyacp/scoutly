import type { Metadata } from "next";

import { IndustryBreakdown } from "@/components/scoutly/industry-breakdown";

export const metadata: Metadata = {
  title: "Industries",
};

export default function IndustriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <h1 className="type-display max-w-[16ch] text-[clamp(2.5rem,6vw,4.75rem)] text-ink">
        Where the shortlist is building.
      </h1>
      <p className="mt-6 max-w-[56ch] leading-relaxed text-ink-2">
        How the stored companies split across Y Combinator&rsquo;s industries. Healthcare, fintech,
        and the rest each keep one colour everywhere in Scoutly, so a company&rsquo;s industry reads the
        same in the list as it does here.
      </p>

      <div className="mt-14">
        <IndustryBreakdown />
      </div>
    </div>
  );
}
