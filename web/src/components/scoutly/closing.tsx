// web/src/components/scoutly/closing.tsx
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

import { Corners } from "@/components/scoutly/frame";
import { Logo } from "@/components/scoutly/logo";
import { useCompanies } from "@/hooks/use-scoutly-data";

/*
 * The page's two backdrop moments. The horizon is the one photograph on the
 * page: open country under a sky of data, for the statement that YC is only
 * where Scoutly starts. The closing banner is a halftone screen over the same
 * contour lines the rest of the site uses, with the call to action set in
 * its corners.
 */

const Threads = dynamic(() => import("@/components/Threads"), { ssr: false });

export function Horizon() {
  const { companies } = useCompanies();

  return (
    <section aria-labelledby="horizon-heading" className="mx-auto max-w-6xl">
      <div className="relative isolate min-h-[560px] overflow-hidden sm:min-h-[620px]">
        <Image
          src="/horizon.jpg"
          alt=""
          fill
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="-z-10 object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-plane via-plane/55 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-plane/70 to-transparent" />
        <Corners />

        {companies && (
          <p className="absolute right-5 top-5 rounded-full border border-white/25 bg-black/30 px-3.5 py-1.5 text-sm text-white backdrop-blur-md sm:right-8 sm:top-8">
            <span className="figures font-semibold">{companies.length}</span> companies researched so far
          </p>
        )}

        <div className="absolute inset-x-0 bottom-0 px-5 pb-10 sm:px-10 sm:pb-14">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-ink-2">Your starting market</p>
          <h2 id="horizon-heading" className="type-hero max-w-[16ch] text-[clamp(2.2rem,5vw,4rem)] text-ink">
            YC is where Scoutly starts. Not where it stops.
          </h2>
          <p className="mt-5 max-w-[56ch] leading-relaxed text-ink-2">
            Y Combinator&rsquo;s portfolio is one of the densest pools of fast-moving companies anywhere: buyers,
            early adopters, design partners and integration partners in every industry. Scoutly researches
            them first so you can start today. More ecosystems are on the way.
          </p>
        </div>
      </div>
    </section>
  );
}

/** #8FB8BD at low strength, so the halftone reads as texture rather than a picture. */
const CONTOUR: [number, number, number] = [0.42, 0.52, 0.54];

export function ClosingBanner() {
  return (
    <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="relative isolate overflow-hidden border border-line-strong bg-[#11191d]">
        <div aria-hidden="true" className="absolute inset-0 -z-20">
          <Threads color={CONTOUR} amplitude={1.6} distance={0.2} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_75%_30%,rgb(143_184_189/0.22),transparent_60%)]" />
        <div aria-hidden="true" className="halftone absolute inset-0 -z-10" />

        <div className="flex min-h-[420px] flex-col justify-between gap-16 p-6 sm:min-h-[460px] sm:p-10">
          <span className="flex items-center gap-3 text-ink">
            <Logo className="size-14 sm:size-16" />
            <span className="type-display text-4xl sm:text-5xl">Scoutly</span>
          </span>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="cta-heading" className="type-hero max-w-[16ch] text-[clamp(2.4rem,5.6vw,4.4rem)] text-ink">
                Ready to meet your next customers?
              </h2>
              <p className="mt-5 max-w-[52ch] text-ink-2">
                Fewer irrelevant leads, more conversations that matter. Scoutly qualifies the opportunity. The
                handshake is still yours.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href="/companies"
                className="inline-flex h-12 items-center bg-signal px-6 font-semibold text-on-signal transition-opacity hover:opacity-90"
              >
                Start with the YC market
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center bg-plane px-6 font-medium text-ink transition-colors hover:bg-raised"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
