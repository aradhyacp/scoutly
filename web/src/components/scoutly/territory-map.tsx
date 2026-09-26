// web/src/components/scoutly/territory-map.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatUsd } from "@/lib/format";
import { industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The shortlist as a territory. Each company is a dot placed by the year it
 * was founded (x) and what it makes a year (y, log scale), sized by team.
 *
 * The frame is the bar itself: the left edge is 2015 and the ceiling is the
 * $200M revenue cap, so nothing on the list can sit outside it. Estimated
 * revenue is drawn as a ring and reported revenue as a solid dot, the same
 * distinction the rest of Scoutly makes with the tilde.
 */

export type Rule = "region" | "team" | "founded" | "revenue";

const FIRST_YEAR = 2015;
const CAP = 200_000_000;
const FLOOR = 100_000;
const MAX_TEAM = 500;
const HEIGHT = 440;
const PAD = { top: 28, right: 20, bottom: 40, left: 64 };
const REVENUE_TICKS = [1e5, 1e6, 1e7, 1e8];

/** A stable 0-1 value per company, so dots in the same year spread the same way every render. */
function jitter(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1000) / 1000;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function TerritoryMap({
  companies,
  activeRule,
  onOpen,
}: {
  companies: Company[];
  activeRule: Rule | null;
  onOpen: (company: Company) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<Company | null>(null);

  // The map ends at the newest company rather than today, so it never trails into empty years.
  const lastYear = Math.max(FIRST_YEAR + 5, ...companies.map((c) => c.foundedYear));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const compact = width < 560;

  const x = (year: number) => PAD.left + ((year - FIRST_YEAR) / (lastYear + 1 - FIRST_YEAR)) * plotW;
  const y = (revenue: number) => {
    const clamped = Math.min(Math.max(revenue, FLOOR), CAP);
    const t = (Math.log10(clamped) - Math.log10(FLOOR)) / (Math.log10(CAP) - Math.log10(FLOOR));
    return PAD.top + (1 - t) * plotH;
  };
  const r = (team: number) => Math.max(2.5, Math.sqrt(Math.min(team, MAX_TEAM) / MAX_TEAM) * (compact ? 10 : 15));

  const dots = useMemo(
    () =>
      companies
        .map((company) => ({ company, j: jitter(company.id) }))
        // Big dots first so small ones stay visible on top.
        .sort((a, b) => b.company.teamSize - a.company.teamSize),
    [companies],
  );

  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  const largestTeam = Math.max(0, ...companies.map((c) => c.teamSize));

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setHovered(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          className="block overflow-visible"
          role="img"
          aria-label={`${companies.length} companies plotted by founding year and annual revenue. Every one was founded in ${FIRST_YEAR} or later and makes under $200M a year. The full list is on the Companies page.`}
        >
          {/* Revenue gridlines: quiet structure, labelled on the left. */}
          {REVENUE_TICKS.map((tick) => (
            <g key={tick} aria-hidden="true">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
              <text x={PAD.left - 12} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px]">
                {formatUsd(tick)}
              </text>
            </g>
          ))}

          {/* Year ticks along the floor. */}
          {years.map((year) =>
            compact && year % 2 === 0 && year !== FIRST_YEAR ? null : (
              <text
                key={year}
                aria-hidden="true"
                x={x(year + 0.5)}
                y={HEIGHT - PAD.bottom + 24}
                textAnchor="middle"
                className="figures fill-ink-3 text-[11px]"
              >
                {compact ? `’${String(year).slice(2)}` : year}
              </text>
            ),
          )}

          {/* The ceiling: the revenue cap. */}
          <Boundary active={activeRule === "revenue"}>
            <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top} y2={PAD.top} strokeDasharray="4 5" />
            <text x={width - PAD.right} y={PAD.top - 10} textAnchor="end" className="text-[11px]">
              $200M revenue cap
            </text>
          </Boundary>

          {/* The left wall: founded 2015 or later. */}
          <Boundary active={activeRule === "founded"}>
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} strokeDasharray="4 5" />
          </Boundary>

          {/* The floor. */}
          <line
            aria-hidden="true"
            x1={PAD.left}
            x2={width - PAD.right}
            y1={HEIGHT - PAD.bottom}
            y2={HEIGHT - PAD.bottom}
            stroke="var(--line-strong)"
          />

          {dots.map(({ company, j }, index) => {
            const cx = x(company.foundedYear + 0.15 + j * 0.7);
            const cy = y(company.annualRevenueUsd);
            const radius = r(company.teamSize);
            const colour = industryColour(company.industry);
            const dim =
              (hovered !== null && hovered.id !== company.id) ||
              (activeRule === "team" && company.teamSize < largestTeam * 0.5) ||
              (activeRule === "region" && company.region === "Unknown");

            return (
              <motion.circle
                key={company.id}
                aria-hidden="true"
                r={radius}
                fill={company.revenueIsEstimate ? "var(--plane)" : colour}
                fillOpacity={company.revenueIsEstimate ? 0.6 : 0.85}
                stroke={colour}
                strokeWidth={company.revenueIsEstimate ? 1.75 : 0}
                className="cursor-pointer"
                initial={reduceMotion ? false : { cx, cy: HEIGHT - PAD.bottom, opacity: 0 }}
                animate={{ cx, cy, opacity: dim ? 0.18 : 1 }}
                transition={{
                  cx: { duration: 0 },
                  cy: { type: "spring", stiffness: 90, damping: 16, delay: 0.5 + (company.foundedYear - FIRST_YEAR) * 0.06 + j * 0.2 },
                  opacity: { duration: 0.2, delay: hovered || activeRule ? 0 : 0.5 + index * 0.002 },
                }}
                onPointerEnter={() => setHovered(company)}
                onClick={() => onOpen(company)}
              />
            );
          })}
        </svg>
      )}

      {/* Tooltip. Every figure is also in the list, so this only enhances. */}
      {hovered && width > 0 && (
        <MapTooltip
          company={hovered}
          left={x(hovered.foundedYear + 0.15 + jitter(hovered.id) * 0.7)}
          top={y(hovered.annualRevenueUsd) - r(hovered.teamSize)}
          width={width}
        />
      )}

      {width === 0 && <div style={{ height: HEIGHT }} />}
    </div>
  );
}

function Boundary({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.g
      aria-hidden="true"
      initial={false}
      animate={{ opacity: active ? 1 : 0.55 }}
      transition={{ duration: 0.2 }}
      stroke={active ? "var(--signal)" : "var(--ink-3)"}
      fill={active ? "var(--signal)" : "var(--ink-3)"}
      strokeWidth={active ? 1.5 : 1}
      className="[&_text]:stroke-none"
    >
      {children}
    </motion.g>
  );
}

function MapTooltip({ company, left, top, width }: { company: Company; left: number; top: number; width: number }) {
  // Keep the card inside the map near either edge.
  const align = left < 120 ? "left" : left > width - 120 ? "right" : "center";

  return (
    <div
      role="presentation"
      className={cn(
        "pointer-events-none absolute z-10 w-max max-w-60 -translate-y-[calc(100%+10px)] rounded-lg border border-line-strong bg-overlay px-3 py-2.5 shadow-xl shadow-black/30",
        align === "center" && "-translate-x-1/2",
        align === "right" && "-translate-x-full",
      )}
      style={{ left, top }}
    >
      <p className="font-semibold text-ink">{company.name}</p>
      <p className="mt-1 flex items-center gap-2 text-xs text-ink-2">
        <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: industryColour(company.industry) }} />
        {company.industry}
      </p>
      <p className="figures mt-2 text-sm text-ink">
        {company.revenueIsEstimate ? `~${formatUsd(company.annualRevenueUsd)} estimated` : `${formatUsd(company.annualRevenueUsd)} reported`}
      </p>
      <p className="mt-0.5 text-xs text-ink-3">
        Founded {company.foundedYear}, YC {company.batch}, {company.teamSize} people
      </p>
    </div>
  );
}
