// web/src/components/scoutly/method.tsx
"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { GlowFrame } from "@/components/scoutly/glow-frame";
import { LedgerMessage } from "@/components/scoutly/company-ledger";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { formatRoundDate, formatUsd } from "@/lib/format";
import { NAMED_INDUSTRIES, OTHER, industryColour } from "@/lib/industries";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * The method page. Its one orchestrated moment is the sieve at the top: a
 * hundred scraped companies stream through the pipeline's gates, pick up their
 * industry colour once researched, and only the ones that clear the rules land
 * in the database. Everything below it is quiet: five numbered steps, because
 * the pipeline really is a sequence, each with a small figure built from the
 * live data rather than an illustration.
 */

/** Lines in scraper/raw.jsonl: what the scraper hands the pipeline. */
const SCRAPED = 100;
const REVENUE_CAP = 200_000_000;
const EASE = [0.22, 1, 0.36, 1] as const;

export function MethodPage() {
  const { companies, error, isLoading, retry } = useCompanies();

  if (error && !companies) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
        <LedgerMessage title="Couldn't load the pipeline data" action={<Button variant="outline" onClick={retry}>Try again</Button>}>
          {error.message}
        </LedgerMessage>
      </div>
    );
  }

  return (
    <>
      <section aria-labelledby="sieve-heading" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 id="sieve-heading" className="sr-only">
          The pipeline at a glance
        </h2>
        {isLoading || !companies ? (
          <div role="status" aria-label="Loading the pipeline" className="shimmer h-[380px] rounded-2xl opacity-40" />
        ) : (
          <Sieve companies={companies} />
        )}
      </section>

      <ol className="mx-auto max-w-6xl px-4 sm:px-6">
        <Stage
          index={1}
          title="Scrape the YC directory"
          body={
            <>
              A Python script queries Y Combinator&rsquo;s public company index and keeps only companies
              based in the US or Europe, with 500 people or fewer, from a 2015 batch or later. Each match
              becomes one line in <code className="text-ink">raw.jsonl</code>.
            </>
          }
        >
          <ScrapeFigure company={companies?.[0]} />
        </Stage>

        <Stage
          index={2}
          title="Queue one run per company"
          body={
            <>
              Trigger.dev picks up the file and starts a separate run for every company. Runs go three at a
              time, and a run that fails is retried on its own, so one bad page never stalls the batch.
            </>
          }
        >
          <QueueFigure companies={companies} />
        </Stage>

        <Stage
          index={3}
          title="Research with an AI agent"
          body={
            <>
              Each run hands its company to Scoutly&rsquo;s agent, built with eve and deployed on Vercel. The
              agent reads the company&rsquo;s YC profile, website and press coverage until it can fill every
              field. When no revenue is published, it estimates one and says so.
            </>
          }
        >
          <ResearchFigure company={companies?.[0]} />
        </Stage>

        <Stage
          index={4}
          title="Check the four rules"
          body={
            <>
              The scraper trusted YC&rsquo;s own tags, which can be stale, so every rule is checked again
              against what the research found. Revenue can only be checked here. A company that fails any
              rule is dropped, not flagged.
            </>
          }
        >
          <RulesFigure companies={companies} />
        </Stage>

        <Stage
          index={5}
          title="Enrich and save"
          body={
            <>
              The <code className="text-ink">enrich</code> tool is the agent&rsquo;s only way to write. It
              normalises the record and upserts it into Supabase on the company&rsquo;s YC URL, so running a
              company again updates its row instead of adding a second one.
            </>
          }
          last
        >
          <StoreFigure company={companies?.[0]} />
        </Stage>
      </ol>

      <AskSection count={companies?.length} />
    </>
  );
}

/* --------------------------------------------------------------- sieve -- */

/** Gate positions in the sieve's 1000-unit-wide coordinate space. */
const GATES = [
  { x: 130, label: "Scraped" },
  { x: 330, label: "Queued" },
  { x: 530, label: "Researched" },
  { x: 730, label: "Checked" },
];
const DB = { x: 860, y: 90, width: 110, height: 190 };
const HEIGHT = 340;

/** A fixed shuffle so the survivors are spread through the stream, not bunched at the front. */
function shuffled(count: number) {
  const order = Array.from({ length: count }, (_, i) => i);
  let seed = 7;
  for (let i = count - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function Sieve({ companies }: { companies: Company[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduceMotion = useReducedMotion();
  const stored = Math.min(companies.length, SCRAPED);

  const particles = useMemo(() => {
    const order = shuffled(SCRAPED);
    let dropped = 0;
    return order.map((slot, i) => {
      const survivorIndex = slot < stored ? slot : null;
      // Rejected companies hit the rules wall and settle into a heap at its foot.
      const heap = survivorIndex === null ? dropped++ : 0;
      const y = 60 + ((i * 53) % 97) * 2.3;
      const column = survivorIndex === null ? 0 : survivorIndex % 7;
      const row = survivorIndex === null ? 0 : Math.floor(survivorIndex / 7);
      return {
        id: i,
        startX: -20 - (i % 10) * 14,
        y,
        survivor: survivorIndex !== null,
        colour: survivorIndex !== null ? industryColour(companies[survivorIndex]!.industry) : "var(--series-other)",
        endX: DB.x + 18 + column * 12.5,
        endY: DB.y + DB.height - 22 - row * 13,
        heapX: GATES[3]!.x - 14 - (heap % 9) * 11,
        heapY: HEIGHT - 44 - Math.floor(heap / 9) * 10,
      };
    });
  }, [companies, stored]);

  const play = inView || reduceMotion;
  const duration = reduceMotion ? 0 : 3.4;
  const stagger = reduceMotion ? 0 : 0.028;
  const settle = reduceMotion ? 0 : duration + SCRAPED * stagger;

  return (
    <GlowFrame className="rounded-2xl">
      <div ref={ref} className="relative overflow-hidden rounded-2xl border border-line bg-raised/25 px-2 pb-4 pt-6 sm:px-6">
        <svg viewBox={`0 0 1000 ${HEIGHT}`} className="block w-full" role="img" aria-label={`${SCRAPED} companies scraped, ${stored} stored after research and the four rules`}>
          {GATES.map((gate) => (
            <line key={gate.x} x1={gate.x} x2={gate.x} y1={40} y2={HEIGHT - 50} stroke="var(--line-strong)" strokeDasharray="3 5" />
          ))}

          {/* The rules gate is the one that rejects, so it is drawn heavier. */}
          <line x1={GATES[3]!.x} x2={GATES[3]!.x} y1={40} y2={HEIGHT - 50} stroke="var(--ink-3)" strokeWidth={2} />

          {/* The database: a cylinder the survivors stack into. */}
          <g>
            <path
              d={`M${DB.x} ${DB.y} v${DB.height} a${DB.width / 2} 12 0 0 0 ${DB.width} 0 v-${DB.height}`}
              fill="var(--overlay)"
              stroke="var(--line-strong)"
            />
            <ellipse cx={DB.x + DB.width / 2} cy={DB.y} rx={DB.width / 2} ry={12} fill="var(--raised)" stroke="var(--line-strong)" />
          </g>

          {particles.map((p) => {
            const [scrape, queue, research, rules] = GATES.map((g) => g.x);
            const x = p.survivor
              ? [p.startX, scrape, queue, research, rules, p.endX]
              : [p.startX, scrape, queue, research, rules - 10, p.heapX];
            const y = p.survivor
              ? [p.y, p.y, p.y, p.y, p.y * 0.6 + 70, p.endY]
              : [p.y, p.y, p.y, p.y, p.y, p.heapY];
            return (
              <motion.g
                key={p.id}
                initial={{ x: p.startX, y: p.y, opacity: 0 }}
                animate={play ? { x, y, opacity: p.survivor ? [0, 1, 1, 1, 1, 1] : [0, 1, 1, 1, 1, 0.5] } : undefined}
                transition={{ duration, delay: p.id * stagger, ease: "easeInOut", times: [0, 0.18, 0.38, 0.58, 0.78, 1] }}
              >
                <circle r={4.5} fill="var(--ink-3)" />
                {/* Research is where a company gets its data, so this is where it gets its colour. */}
                <motion.circle
                  r={4.5}
                  fill={p.colour}
                  initial={{ opacity: 0 }}
                  animate={play ? { opacity: [0, 0, 0, 1, 1, p.survivor ? 1 : 0] } : undefined}
                  transition={{ duration, delay: p.id * stagger, times: [0, 0.18, 0.38, 0.58, 0.78, 1] }}
                />
              </motion.g>
            );
          })}
        </svg>

        {/* Labels are HTML so they stay legible when the figure shrinks to a phone. */}
        <div aria-hidden="true" className="relative h-5 text-xs text-ink-2 sm:text-sm">
          {GATES.map((gate) => (
            <span key={gate.label} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${gate.x / 10}%` }}>
              {gate.label}
            </span>
          ))}
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(DB.x + DB.width / 2) / 10}%` }}>
            Saved
          </span>
        </div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={play ? { opacity: 1 } : undefined}
          transition={{ duration: 0.5, delay: settle }}
          className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-t border-line px-2 pt-5"
        >
          <Stat value={SCRAPED} label="scraped from YC" />
          <Stat value={stored} label="on the list" />
          <Stat value={SCRAPED - stored} label="not on the list" />
        </motion.dl>
      </div>
    </GlowFrame>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="sr-only">{label}</dt>
      <dd className="type-title text-2xl text-ink">{value}</dd>
      <span aria-hidden="true" className="text-sm text-ink-2">{label}</span>
    </div>
  );
}

/* --------------------------------------------------------------- stage -- */

function Stage({
  index,
  title,
  body,
  children,
  last = false,
}: {
  index: number;
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative grid gap-8 pb-24 pl-12 sm:pl-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      {/* The rail joins the steps into one sequence. */}
      {!last && <span aria-hidden="true" className="absolute bottom-0 left-4 top-10 w-px bg-line-strong sm:left-5" />}
      <span className="figures absolute left-0 top-0 grid size-8 place-items-center rounded-full border border-line-strong bg-plane text-sm font-semibold text-ink sm:size-10">
        {index}
      </span>
      <div className="pt-1">
        <h2 className="type-title text-[clamp(1.6rem,3vw,2.25rem)] text-ink">{title}</h2>
        <p className="mt-4 max-w-[52ch] leading-relaxed text-ink-2">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-raised/40 p-5", className)}>{children}</div>;
}

/* ------------------------------------------------------------ figures -- */

function ScrapeFigure({ company }: { company?: Company }) {
  const record = company && {
    company_name: company.name,
    country_or_location: company.locations.join("; "),
    team_size: company.teamSize,
    industry: company.industry,
    batch: company.batch,
  };

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-medium text-ink">Filters on the query</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {["Region is US or Europe", "Team of 500 or fewer", "Batch from 2015 on"].map((filter) => (
            <li key={filter} className="rounded-full border border-line-strong px-3 py-1 text-ink-2">
              {filter}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-medium text-ink">One line of raw.jsonl</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-plane/80 p-4 text-[0.8rem] leading-relaxed text-ink-2">
          {record ? JSON.stringify(record, null, 2) : "Loading…"}
        </pre>
      </div>
    </Panel>
  );
}

const LANES = 3;

function QueueFigure({ companies }: { companies?: Company[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const names = (companies ?? []).slice(0, 12).map((c) => c.name);

  return (
    <Panel>
      <div ref={ref} className="space-y-3">
        {Array.from({ length: LANES }, (_, lane) => (
          <div key={lane} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-ink-3">Slot {lane + 1}</span>
            <div className="flex min-w-0 flex-1 gap-2 overflow-hidden rounded-full bg-plane/80 p-1.5">
              {names
                .filter((_, i) => i % LANES === lane)
                .map((name, i) => (
                  <motion.span
                    key={name}
                    initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                    animate={inView ? { opacity: 1, x: 0 } : undefined}
                    transition={{ duration: 0.45, ease: EASE, delay: (i * LANES + lane) * 0.12 }}
                    className="shrink-0 truncate rounded-full bg-overlay px-3 py-1 text-xs text-ink-2"
                  >
                    {name}
                  </motion.span>
                ))}
            </div>
          </div>
        ))}
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-sm">
        {[
          ["3", "runs at once"],
          ["3", "attempts per company"],
          ["15 min", "limit per run"],
        ].map(([value, label]) => (
          <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd className="type-title text-xl text-ink">{value}</dd>
            <span aria-hidden="true" className="text-ink-3">{label}</span>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function ResearchFigure({ company }: { company?: Company }) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();

  const latestRound = company?.fundingRounds.at(-1);
  const fields = company
    ? [
        { field: "Headquarters", value: company.primaryLocation },
        { field: "Founded", value: String(company.foundedYear) },
        { field: "Sells to", value: [company.isB2b && "Businesses", company.isB2c && "Consumers"].filter(Boolean).join(" and ") || "Unclear" },
        {
          field: "Funding",
          value: latestRound
            ? `${company.fundingRounds.length} round${company.fundingRounds.length === 1 ? "" : "s"}, latest ${latestRound.label}${latestRound.date ? ` (${formatRoundDate(latestRound.date)})` : ""}`
            : "None disclosed",
        },
        { field: "Revenue", value: `${company.revenueIsEstimate ? "~" : ""}${formatUsd(company.annualRevenueUsd)}${company.revenueIsEstimate ? ", estimated" : ", reported"}` },
      ]
    : [];

  return (
    <Panel>
      <p className="text-sm text-ink-2">
        What the agent found for <span className="font-medium text-ink">{company?.name ?? "…"}</span>
      </p>
      <ul ref={ref} className="mt-4 divide-y divide-line">
        {fields.map((item, i) => (
          <li key={item.field} className="grid grid-cols-[1.5rem_6.5rem_minmax(0,1fr)] items-center gap-3 py-3 text-sm">
            <motion.span
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={inView ? { scale: 1, opacity: 1 } : undefined}
              transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.2 + i * 0.35 }}
              className="grid size-5 place-items-center rounded-full bg-signal text-on-signal"
            >
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </motion.span>
            <span className="text-ink-3">{item.field}</span>
            <motion.span
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : undefined}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.35 }}
              className="truncate text-ink"
            >
              {item.value}
            </motion.span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RulesFigure({ companies }: { companies?: Company[] }) {
  const list = companies ?? [];
  const rules = [
    { rule: "Based in the US or Europe", detail: "Checked against the headquarters the agent found" },
    { rule: "500 people or fewer", detail: list.length ? `Largest team on the list: ${Math.max(...list.map((c) => c.teamSize))}` : "" },
    { rule: "Founded in 2015 or later", detail: list.length ? `Oldest on the list: ${Math.min(...list.map((c) => c.foundedYear))}` : "" },
    { rule: "Under $200M a year", detail: "The only rule that needs research to check" },
  ];

  return (
    <div className="space-y-6">
      <Panel className="p-0">
        <ul className="divide-y divide-line">
          {rules.map((item) => (
            <li key={item.rule} className="flex items-start gap-3 px-5 py-3.5">
              <Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-ink">{item.rule}</span>
                <span className="block text-sm text-ink-3">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      {list.length > 0 && <RevenuePlot companies={list} />}
    </div>
  );
}

/* A dot per company on a log revenue scale, with the cap as the right-hand wall. */
const PLOT = { left: 132, right: 24, row: 20, top: 30, bottom: 34, width: 560 };
const FLOOR = 100_000;
const TICKS = [100_000, 1_000_000, 10_000_000, 100_000_000];

function RevenuePlot({ companies }: { companies: Company[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = useReducedMotion();

  const rows = [...companies].sort((a, b) => b.annualRevenueUsd - a.annualRevenueUsd);
  const plotWidth = PLOT.width - PLOT.left - PLOT.right;
  const height = PLOT.top + rows.length * PLOT.row + PLOT.bottom;
  const scale = (value: number) =>
    PLOT.left + ((Math.log10(Math.max(value, FLOOR)) - Math.log10(FLOOR)) / (Math.log10(REVENUE_CAP) - Math.log10(FLOOR))) * plotWidth;
  const cap = scale(REVENUE_CAP);

  return (
    <Panel>
      <p className="text-sm font-medium text-ink">Every company&rsquo;s revenue against the cap</p>
      <p className="mt-1 text-sm text-ink-3">Log scale. Hover a dot for the figure.</p>

      <svg ref={ref} viewBox={`0 0 ${PLOT.width} ${height}`} className="mt-4 block w-full" role="img" aria-label="Annual revenue of each company, all under the $200M cap">
        {TICKS.map((tick) => (
          <g key={tick}>
            <line x1={scale(tick)} x2={scale(tick)} y1={PLOT.top - 6} y2={height - PLOT.bottom} stroke="var(--line)" />
            <text x={scale(tick)} y={height - 12} textAnchor="middle" className="fill-ink-3 text-[11px]">
              {formatUsd(tick)}
            </text>
          </g>
        ))}

        <line x1={cap} x2={cap} y1={PLOT.top - 14} y2={height - PLOT.bottom} stroke="var(--signal)" strokeWidth={2} />
        <text x={cap} y={PLOT.top - 18} textAnchor="end" className="fill-ink text-[11px] font-semibold">
          $200M cap
        </text>

        {rows.map((company, i) => {
          const y = PLOT.top + i * PLOT.row + PLOT.row / 2;
          const x = scale(company.annualRevenueUsd);
          const colour = industryColour(company.industry);
          const active = hover === company.id;
          return (
            <g key={company.id} onPointerEnter={() => setHover(company.id)} onPointerLeave={() => setHover(null)}>
              {/* Full-row hit target, much bigger than the dot. */}
              <rect x={0} y={y - PLOT.row / 2} width={PLOT.width} height={PLOT.row} fill={active ? "var(--overlay)" : "transparent"} rx={4} />
              <text x={PLOT.left - 12} y={y + 4} textAnchor="end" className={cn("text-[11px]", active ? "fill-ink" : "fill-ink-2")}>
                {company.name.length > 18 ? `${company.name.slice(0, 17)}…` : company.name}
              </text>
              <line x1={PLOT.left} x2={x} y1={y} y2={y} stroke="var(--line-strong)" />
              <motion.circle
                cx={x}
                cy={y}
                r={5}
                fill={company.revenueIsEstimate ? "var(--raised)" : colour}
                stroke={colour}
                strokeWidth={2}
                initial={reduceMotion ? false : { opacity: 0, cx: PLOT.left }}
                animate={inView ? { opacity: 1, cx: x } : undefined}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.03 }}
              />
              {active && (
                // Near the cap the label flips to the dot's left so it never crosses the wall.
                <text
                  x={x > cap - 110 ? x - 12 : x + 12}
                  y={y + 4}
                  textAnchor={x > cap - 110 ? "end" : "start"}
                  className="fill-ink text-[11px] font-semibold"
                  paintOrder="stroke"
                  stroke="var(--overlay)"
                  strokeWidth={4}
                >
                  {company.revenueIsEstimate ? `~${formatUsd(company.annualRevenueUsd)} est.` : `${formatUsd(company.annualRevenueUsd)} reported`}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Industry colours">
          {[...NAMED_INDUSTRIES, OTHER].map((name) => (
            <li key={name} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: industryColour(name) }} />
              {name}
            </li>
          ))}
        </ul>
        <span className="flex items-center gap-1.5 text-ink-3">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-ink-2" />
          Reported
        </span>
        <span className="flex items-center gap-1.5 text-ink-3">
          <span aria-hidden="true" className="size-2.5 rounded-full border-[1.5px] border-ink-2" />
          Estimated
        </span>
      </div>
    </Panel>
  );
}

function StoreFigure({ company }: { company?: Company }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();

  return (
    <Panel className="space-y-5">
      <pre className="overflow-x-auto rounded-lg bg-plane/80 p-4 text-[0.8rem] leading-relaxed text-ink-2">
        {`INSERT INTO companies (...)
VALUES (...)
ON CONFLICT (source_url) DO UPDATE
  SET ..., updated_at = now()`}
      </pre>

      <div ref={ref}>
        <p className="text-sm font-medium text-ink">In the companies table</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-line text-sm">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem] gap-3 border-b border-line bg-plane/60 px-4 py-2 text-xs text-ink-3">
            <span>company_name</span>
            <span>industry</span>
            <span className="text-right">annual_revenue</span>
          </div>
          {company && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -12, backgroundColor: "rgba(244, 183, 64, 0.18)" }}
              animate={inView ? { opacity: 1, y: 0, backgroundColor: "rgba(244, 183, 64, 0)" } : undefined}
              transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem] gap-3 px-4 py-2.5"
            >
              <span className="truncate text-ink">{company.name}</span>
              <span className="truncate text-ink-2">{company.industry}</span>
              <span className="figures text-right text-ink">{company.annualRevenueUsd}</span>
            </motion.div>
          )}
        </div>
        <p className="mt-3 text-sm text-ink-3">Run the same company twice and this row updates. It never duplicates.</p>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------------- ask -- */

function AskSection({ count }: { count?: number }) {
  return (
    <section aria-labelledby="ask-heading" className="border-t border-line bg-raised/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-end">
        <div>
          <h2 id="ask-heading" className="type-title max-w-[20ch] text-[clamp(2rem,4.5vw,3.25rem)] text-ink">
            You can also ask the agent.
          </h2>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ink-2">
            Ask about a company in plain English and the agent writes the SQL, checks that it only reads, and
            runs it inside a read-only transaction. It can look things up. It can&rsquo;t change or delete
            anything.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href="/companies"
            className="inline-flex h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-on-signal transition-opacity hover:opacity-90"
          >
            {count ? `Browse all ${count} companies` : "Browse the companies"}
          </Link>
          <Link
            href="/industries"
            className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-sm font-medium text-ink transition-colors hover:bg-raised"
          >
            See the industry mix
          </Link>
        </div>
      </div>
    </section>
  );
}
