# Scoutly

Scoutly is a lead-qualification pipeline over the Y Combinator company directory.
It scrapes companies, researches each one with an AI agent, and keeps only the
ones that qualify — so the database holds clean, enriched, gold-standard rows and
nothing else.

Full detail lives in `docs/SPEC.md`. This file is the overview.

## What it does

1. **Scrape** — a Python script (`scraper/main.py`) pulls ~100 companies from YC's
   public Algolia index into `raw.jsonl`, already filtered to US/Europe, team size
   under 500, and founded 2015 or later.
2. **Enrich** — a runner feeds `raw.jsonl` to the eve agent one record at a time. The
   agent researches the company on the web and returns normalized fields:
   `is_b2b`, `is_b2c`, `funding_rounds`, `annual_revenue`, `founded_year`.
3. **Gate** — revenue must be under $200M USD. This is the one rule that can only
   be checked after research. A company that fails is dropped, not flagged.
4. **Store** — a plain script upserts the finished record into Supabase on
   `source_url`. No agent or tool call is involved in the write; the record is
   already in final shape.
5. **Display** — a Next.js console on Vercel lists the companies with search and
   filters, plus a pie chart of companies by industry.

The agent is also conversational: ask it about a company in plain English and it
generates SQL, validates it as read-only, and runs it against Supabase.

## The agent

Built with **eve** (Vercel's framework for durable backend AI agents). An agent is
a directory of files under `agent/`, which eve compiles and runs.

- `web_search` (eve built-in) — research a company
- `enrich` — normalize findings to the standard schema
- `customQueryGenerator` / `queryValidator` / `customQueryExecutor` — the
  natural-language query path; the validator rejects anything destructive
  (`DELETE`, `DROP`, `ALTER`, `UPDATE`, `TRUNCATE`, multi-statement input)

The query tools run only when a person is talking to the agent, never during
ingestion.

## Working in this repo

- Agent identity, purpose, and tone live in `agent/instructions.md`. Editing that
  is a content change — no framework docs needed. Leave `agent/agent.ts` (model
  selection) alone unless asked.
- Before writing agent code, read the eve docs: `ls node_modules/eve/docs`, start
  at `docs/README.md`, which routes each task to its page. Read that one page;
  don't crawl the tree. If the package docs are missing, use https://eve.dev/docs.
- When a task names an external product, check the registry before hand-rolling an
  integration: `eve registry search <query> --json`, then
  `eve add <item> --non-interactive`. Prefer `implementation: native` items.
- Vercel operations go through eve: `eve link --non-interactive --project <name>`
  and `eve deploy --non-interactive --yes`.
- `pnpm scrape` runs the Python scraper. `pnpm typecheck` checks the TypeScript.
