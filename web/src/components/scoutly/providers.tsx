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

/**
 * `fallback` is the server-rendered data, keyed by the same URLs the hooks ask
 * for. SWR treats it as already-fetched, so the first paint has the real
 * numbers instead of a skeleton.
 */
export function Providers({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: Record<string, unknown>;
}) {
  return (
    // reducedMotion="user" turns off transform and layout animation for people
    // who ask their OS for less motion, across every motion component at once.
    <MotionConfig reducedMotion="user">
      <SWRConfig
        value={{
          fetcher: fetchJson,
          fallback: fallback ?? {},
          revalidateOnFocus: false,
          // The server already rendered this data and it only changes when the
          // enrichment pipeline runs, so re-fetching it the moment the page
          // mounts would spend a round trip to learn nothing. Keys with no
          // seeded data — the per-industry list — still fetch normally.
          revalidateIfStale: false,
          // Hold the last good data while revalidating instead of flashing a skeleton.
          keepPreviousData: true,
        }}
      >
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </SWRConfig>
    </MotionConfig>
  );
}
