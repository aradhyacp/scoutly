// web/src/components/scoutly/feature-steps.tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Eyebrow, SectionTitle } from "@/components/scoutly/frame";
import { Logo } from "@/components/scoutly/logo";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { industryColour } from "@/lib/industries";
import { cn } from "@/lib/utils";

/*
 * What Scoutly finds, as a stepper: the open step expands with its story and a
 * call to action while the others stay as one-line promises. It advances on
 * its own, pauses while you are reading (pointer or focus inside), and the
 * card on the right swaps to that step's example. Real researched companies
 * orbit the card as initials, so the scene sits on the actual market.
 */

const DURATION = 6500;

type Step = {
  tag: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  card: { label: string; text: string; figure: string | null; figureLabel: string };
};

const STEPS: Step[] = [
  {
    tag: "Design partners",
    title: "Find the teams who'll build it with you",
    body: "Scoutly looks for companies that feel the problem you solve, move fast, and are small enough to give real feedback on early builds. Each comes with the reason it fits.",
    cta: { label: "Find design partners", href: "/companies" },
    card: {
      label: "Design partner match",
      text: "Ships regulated payment flows and has no compliance tooling yet. 25 people, decisions made by the founders.",
      figure: "12",
      figureLabel: "design partners in fintech",
    },
  },
  {
    tag: "Customers",
    title: "Reach the companies that already fit your ICP",
    body: "Describe your ideal customer by industry, region, size, stage and business model. Scoutly researches every company and keeps only the ones that match.",
    cta: { label: "Explore the market", href: "/companies" },
    card: {
      label: "ICP match",
      text: "B2B financial software selling to banks, 38 people, raised a seed round this year.",
      figure: "30",
      figureLabel: "ICP matches in the US",
    },
  },
  {
    tag: "Strategic partners",
    title: "Find who already sells to your buyers",
    body: "Complementary products with shared customers make the best integration and distribution partners. Scoutly surfaces them before your competitors call.",
    cta: { label: "Browse by industry", href: "/industries" },
    card: {
      label: "Partner match",
      text: "Adjacent compliance product with the same buyer. A natural integration that opens both customer lists.",
      figure: "9",
      figureLabel: "integration partners",
    },
  },
  {
    tag: "Early adopters",
    title: "Start with the teams that try things first",
    body: "Young companies that just raised and are still building their stack are the ones most likely to pilot something new this quarter.",
    cta: { label: "Find early adopters", href: "/companies" },
    card: {
      label: "Pilot candidate",
      text: "Raised a Series A last quarter, hiring its first platform team, nothing in place yet.",
      figure: "18",
      figureLabel: "teams that raised this year",
    },
  },
  {
    tag: "Market entry",
    title: "Map a market before you spend on it",
    body: "See who is actually in a region or industry, how big they are and who they sell to, before you commit a single GTM dollar.",
    cta: { label: "See the market map", href: "#map" },
    card: {
      label: "Market snapshot",
      text: "Every company researched for funding, revenue, region and business model, so you can size the market first.",
      figure: null,
      figureLabel: "companies researched in the YC market",
    },
  },
];

const ORBIT = [
  { top: "10%", left: "14%", delay: "0s" },
  { top: "22%", left: "84%", delay: "1.2s" },
  { top: "70%", left: "6%", delay: "2.1s" },
  { top: "82%", left: "70%", delay: "0.6s" },
  { top: "4%", left: "58%", delay: "1.7s" },
];

export function FeatureSteps() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const { companies } = useCompanies();

  const auto = !paused && !reduceMotion;

  useEffect(() => {
    if (!auto) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % STEPS.length), DURATION);
    return () => clearTimeout(id);
  }, [auto, active]);

  const step = STEPS[active];
  const figure = step.card.figure ?? (companies ? String(companies.length) : "—");
  const orbiters = (companies ?? []).slice(6, 6 + ORBIT.length);

  return (
    <section aria-labelledby="finds-heading" className="mx-auto max-w-6xl px-4 py-24 sm:px-10">
      <Eyebrow>What Scoutly finds</Eyebrow>
      <SectionTitle id="finds-heading" className="max-w-[20ch]">
        Who to sell to, partner with, and build with.
      </SectionTitle>

      <div className="mt-16 grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol
          className="space-y-7"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {STEPS.map((item, index) => {
            const open = index === active;
            return (
              <li key={item.tag} className="relative pl-6">
                {/* The rail: dim for closed steps, filling over the open step's time. */}
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-line-strong" />
                {open && (
                  <motion.span
                    key={`${active}-${auto}`}
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 left-0 w-0.5 origin-top rounded-full bg-ink"
                    initial={{ height: auto ? "0%" : "100%" }}
                    animate={{ height: "100%" }}
                    transition={{ duration: auto ? DURATION / 1000 : 0, ease: "linear" }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-expanded={open}
                  className="block w-full text-left"
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm",
                      open ? "border-line-strong bg-raised text-ink" : "border-line text-ink-3",
                    )}
                  >
                    <span className="figures text-ink-3">0{index + 1}</span>
                    {item.tag}
                  </span>
                  <span className={cn("mt-2.5 block text-xl leading-snug transition-colors sm:text-2xl", open ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
                    {item.title}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="mt-3 max-w-[48ch] leading-relaxed text-ink-2">{item.body}</p>
                      <Link
                        href={item.cta.href}
                        className="mt-5 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-plane transition-opacity hover:opacity-90"
                      >
                        {item.cta.label}
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        {/* The scene: a field of survey points, the example card, and real companies orbiting it. */}
        <div className="relative isolate h-[420px] sm:h-[480px]" aria-hidden="true">
          <div className="dot-field absolute inset-0 -z-10" />

          {orbiters.map((company, index) => (
            <span
              key={company.id}
              className="bob absolute grid size-12 place-items-center rounded-full border-[3px] border-ink/90 text-base font-bold text-white shadow-lg shadow-black/40"
              style={{
                top: ORBIT[index].top,
                left: ORBIT[index].left,
                animationDelay: ORBIT[index].delay,
                backgroundColor: industryColour(company.industry),
              }}
              title={company.name}
            >
              {company.name.charAt(0)}
            </span>
          ))}

          <div className="absolute inset-x-4 top-1/2 mx-auto max-w-[440px] -translate-y-1/2 rounded-[1.6rem] border border-line-strong bg-overlay/70 p-2.5 shadow-2xl shadow-black/40 backdrop-blur-sm sm:inset-x-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="rounded-[1.2rem] bg-ink p-6 text-plane"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-full bg-plane text-signal">
                      <Logo className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">Scoutly</span>
                      <span className="block text-xs text-plane/60">
                        {step.card.figure ? "Example · " : "Live · "}
                        {step.card.label}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-plane/5 px-2.5 py-1 text-xs font-medium text-[#1164a3]">
                    <span className="size-1.5 rounded-full bg-[#1164a3]" />
                    {step.tag}
                  </span>
                </div>
                <p className="mt-4 leading-relaxed text-plane/85">{step.card.text}</p>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="type-title figures text-4xl">{figure}</span>
                  <span className="text-sm text-plane/60">{step.card.figureLabel}</span>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
