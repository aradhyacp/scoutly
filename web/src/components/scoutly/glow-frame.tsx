// web/src/components/scoutly/glow-frame.tsx
"use client";

import { useReducedMotion } from "motion/react";

import { GlowingEffect } from "@/components/GlowingEffect";
import { cn } from "@/lib/utils";

/**
 * A rounded frame whose border lights up in pale petrol near the cursor
 * (aceternity GlowingEffect). The glow sits outside the frame's own clipping,
 * so frames that use overflow-hidden for their corners keep it.
 */
export function GlowFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative rounded-xl", className)}>
      <GlowingEffect disabled={!!reduceMotion} glow={false} proximity={96} spread={48} inactiveZone={0.01} borderWidth={2} movementDuration={1.2} />
      {children}
    </div>
  );
}
