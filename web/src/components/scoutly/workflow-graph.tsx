// web/src/components/scoutly/workflow-graph.tsx
"use client";

import { Building, Check, ChevronUp, Database, Globe, Hash, MessageSquare, Target, Webhook } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Eyebrow, SectionTitle } from "@/components/scoutly/frame";
import { Logo } from "@/components/scoutly/logo";
import { useCompanies } from "@/hooks/use-scoutly-data";
import { cn } from "@/lib/utils";

/*
 * How Scoutly connects, drawn as a node graph: where companies come from on
 * the left, the agent in the middle stepping through Discover, Qualify and
 * Activate, and the tools your team already uses on the right. Sparks travel
 * along the wires; the wires feeding the step that is currently lit glow in
 * the signal colour.
 *
 * The graph is laid out on a fixed 1080 x 600 sheet and scaled to fit, so the
 * wires always meet their ports. Below md it gives way to a stacked list.
 */

const W = 1080;
const H = 600;
const NODE_W = 240;
const NODE_H = 68;

type Stage = "discover" | "qualify" | "activate";

const STAGES: { key: Stage; label: string; value: string }[] = [
  { key: "discover", label: "Discover", value: "Your market" },
  { key: "qualify", label: "Qualify", value: "Your ICP" },
  { key: "activate", label: "Activate", value: "Your channels" },
];

const AGENT = { x: 420, y: 150, w: 250 };
const ROW_Y: Record<Stage, number> = { discover: 245, qualify: 297, activate: 349 };

const SOURCES = [
  { icon: Building, title: "YC directory", sub: "Starting market", cy: 74, stage: "discover" as Stage, label: "candidates" },
  { icon: Target, title: "Your ICP", sub: "Who you want to reach", cy: 270, stage: "qualify" as Stage, label: "criteria" },
  { icon: Globe, title: "Open web", sub: "Sites, funding news, filings", cy: 476, stage: "qualify" as Stage, label: "research" },
];

const DESTINATIONS = [
  { icon: Hash, title: "Slack", sub: "#gtm-team", cy: 90, label: "30 matches" },
  { icon: MessageSquare, title: "Microsoft Teams", sub: "Sales channel", cy: 220, label: "shortlist" },
  { icon: Database, title: "CRM", sub: "HubSpot, Salesforce", cy: 350, label: "new leads" },
  { icon: Webhook, title: "API", sub: "Your own tools", cy: 480, label: "JSON" },
];

const DELIVER = ["Slack · #gtm-team", "Microsoft Teams", "HubSpot"];

function curve(x1: number, y1: number, x2: number, y2: number) {
  const bend = (x2 - x1) * 0.55;
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function useScale(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  return { ref, scale };
}

function useCycle(length: number, ms: number, enabled: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms, enabled]);
  return index;
}

function Node({
  icon: Icon,
  title,
  sub,
  lit,
  style,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  lit: boolean;
  style: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-3 rounded-xl border bg-raised px-3.5 transition-colors duration-500",
        lit ? "border-signal/60" : "border-line-strong",
      )}
      style={{ width: NODE_W, height: NODE_H, ...style }}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border bg-overlay transition-colors duration-500", lit ? "border-signal/40 text-signal" : "border-line text-ink-2")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{title}</span>
        <span className="block truncate text-sm text-ink-3">{sub}</span>
      </span>
    </div>
  );
}

function WireLabel({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-line-strong bg-plane px-2.5 py-0.5 text-xs text-ink-2"
      style={{ left: x, top: y }}
    >
      {children}
    </span>
  );
}

export function WorkflowGraph() {
  const reduceMotion = useReducedMotion();
  const stageIndex = useCycle(STAGES.length, 2400, !reduceMotion);
  const stage = STAGES[stageIndex].key;
  const { ref, scale } = useScale(W);
  const { companies } = useCompanies();

  const left = SOURCES.map((s) => ({ ...s, d: curve(NODE_W, s.cy, AGENT.x, ROW_Y[s.stage]) }));
  const right = DESTINATIONS.map((d) => ({ ...d, d: curve(AGENT.x + AGENT.w, ROW_Y.activate, W - NODE_W, d.cy) }));

  return (
    <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle id="how-heading" className="max-w-[16ch]">
            Plugs into the tools your team already uses.
          </SectionTitle>
        </div>
        <p className="max-w-[48ch] leading-relaxed text-ink-2">
          Scoutly <span className="text-ink">discovers</span> companies in your market,{" "}
          <span className="text-ink">qualifies</span> each one against your ICP with live research, and{" "}
          <span className="text-ink">activates</span> the shortlist wherever your GTM team works.
        </p>
      </div>

      {/* Desktop and tablet: the node graph. */}
      <div ref={ref} className="relative mt-16 hidden md:block" style={{ height: H * scale }} aria-hidden="true">
        <div className="dot-field absolute inset-0 opacity-60 [mask-image:none]" />
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
            {[...left.map((w) => ({ d: w.d, lit: w.stage === stage })), ...right.map((w) => ({ d: w.d, lit: stage === "activate" }))].map(
              (wire, index) => (
                <g key={index}>
                  <path d={wire.d} stroke={wire.lit ? "rgb(244 183 64 / 0.55)" : "var(--line-strong)"} strokeWidth={1.5} className="transition-[stroke] duration-500" />
                  <path
                    d={wire.d}
                    pathLength={1}
                    stroke={wire.lit ? "#f4b740" : "rgb(231 239 238 / 0.5)"}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    className="wire-pulse"
                    style={{ animationDelay: `${index * 0.35}s`, filter: wire.lit ? "drop-shadow(0 0 4px #f4b740)" : undefined }}
                  />
                </g>
              ),
            )}
            {/* Ports. */}
            {left.map((s) => (
              <circle key={`p-${s.title}`} cx={NODE_W} cy={s.cy} r={3.5} fill="var(--plane)" stroke="var(--ink-3)" />
            ))}
            {right.map((d) => (
              <circle key={`p-${d.title}`} cx={W - NODE_W} cy={d.cy} r={3.5} fill="var(--plane)" stroke="var(--ink-3)" />
            ))}
          </svg>

          {left.map((s) => (
            <Node key={s.title} icon={s.icon} title={s.title} sub={s.sub} lit={s.stage === stage} style={{ left: 0, top: s.cy - NODE_H / 2 }} />
          ))}
          {left.map((s) => (
            <WireLabel key={`l-${s.title}`} x={(NODE_W + AGENT.x) / 2} y={(s.cy + ROW_Y[s.stage]) / 2}>
              {s.title === "YC directory" && companies ? `${companies.length} companies` : s.label}
            </WireLabel>
          ))}

          {/* The criteria the ICP node carries, like a log under a node. */}
          <div className="absolute" style={{ left: 0, top: 270 + NODE_H / 2 + 12 }}>
            <p className="text-xs font-medium text-signal">Example criteria</p>
            <div className="mt-2 flex max-w-[240px] flex-wrap gap-1.5">
              {["US", "Fintech", "< 50 people", "Seed to Series A", "B2B"].map((chip) => (
                <span key={chip} className="rounded-md border border-signal/30 bg-signal/5 px-2 py-0.5 text-xs text-ink">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* The agent. */}
          <div className="absolute rounded-2xl border border-line-strong bg-raised p-2.5 shadow-2xl shadow-black/30" style={{ left: AGENT.x, top: AGENT.y, width: AGENT.w }}>
            <div className="flex items-center gap-3 px-1.5 pb-3 pt-1">
              <span className="grid size-9 place-items-center rounded-lg bg-signal text-on-signal">
                <Logo className="size-5" />
              </span>
              <span>
                <span className="block font-semibold text-ink">Scoutly agent</span>
                <span className="block text-sm text-ink-3">Research and qualify</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {STAGES.map((s) => (
                <div
                  key={s.key}
                  className={cn(
                    "flex h-[46px] items-center justify-between rounded-lg border px-3 text-sm transition-colors duration-500",
                    s.key === stage ? "border-signal/70 bg-signal/10 text-signal" : "border-transparent bg-overlay/70 text-ink-2",
                  )}
                >
                  <span>{s.label}</span>
                  <span className={s.key === stage ? "font-medium" : "text-ink"}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Where the shortlist goes, like an open menu under the agent. */}
          <div className="absolute rounded-2xl border border-line-strong bg-raised p-2" style={{ left: AGENT.x, top: 398, width: AGENT.w }}>
            <p className="flex items-center justify-between px-2.5 py-2 text-xs text-ink-3">
              Deliver the shortlist to
              <ChevronUp className="size-3.5" />
            </p>
            {DELIVER.map((target, index) => (
              <div key={target} className={cn("flex items-center justify-between rounded-lg px-2.5 py-2 text-sm", index === 0 ? "bg-overlay text-ink" : "text-ink-2")}>
                <span>
                  {target}
                  {index === 0 && <span className="block text-xs text-signal">Current · every morning at 9</span>}
                </span>
                {index === 0 && <Check className="size-4 text-ink" />}
              </div>
            ))}
          </div>

          {right.map((d) => (
            <Node key={d.title} icon={d.icon} title={d.title} sub={d.sub} lit={stage === "activate"} style={{ left: W - NODE_W, top: d.cy - NODE_H / 2 }} />
          ))}
          {right.map((d) => (
            <WireLabel key={`r-${d.title}`} x={(AGENT.x + AGENT.w + W - NODE_W) / 2} y={(ROW_Y.activate + d.cy) / 2}>
              {d.label}
            </WireLabel>
          ))}
        </div>
      </div>

      {/* Phones: the same flow as a stacked list. */}
      <ol className="mt-12 space-y-3 md:hidden">
        {[
          { title: "Discover", body: "Companies from the YC directory, your starting market.", items: ["YC directory"] },
          { title: "Qualify", body: "Researched on the open web and matched to your ICP.", items: ["Your ICP", "Open web"] },
          { title: "Activate", body: "The shortlist lands where your team works.", items: DESTINATIONS.map((d) => d.title) },
        ].map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-line-strong bg-raised p-5">
            <p className="font-mono text-xs text-ink-3">0{index + 1}</p>
            <p className="type-title mt-1 text-xl text-ink">{step.title}</p>
            <p className="mt-1 text-ink-2">{step.body}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {step.items.map((item) => (
                <span key={item} className="rounded-md border border-line px-2 py-0.5 text-xs text-ink">
                  {item}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
