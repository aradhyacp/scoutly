import type { Metadata } from "next";

import { IndustryBreakdown } from "@/components/scoutly/industry-breakdown";
import { PageIntro } from "@/components/scoutly/page-intro";

export const metadata: Metadata = {
  title: "Industries",
};

export default function IndustriesPage() {
  return (
    <>
      <PageIntro title="Where the shortlist is building.">
        <p>
          How the companies split across Y Combinator&rsquo;s industries. Each industry keeps one colour
          everywhere in Scoutly, so it reads the same in the list as it does here.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <IndustryBreakdown />
      </div>
    </>
  );
}
