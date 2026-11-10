"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import Magnet from "@/components/Magnet";
import { Corners, Hatch } from "@/components/scoutly/frame";
import { SlackReplica } from "@/components/scoutly/slack-replica";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { industryColour } from "@/lib/industries";

/*
 * The opening sheet: one calm promise on the left, the product doing its job
 * on the right. A real Slack-styled channel loops through a teammate asking
 * and Scoutly answering, so the hero shows rather than tells. Below it, a
 * strip of real company names the agent has already researched.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="h-20 sm:h-24" />
      <Hatch />

      <section aria-labelledby="hero-heading" className="mx-auto max-w-6xl">
        <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Corners />

          <div className="flex flex-col justify-between gap-12 px-4 py-14 sm:px-10 sm:py-20">
            <h1 id="hero-heading" className="type-hero text-[clamp(2.4rem,4.6vw,3.9rem)] text-ink">
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
              >
                Find the companies that move your business forward.
              </motion.span>
            </h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <p className="max-w-[40ch] text-lg leading-relaxed text-ink-2">
                Your next customers and design partners, found and qualified by an AI agent your team can
                ask in Slack.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnet padding={40} magnetStrength={7} disabled={!!reduceMotion}>
                  <Link
                    href="/companies"
                    className="inline-flex h-12 items-center rounded-full bg-signal px-6 font-semibold text-on-signal transition-opacity hover:opacity-90"
                  >
                    Explore your market
                  </Link>
                </Magnet>
                <Magnet padding={40} magnetStrength={7} disabled={!!reduceMotion}>
                  <a
                    href="#how"
                    className="inline-flex h-12 items-center rounded-full bg-raised px-6 font-medium text-ink transition-colors hover:bg-overlay"
                  >
                    How it works
                  </a>
                </Magnet>
              </div>
            </motion.div>
          </div>

          <div className="border-t border-line bg-raised/30 px-3 py-8 sm:px-8 sm:py-12 lg:border-l lg:border-t-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            >
              <SlackReplica />
            </motion.div>
          </div>
        </div>
      </section>

      <Hatch />
      <ResearchedStrip />
    </>
  );
}

/** Real names from the researched market, set like a row of customer logos. */
function ResearchedStrip() {
  const { companies } = useCompanies();
  const names = companies?.slice(0, 6) ?? [];

  return (
    <section aria-label="Companies already researched" className="mx-auto max-w-6xl">
      <div className="relative">
        <Corners />
        <p className="border-b border-line px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-3 sm:px-6">
          Already researched in the YC market
          {companies && <span className="text-ink-2"> · {companies.length} companies and counting</span>}
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {(names.length ? names : Array.from({ length: 6 }, () => null)).map((company, index) => (
            <li
              key={company?.id ?? index}
              className="flex h-24 items-center justify-center gap-2 border-b border-line px-4 text-center sm:border-r lg:border-b-0 [&:nth-child(6n)]:border-r-0"
            >
              {company ? (
                <>
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: industryColour(company.industry) }} />
                  <span className="type-title truncate text-lg text-ink-2">{company.name}</span>
                </>
              ) : (
                <span className="shimmer h-4 w-24 rounded opacity-40" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
