"use client";

import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";

import Magnet from "@/components/Magnet";
import { AnimatedCount } from "@/components/scoutly/animated-count";
import { useCompanies } from "@/hooks/use-scoutly-data";

/*
 * The page's one orchestrated moment starts here: the headline rises out of a
 * mask, the count runs up, and the map below then fills in dot by dot. Threads
 * reads as topographic contour lines — a scout's map — drawn in a pale petrol
 * so the headline stays the thing you read. WebGL only runs in the browser, so
 * it is loaded client-side and the hero is fully legible before it arrives.
 */
const Threads = dynamic(() => import("@/components/Threads"), { ssr: false });

/** #8FB8BD — pale petrol, as the 0-1 RGB triple the shader expects. */
const CONTOUR: [number, number, number] = [0.56, 0.72, 0.74];

const EASE = [0.22, 1, 0.36, 1] as const;

function Rise({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const { companies, isLoading, error } = useCompanies();
  const count = companies?.length;
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
      <div className="absolute inset-0 -z-10 opacity-60">
        <Threads color={CONTOUR} amplitude={1.4} distance={0.1} enableMouseInteraction />
      </div>
      {/* Fades the lines into the plane so the map below starts clean. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-b from-transparent to-plane" />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-36 sm:px-6 sm:pb-20 sm:pt-48">
        <h1 id="hero-heading" className="type-display text-[clamp(2.75rem,8vw,6.25rem)] text-ink">
          <Rise delay={0.05}>
            {isLoading || count === undefined ? (
              error ? (
                "YC companies"
              ) : (
                <>
                  <span className="shimmer inline-block h-[0.8em] w-[1.6ch] translate-y-[0.08em] rounded-md align-baseline" />
                  <span className="sr-only">Loading</span> YC
                </>
              )
            ) : (
              <>
                <AnimatedCount value={count} /> YC
              </>
            )}
          </Rise>
          <Rise delay={0.15}>{count === 1 ? "company made" : "companies made"}</Rise>
          <Rise delay={0.25}>the shortlist.</Rise>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <p className="max-w-[52ch] text-base leading-relaxed text-ink-2 sm:text-lg">
            Every company here is based in the US or Europe, has 500 people or fewer, was founded in
            2015 or later, and makes under $200M a year. An AI agent researched each one before it
            was added.
          </p>

          <div className="flex shrink-0 flex-wrap gap-3">
            {/* reactbits Magnet: the buttons lean toward the pointer as it nears them. */}
            <Magnet padding={48} magnetStrength={7} disabled={!!reduceMotion}>
              <Link
                href="/companies"
                className="inline-flex h-12 items-center rounded-full bg-signal px-6 font-semibold text-on-signal transition-opacity hover:opacity-90"
              >
                Browse the companies
              </Link>
            </Magnet>
            <Magnet padding={48} magnetStrength={7} disabled={!!reduceMotion}>
              <a
                href="#map"
                className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-medium text-ink transition-colors hover:bg-raised"
              >
                See them on the map
              </a>
            </Magnet>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
