"use client";

import dynamic from "next/dynamic";

import { AnimatedCount } from "@/components/scoutly/animated-count";
import { useCompanies } from "@/hooks/use-scoutly-data";

/*
 * The one loud element on the site. Threads reads as topographic contour lines
 * — a scout's map — drawn in a pale petrol so the headline stays the thing you
 * read. WebGL only runs in the browser, so it is loaded client-side and the
 * hero is fully legible before it arrives.
 */
const Threads = dynamic(() => import("@/components/Threads"), { ssr: false });

/** #8FB8BD — pale petrol, as the 0-1 RGB triple the shader expects. */
const CONTOUR: [number, number, number] = [0.56, 0.72, 0.74];

export function Hero() {
  const { companies, isLoading, error } = useCompanies();
  const count = companies?.length;

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      <div className="absolute inset-0 -z-10 opacity-60">
        <Threads color={CONTOUR} amplitude={1.4} distance={0.1} enableMouseInteraction />
      </div>
      {/* Fades the lines into the plane so the list below starts clean. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-plane" />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-36 sm:px-6 sm:pb-24 sm:pt-44">
        <h1 id="hero-heading" className="type-display max-w-[14ch] text-[clamp(2.75rem,8vw,6.5rem)] text-ink">
          {isLoading || count === undefined ? (
            error ? (
              "YC companies that made the shortlist."
            ) : (
              <>
                <span className="shimmer inline-block h-[0.8em] w-[1.6ch] translate-y-[0.08em] rounded-md align-baseline" />
                <span className="sr-only">Loading</span> YC companies made the shortlist.
              </>
            )
          ) : (
            <>
              <AnimatedCount value={count} /> YC {count === 1 ? "company" : "companies"} made the shortlist.
            </>
          )}
        </h1>

        <p className="mt-8 max-w-[58ch] text-base leading-relaxed text-ink-2 sm:text-lg">
          Every company here is based in the US or Europe, has 500 people or fewer, was founded in
          2015 or later, and makes under $200M a year. An AI agent researched each one before it
          was added.
        </p>
      </div>
    </section>
  );
}
