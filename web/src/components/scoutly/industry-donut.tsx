"use client";

import { arc, pie, type PieArcDatum } from "d3-shape";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { pluralise } from "@/lib/format";

/**
 * Company count by industry, as a donut.
 *
 * Mark rules, from the dataviz method this was built against:
 * - A thin ring, not a pie: the centre carries the number that matters.
 * - A constant 2px gap of plane between slices, so neighbours never touch.
 *   `padRadius` makes the gap parallel-edged (the same 2px at the inner and
 *   outer edge) rather than a wedge that widens outward.
 * - Slices keep the order they are given — the validated colour adjacency —
 *   rather than being re-sorted by size.
 * - Identity never rests on colour: every slice is named in the list beside
 *   it, and the list is the keyboard path to the same selection.
 */

export type Slice = {
  key: string;
  label: string;
  count: number;
  colour: string;
};

const SIZE = 320;
const OUTER = 150;
const INNER = 106;
const PAD_RADIUS = INNER;
const GAP_PX = 2;

export function IndustryDonut({
  slices,
  total,
  selected,
  highlighted,
  onSelect,
  onHighlight,
}: {
  slices: Slice[];
  total: number;
  selected: string | null;
  highlighted: string | null;
  onSelect: (key: string) => void;
  onHighlight: (key: string | null) => void;
}) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const arcs = useMemo(
    () =>
      pie<Slice>()
        .sort(null)
        .value((slice) => slice.count)
        .padAngle(slices.length > 1 ? GAP_PX / PAD_RADIUS : 0)(slices),
    [slices],
  );

  const shape = useMemo(
    () =>
      arc<PieArcDatum<Slice>>()
        .innerRadius(INNER)
        .padRadius(PAD_RADIUS)
        .cornerRadius(3),
    [],
  );

  const focus = highlighted ?? selected;
  const focused = slices.find((slice) => slice.key === focus);
  const hovered = slices.find((slice) => slice.key === highlighted);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
      <svg
        viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
        className="size-full overflow-visible"
        role="img"
        aria-label={`Companies by industry: ${slices.map((s) => `${s.label} ${s.count}`).join(", ")}.`}
        onPointerLeave={() => {
          setPointer(null);
          onHighlight(null);
        }}
      >
        {arcs.map((datum) => {
          const key = datum.data.key;
          const isFocus = focus === key;
          const dim = focus !== null && !isFocus;
          // The selected slice steps outward — motion that answers the click.
          const outer = key === selected ? OUTER + 8 : OUTER;

          return (
            <motion.path
              key={key}
              aria-hidden="true"
              d={shape.outerRadius(outer)(datum) ?? undefined}
              fill={datum.data.colour}
              animate={{ opacity: dim ? 0.3 : 1 }}
              transition={{ duration: 0.2 }}
              className="cursor-pointer outline-none"
              onPointerMove={(event) => {
                const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
                setPointer({ x: event.clientX - box.left, y: event.clientY - box.top });
                onHighlight(key);
              }}
              onClick={() => onSelect(key)}
            />
          );
        })}
      </svg>

      {/* The hole carries the figure: the focused industry, or the whole set. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-5xl font-bold tracking-tight text-ink">{focused ? focused.count : total}</p>
          <p className="mx-auto mt-2 max-w-[11ch] text-sm leading-snug text-ink-2">
            {focused ? focused.label : "companies"}
          </p>
          {focused && total > 0 && (
            <p className="mt-1 text-xs text-ink-3">{Math.round((focused.count / total) * 100)}% of all</p>
          )}
        </div>
      </div>

      {/* Tooltip enhances; every value is also in the list beside the chart. */}
      {hovered && pointer && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border border-line-strong bg-overlay px-3 py-2 shadow-lg"
          style={{ left: pointer.x, top: pointer.y }}
        >
          <p className="text-sm font-semibold text-ink">
            {pluralise(hovered.count, "company", "companies")}
            <span className="ml-1.5 font-normal text-ink-2">
              {Math.round((hovered.count / total) * 100)}%
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-2">
            <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: hovered.colour }} />
            {hovered.label}
          </p>
        </div>
      )}
    </div>
  );
}

export function DonutSkeleton() {
  return (
    <div role="status" aria-label="Loading industries" className="mx-auto aspect-square w-full max-w-[22rem]">
      <svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
        <circle
          r={(OUTER + INNER) / 2}
          fill="none"
          stroke="var(--raised)"
          strokeWidth={OUTER - INNER}
          className="motion-safe:animate-pulse"
        />
      </svg>
    </div>
  );
}

