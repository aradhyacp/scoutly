// web/src/components/scoutly/slack-replica.tsx
"use client";

import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bell,
  Bold,
  ChevronDown,
  Clock,
  Code,
  Ellipsis,
  Hash,
  Headphones,
  House,
  Italic,
  Link2,
  List,
  MessageCircle,
  Plus,
  Search,
  SendHorizontal,
  Strikethrough,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/scoutly/logo";
import { cn } from "@/lib/utils";

/*
 * A Slack workspace, drawn in Slack's own aubergine-and-charcoal theme, playing
 * one conversation after another on an endless loop: a teammate types a
 * question into the composer, sends it, Scoutly types, streams its answer word
 * by word, and drops in the matches one card at a time. Three scenarios rotate
 * so the loop also shows the range of things people ask.
 *
 * Every company here is a placeholder: the caption says so, and the names are
 * deliberately generic. Under reduced motion it shows one finished exchange.
 */

const SLACK = {
  titlebar: "#350d36",
  rail: "#350d36",
  sidebar: "#3f0e40",
  sidebarText: "#cfc3cf",
  active: "#1164a3",
  pane: "#1a1d21",
  text: "#d1d2d3",
  muted: "#ababad",
  border: "#35373b",
  link: "#1d9bd1",
  send: "#007a5a",
};

type Match = { name: string; meta: string; why: string; role: string; bar: string };

type Scenario = {
  user: string;
  initial: string;
  role: string;
  avatar: string;
  prompt: string;
  reply: string;
  matches: Match[];
};

const SCENARIOS: Scenario[] = [
  {
    user: "Aanya",
    initial: "A",
    role: "GTM lead",
    avatar: "#e8912d",
    prompt: "Find YC-backed US fintech startups under 50 people that could be design partners for our AI compliance product.",
    reply: "Found 30 that fit, ranked by how strongly they match. The first three worth a conversation:",
    matches: [
      { name: "Company A", meta: "Fintech infrastructure · 25 people", why: "Ships regulated payment flows with no compliance tooling in its stack.", role: "Design partner", bar: "#2bac76" },
      { name: "Company B", meta: "B2B financial software · 38 people", why: "Sells to banks and raised a seed round this year.", role: "Customer", bar: "#1d9bd1" },
      { name: "Company C", meta: "Compliance technology · 18 people", why: "Adjacent product with the same buyers.", role: "Strategic partner", bar: "#ecb22e" },
    ],
  },
  {
    user: "Rohan",
    initial: "R",
    role: "Founder",
    avatar: "#2bac76",
    prompt: "Which YC dev-tool companies with real engineering teams could need API security?",
    reply: "24 companies match. These three look most likely to pilot something new:",
    matches: [
      { name: "Company D", meta: "Developer infrastructure · 42 people", why: "Public API at the core of the product, small security team.", role: "Early adopter", bar: "#2bac76" },
      { name: "Company E", meta: "API platform · 65 people", why: "Growing partner integrations and an enterprise push.", role: "Customer", bar: "#1d9bd1" },
      { name: "Company F", meta: "Observability · 30 people", why: "Its users are your users. A natural integration.", role: "Integration partner", bar: "#ecb22e" },
    ],
  },
  {
    user: "Maya",
    initial: "M",
    role: "Business development",
    avatar: "#e01e5a",
    prompt: "Find US startups that raised recently and match our ICP for market entry.",
    reply: "18 recent raises match your profile. Start with these:",
    matches: [
      { name: "Company G", meta: "Healthcare SaaS · 34 people", why: "Raised a Series A and is hiring its first ops team.", role: "Customer", bar: "#1d9bd1" },
      { name: "Company H", meta: "Logistics software · 22 people", why: "Expanding into your region next year.", role: "Design partner", bar: "#2bac76" },
      { name: "Company I", meta: "B2B marketplace · 47 people", why: "Distributes to the buyers you want to reach.", role: "Distribution partner", bar: "#ecb22e" },
    ],
  },
];

type Playback = {
  scenario: number;
  draft: string;
  sent: boolean;
  typing: boolean;
  words: number;
  cards: number;
};

const START: Playback = { scenario: 0, draft: "", sent: false, typing: false, words: 0, cards: 0 };
const FINISHED: Playback = { scenario: 0, draft: "", sent: true, typing: false, words: 999, cards: 3 };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usePlayback(enabled: boolean): Playback {
  const [state, setState] = useState<Playback>(START);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      for (let scenario = 0; alive; scenario = (scenario + 1) % SCENARIOS.length) {
        const { prompt, reply } = SCENARIOS[scenario];
        const words = reply.split(" ").length;

        setState({ ...START, scenario });
        await wait(900);

        for (let i = 1; i <= prompt.length && alive; i++) {
          setState((s) => ({ ...s, draft: prompt.slice(0, i) }));
          await wait(prompt[i - 1] === " " ? 45 : 24);
        }
        await wait(500);
        setState((s) => ({ ...s, draft: "", sent: true }));

        await wait(600);
        setState((s) => ({ ...s, typing: true }));
        await wait(1500);
        setState((s) => ({ ...s, typing: false }));

        for (let i = 1; i <= words && alive; i++) {
          setState((s) => ({ ...s, words: i }));
          await wait(55);
        }
        for (let i = 1; i <= 3 && alive; i++) {
          await wait(450);
          setState((s) => ({ ...s, cards: i }));
        }
        await wait(5200);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}

export function SlackReplica({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const live = usePlayback(!reduceMotion);
  const view = reduceMotion ? FINISHED : live;
  const scenario = SCENARIOS[view.scenario];
  const replyWords = scenario.reply.split(" ");

  return (
    <figure className={className}>
      <div
        className="overflow-hidden rounded-xl border shadow-2xl shadow-black/50"
        style={{ borderColor: SLACK.border, backgroundColor: SLACK.pane, fontFamily: "Lato, ui-sans-serif, system-ui, sans-serif" }}
      >
        {/* Title bar: history arrows and the workspace search. */}
        <div className="flex h-10 items-center gap-3 px-3" style={{ backgroundColor: SLACK.titlebar }}>
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-2 hidden items-center gap-2 text-white/60 sm:flex" aria-hidden="true">
            <ArrowLeft className="size-4" />
            <ArrowRight className="size-4" />
            <Clock className="size-4" />
          </span>
          <span className="mx-auto flex h-6 w-full max-w-[260px] items-center gap-2 rounded-md bg-white/15 px-2.5 text-xs text-white/70">
            <Search aria-hidden="true" className="size-3.5" />
            Search Acme
          </span>
          <span className="w-12" />
        </div>

        <div className="flex h-[460px] sm:h-[500px]">
          {/* Workspace rail. */}
          <div className="hidden w-[60px] shrink-0 flex-col items-center gap-4 pt-3 sm:flex" style={{ backgroundColor: SLACK.rail }} aria-hidden="true">
            <span className="grid size-9 place-items-center rounded-lg bg-white text-sm font-black text-[#3f0e40]">A</span>
            {[
              { icon: House, label: "Home", active: true },
              { icon: MessageCircle, label: "DMs" },
              { icon: Bell, label: "Activity" },
              { icon: Ellipsis, label: "More" },
            ].map((item) => (
              <span key={item.label} className="flex flex-col items-center gap-1 text-[10px] text-white/80">
                <span className={cn("grid size-9 place-items-center rounded-lg", item.active && "bg-white/20")}>
                  <item.icon className="size-[18px]" />
                </span>
                {item.label}
              </span>
            ))}
          </div>

          {/* Channel sidebar. */}
          <div className="hidden w-[190px] shrink-0 flex-col md:flex" style={{ backgroundColor: SLACK.sidebar, color: SLACK.sidebarText }} aria-hidden="true">
            <div className="flex items-center gap-1 border-b border-white/10 px-4 py-3 text-[15px] font-bold text-white">
              Acme Inc <ChevronDown className="size-4" />
            </div>
            <div className="space-y-0.5 px-2 py-3 text-[14px]">
              <p className="flex items-center gap-1 px-2 pb-1 text-[13px]">
                <ChevronDown className="size-3.5" /> Channels
              </p>
              {["general", "gtm-team", "product", "sales-wins"].map((channel) => (
                <p
                  key={channel}
                  className={cn("flex items-center gap-2 rounded-md px-2 py-[3px]", channel === "gtm-team" && "font-semibold text-white")}
                  style={channel === "gtm-team" ? { backgroundColor: SLACK.active } : undefined}
                >
                  <Hash className="size-3.5 opacity-80" />
                  {channel}
                </p>
              ))}
              <p className="flex items-center gap-1 px-2 pb-1 pt-4 text-[13px]">
                <ChevronDown className="size-3.5" /> Apps
              </p>
              <p className="flex items-center gap-2 rounded-md px-2 py-[3px]">
                <span className="grid size-4 place-items-center rounded bg-[#f4b740] text-[#1a1405]">
                  <Logo className="size-3" />
                </span>
                Scoutly
              </p>
              <p className="flex items-center gap-1 px-2 pb-1 pt-4 text-[13px]">
                <ChevronDown className="size-3.5" /> Direct messages
              </p>
              {SCENARIOS.map((s) => (
                <p key={s.user} className="flex items-center gap-2 rounded-md px-2 py-[3px]">
                  <span className="grid size-4 place-items-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: s.avatar }}>
                    {s.initial}
                  </span>
                  {s.user}
                </p>
              ))}
            </div>
          </div>

          {/* The channel. */}
          <div className="flex min-w-0 flex-1 flex-col" style={{ color: SLACK.text }}>
            <div className="flex h-12 shrink-0 items-center justify-between border-b px-4" style={{ borderColor: SLACK.border }}>
              <span className="flex items-center gap-1 text-[15px] font-bold text-white">
                <Hash className="size-4" aria-hidden="true" />
                gtm-team
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
              <span className="flex items-center gap-3" aria-hidden="true">
                <span className="flex -space-x-1.5">
                  {SCENARIOS.map((s) => (
                    <span key={s.user} className="grid size-5 place-items-center rounded border-2 text-[9px] font-bold text-white" style={{ backgroundColor: s.avatar, borderColor: SLACK.pane }}>
                      {s.initial}
                    </span>
                  ))}
                </span>
                <Headphones className="size-4 text-white/60" />
              </span>
            </div>

            {/* Messages sit at the bottom of the pane, as they do in Slack. */}
            <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-4 pb-2" aria-live="off">
              <AnimatePresence>
                {view.sent && (
                  <motion.div
                    key={`q-${view.scenario}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-2.5 py-2"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: scenario.avatar }}>
                      {scenario.initial}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px]">
                        <span className="font-bold text-white">{scenario.user}</span>
                        <span className="ml-2 text-xs" style={{ color: SLACK.muted }}>
                          10:42 AM
                        </span>
                      </p>
                      <p className="text-[15px] leading-snug">
                        <span style={{ color: SLACK.link }} className="rounded bg-[#1d9bd1]/10 px-0.5">
                          @Scoutly
                        </span>{" "}
                        {scenario.prompt}
                      </p>
                    </div>
                  </motion.div>
                )}

                {view.words > 0 && (
                  <motion.div
                    key={`a-${view.scenario}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-2.5 py-2"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f4b740] text-[#1a1405]">
                      <Logo className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px]">
                        <span className="font-bold text-white">Scoutly</span>
                        <span className="ml-1.5 rounded px-1 py-px text-[10px] font-bold" style={{ backgroundColor: "#2c2d30", color: SLACK.muted }}>
                          APP
                        </span>
                        <span className="ml-2 text-xs" style={{ color: SLACK.muted }}>
                          10:42 AM
                        </span>
                      </p>
                      <p className="text-[15px] leading-snug">{replyWords.slice(0, view.words).join(" ")}</p>

                      <div className="mt-1.5 space-y-1.5">
                        {scenario.matches.slice(0, view.cards).map((match) => (
                          <motion.div
                            key={match.name}
                                    initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-l-4 py-0.5 pl-3"
                            style={{ borderColor: match.bar }}
                          >
                            <p className="flex flex-wrap items-baseline gap-x-2 text-[14px]">
                              <span className="font-bold" style={{ color: SLACK.link }}>
                                {match.name}
                              </span>
                              <span className="text-xs" style={{ color: SLACK.muted }}>
                                {match.meta}
                              </span>
                            </p>
                            <p className="text-[13px] leading-snug">
                              <span className="font-semibold text-white">{match.role}.</span> {match.why}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Composer. */}
            <div className="shrink-0 px-4 pb-1">
              <div className="rounded-lg border" style={{ borderColor: "#565856" }}>
                <div className="flex items-center gap-3 px-3 pt-2 text-white/40" aria-hidden="true">
                  <Bold className="size-3.5" />
                  <Italic className="size-3.5" />
                  <Strikethrough className="size-3.5" />
                  <Link2 className="size-3.5" />
                  <List className="size-3.5" />
                  <Code className="size-3.5" />
                </div>
                <p className="min-h-[2.75rem] px-3 py-2 text-[15px] leading-snug">
                  {view.draft ? (
                    <span className="text-white">
                      {view.draft}
                      <span className="caret ml-px inline-block h-4 w-px translate-y-0.5 bg-white" />
                    </span>
                  ) : (
                    <span style={{ color: SLACK.muted }}>Message #gtm-team</span>
                  )}
                </p>
                <div className="flex items-center justify-between px-2 pb-2 text-white/50" aria-hidden="true">
                  <span className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-white/10">
                      <Plus className="size-3.5" />
                    </span>
                    <AtSign className="size-4" />
                  </span>
                  <span
                    className="grid h-7 w-8 place-items-center rounded transition-colors"
                    style={{ backgroundColor: view.draft ? SLACK.send : "transparent", color: view.draft ? "#fff" : undefined }}
                  >
                    <SendHorizontal className="size-4" />
                  </span>
                </div>
              </div>
              <p className="h-5 pt-0.5 text-xs" style={{ color: SLACK.muted }}>
                {view.typing && (
                  <>
                    <span className="font-bold">Scoutly</span> is typing…
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-3">
        Illustrative conversation. Company names are placeholders.
      </figcaption>
    </figure>
  );
}
