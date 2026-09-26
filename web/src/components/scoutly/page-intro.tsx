// web/src/components/scoutly/page-intro.tsx
"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";

/*
 * The inner pages' opening: the same contour lines as the landing hero, kept
 * fainter and shorter so the content below stays the point, and the heading
 * rising out of a mask the same way the hero's does.
 */
const Threads = dynamic(() => import("@/components/Threads"), { ssr: false });

const CONTOUR: [number, number, number] = [0.56, 0.72, 0.74];
const EASE = [0.22, 1, 0.36, 1] as const;

export function PageIntro({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  /** Optional live summary shown beside the text on wide screens. */
  aside?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-35">
        <Threads color={CONTOUR} amplitude={1} distance={0.05} />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-plane" />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-32 sm:px-6 sm:pt-40">
        <h1 className="type-display max-w-[18ch] overflow-hidden pb-[0.08em] text-[clamp(2.5rem,6vw,4.75rem)] text-ink">
          <motion.span
            className="block"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            {title}
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end"
        >
          <div className="max-w-[56ch] leading-relaxed text-ink-2">{children}</div>
          {aside}
        </motion.div>
      </div>
    </section>
  );
}
