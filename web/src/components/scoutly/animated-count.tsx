"use client";

import { useReducedMotion } from "motion/react";

import CountUp from "@/components/CountUp";

/**
 * A number that counts up once on load.
 *
 * reactbits' CountUp writes its value straight into the DOM, starting from 0,
 * so a screen reader landing mid-animation would hear the wrong number. The
 * animated digits are hidden from assistive tech and the real value is given
 * as text beside them. Under reduced motion it simply renders the value.
 */
export function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <span className={className}>{value}</span>;

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        <CountUp to={value} duration={1.4} />
      </span>
    </span>
  );
}
