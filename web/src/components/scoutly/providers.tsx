"use client";

import { MotionConfig } from "motion/react";
import { SWRConfig } from "swr";

import { TooltipProvider } from "@/components/ui/tooltip";

/** Reads from our own Route Handlers only — the browser never sees the database. */
async function fetchJson(url: string) {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Request to ${url} failed with ${response.status}.`);
  }
  return body;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // reducedMotion="user" turns off transform and layout animation for people
    // who ask their OS for less motion, across every motion component at once.
    <MotionConfig reducedMotion="user">
      <SWRConfig
        value={{
          fetcher: fetchJson,
          revalidateOnFocus: false,
          // Hold the last good data while revalidating instead of flashing a skeleton.
          keepPreviousData: true,
        }}
      >
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </SWRConfig>
    </MotionConfig>
  );
}
