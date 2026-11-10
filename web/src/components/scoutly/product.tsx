// web/src/components/scoutly/product.tsx
import { Check, X } from "lucide-react";

import { Corners, Eyebrow, SectionTitle } from "@/components/scoutly/frame";
import { Logo } from "@/components/scoutly/logo";

/*
 * The pain, told as a contrast: the way a small GTM team prospects today next
 * to the way it does with Scoutly. Two cells of the same ruled sheet, so the
 * difference reads at a glance.
 */

const MANUAL = [
  "Twelve tabs of LinkedIn, Google and startup directories",
  "Funding news read one announcement at a time",
  "A spreadsheet nobody trusts by Friday",
  "No answer to “why this company, and why first?”",
];

const SCOUTLY = [
  "One question, asked in Slack",
  "Every company researched on the open web",
  "Checked against your ideal customer profile",
  "A ranked shortlist, with the reason each one fits",
];

export function Problem() {
  return (
    <section aria-labelledby="problem-heading" className="mx-auto max-w-6xl">
      <div className="px-4 pb-14 pt-24 sm:px-10">
        <Eyebrow>The problem</Eyebrow>
        <SectionTitle id="problem-heading" className="max-w-[20ch]">
          Hours of research. Still no idea who to call first.
        </SectionTitle>
      </div>

      <div className="relative grid border-t border-line md:grid-cols-2">
        <Corners />
        <div className="px-4 py-12 sm:px-10">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-3">Prospecting today</h3>
          <ul className="mt-7 space-y-5">
            {MANUAL.map((item) => (
              <li key={item} className="flex gap-3 text-lg text-ink-3">
                <X aria-hidden="true" className="mt-1 size-5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line bg-raised/40 px-4 py-12 sm:px-10 md:border-l md:border-t-0">
          <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-ink">
            <Logo className="size-4 text-signal" />
            Prospecting with Scoutly
          </h3>
          <ul className="mt-7 space-y-5">
            {SCOUTLY.map((item) => (
              <li key={item} className="flex gap-3 text-lg text-ink">
                <Check aria-hidden="true" className="mt-1 size-5 shrink-0 text-signal" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
