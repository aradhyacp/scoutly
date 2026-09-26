# Scoutly

Scoutly builds a shortlist of Y Combinator companies that pass a fixed set of
qualification rules. A Python scraper pulls candidates from the YC directory, an
AI agent built on [eve](https://eve.dev) researches each one on the open web,
and only the companies that clear every rule are written to Postgres. A Next.js
console displays the result.

The guiding principle is that the database holds clean, researched, qualified
rows and nothing else. A company that fails a rule is dropped, not stored with a
failure flag.

| Component | Where it runs | Status |
| --- | --- | --- |
| Scraper | Your machine | Writes `scraper/raw.jsonl` |
| eve agent | Vercel, at `https://scoutly-jade.vercel.app` | Live, behind basic auth |
| Enrichment pipeline | trigger.dev | Deployed, run on demand |
| Web console | Vercel, from `web/` | Next.js 16 app |
| Database | Supabase Postgres | Single `companies` table |

## Contents

- [How it works](#how-it-works)
- [Qualification rules](#qualification-rules)
- [Repository layout](#repository-layout)
- [1. Scraper](#1-scraper)
- [2. eve agent](#2-eve-agent)
- [3. Enrichment pipeline](#3-enrichment-pipeline)
- [4. Database](#4-database)
- [5. Web console](#5-web-console)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Further reading](#further-reading)

## How it works

```
YC directory (Algolia index)
        |
        v
Python scraper  --->  scraper/raw.jsonl        (100 candidates)
                            |
                            v
trigger.dev: seed-companies  (slices the file, e.g. 30 at a time)
                            |
                            v
trigger.dev: process-company (one run per company, 3 at a time)
                            |
                            |  POST /eve/v1/session
                            v
eve agent on Vercel
    web_fetch  --->  research the company
    enrich     --->  check every rule, write it if it passes
                            |
                            v
Supabase Postgres (companies)
                            |
                            v
Next.js console  --->  /api routes  --->  browser
```

The same agent has a second, conversational entrypoint. Ask it a question in
plain English and it answers from the database:

```
question  --->  custom_query_generator  --->  query_validator  --->  custom_query_executor  --->  rows
```

| Stage | Input | Output | Runs on |
| --- | --- | --- | --- |
| Scrape | YC's public Algolia index | `raw.jsonl`, one company per line | Local Python |
| Seed | A slice of `raw.jsonl` | One queued run per company | trigger.dev |
| Enrich | One scraped company | A stored row, or a rejection with its reason | eve agent |
| Display | The `companies` table | Companies list and industry breakdown | Next.js on Vercel |

## Qualification rules

A company is stored only if it passes all four.

| Rule | Condition | Checked at |
| --- | --- | --- |
| Region | Headquarters in the United States or Europe | Scrape time, then again during enrichment from what research found |
| Team size | 500 people or fewer | Scrape time, re-checked during enrichment |
| Founded year | 2015 or later | Scrape time (YC batch year), corrected during enrichment |
| Revenue | Under $200,000,000 a year | Enrichment only, since the figure comes from research |

Revenue is never left blank. When no figure is published, the agent estimates
one from team size, stage and funding, and sets `is_annual_revenue_estimate` to
`true` so a reported number can always be told apart from an inferred one.

## Repository layout

```
.
|-- scraper/          Python scraper and its output, raw.jsonl
|-- agent/            The eve agent
|   |-- agent.ts        Model and runtime config
|   |-- instructions.md Identity, rules, schema and the two playbooks
|   |-- tools/          web_fetch, enrich and the three query tools
|   |-- lib/            Qualification rules, schema mirror, database access
|   |-- channels/       Route auth for the agent's HTTP API
|   `-- sandbox.ts      A lightweight sandbox; the agent never uses it
|-- database/         Shared Postgres pool and the schema reference
|-- trigger/          trigger.dev tasks that drive the agent
|-- scripts/          Local seeding script
|-- web/              Next.js console
`-- docs/             Spec and deployment notes
```

## 1. Scraper

`scraper/main.py` reads the public search key from the YC directory page and
queries the `YCCompany_production` Algolia index. No account or API key is
needed.

Filtering happens in two passes. The Algolia query restricts results to the
United States and Europe, and the script then re-checks each record's
location against a country allow-list. When it cannot tell, it keeps the
record and marks it with `location_flagged` for the agent to resolve.

| Setting | Value |
| --- | --- |
| Target records | 100 |
| Page size | 100 hits |
| Maximum pages | 20 |
| Team size | 500 or fewer |
| Founded year | 2015 or later, from the YC batch |
| Output | `scraper/raw.jsonl` |

The output is JSON Lines rather than CSV. It keeps types intact (`team_size` as
an integer, `location_flagged` as a boolean), survives long free-text
descriptions without quoting problems, and hands the pipeline one record per
line.

| Field | Type | Notes |
| --- | --- | --- |
| `company_name` | string | |
| `source_url` | string | YC profile URL, the natural key everywhere downstream |
| `country_or_location` | string | Every listed location, separated by semicolons |
| `batch` | string | For example `Summer 2017` |
| `founded_year` | integer | Parsed from `batch` |
| `team_size` | integer | |
| `industry` | string | |
| `description` | string | |
| `location_flagged` | boolean | Review signal only, not stored |

```bash
pip install -r scraper/requirements.txt
pnpm scrape
```

## 2. eve agent

The agent in `agent/` is where the research happens. A plain script could copy
rows into a database, but it could not decide what to look up, read the
results, and judge whether a company qualifies. That is the agent's job.

### Tools

| Tool | Kind | What it does |
| --- | --- | --- |
| `web_fetch` | eve built-in, re-described | Fetches pages to research a company. Its description is the research brief: which facts to find and the best source for each |
| `enrich` | Authored | Enforces all four rules, normalises the researched values, and upserts the company. The only write path in the agent |
| `custom_query_generator` | Authored | Turns a question into parameterised SQL against `companies` |
| `query_validator` | Authored | Rejects anything that is not a single read-only `SELECT` on `companies` |
| `custom_query_executor` | Authored | Runs the validated query inside a read-only transaction |

The eve defaults for shell access and file writes are switched off
(`defaultTools: false`), so these five are the agent's entire tool surface.

### Two paths

| Path | Triggered by | Tools used |
| --- | --- | --- |
| Enrichment | A scraped company handed over by the pipeline | `web_fetch`, then `enrich` |
| Conversation | A person asking a question | `custom_query_generator`, `query_validator`, `custom_query_executor`, always in that order |

The query tools never run during enrichment, and `enrich` never runs during a
conversation.

### Safety of the query path

Two independent barriers stand between a question and the data:

1. `query_validator` strips string literals and comments, then blocks write and
   administrative keywords, stacked statements, and any table other than
   `companies`.
2. `custom_query_executor` runs inside `BEGIN READ ONLY` with a 10 second
   statement timeout, so Postgres itself refuses a write even if one were to
   slip past the validator.

### Route auth

eve rejects every session request unless an authenticator in the channel
accepts it. `agent/channels/eve.ts` walks these in order:

| Entry | Accepts | When |
| --- | --- | --- |
| `httpBasic()` | The pipeline and any scripted caller | Only registered when `ROUTE_AUTH_BASIC_PASSWORD` is set, so an unconfigured deployment stays closed instead of accepting an empty password |
| `vercelOidc()` | Vercel-to-Vercel callers | On Vercel |
| `localDev()` | `pnpm dev` and its terminal UI | Only inside an `eve dev` process |

### Talking to the agent

The HTTP API is asynchronous. Creating a session returns `202` with a
`sessionId`, and the reply arrives on that session's event stream.

```bash
# Start a turn
curl -u "$ROUTE_AUTH_BASIC_USERNAME:$ROUTE_AUTH_BASIC_PASSWORD" \
  -X POST https://scoutly-jade.vercel.app/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Which Healthcare companies are B2C?"}'

# Read the reply (look for message.completed)
curl -u "$ROUTE_AUTH_BASIC_USERNAME:$ROUTE_AUTH_BASIC_PASSWORD" \
  "https://scoutly-jade.vercel.app/eve/v1/session/<sessionId>/stream?startIndex=0"
```

For local work, `pnpm dev` opens eve's terminal UI with no credentials needed.

## 3. Enrichment pipeline

The pipeline in `trigger/` runs on trigger.dev and calls the deployed agent over
HTTP. The two platforms split the work cleanly: the agent owns one company at a
time, and trigger.dev owns queueing, concurrency, retries and the run log.

| Task | Does | Payload |
| --- | --- | --- |
| `seed-companies` | Reads a slice of `raw.jsonl` and queues one run per company | `{ "limit": 30, "offset": 0, "dryRun": false }` |
| `process-company` | Sends one company to the agent and returns its structured result | One `raw.jsonl` record |

Each run asks the agent for a typed result through an output schema, so the
pipeline gets data back rather than prose:

```json
{ "stored": false, "status": "rejected", "company_name": "...", "source_url": "...", "reason": "..." }
```

A rejection finishes as a successful run. Failing a qualification rule is a
correct outcome, and the reason stays in the run log.

| Setting | Value | Why |
| --- | --- | --- |
| Runtime | Node 24 | |
| Max duration | 900 seconds | One company takes roughly 1 to 4 minutes of live research |
| Retries | 3 attempts, exponential backoff | A transient failure retries that company alone |
| Concurrency | `ENRICHMENT_CONCURRENCY`, default 3 | Kept low to stay within model rate limits |
| Bundled data | `scraper/raw.jsonl` | So a batch can start with nothing running locally |

The task uses plain `fetch` against the agent's API rather than the eve SDK, so
none of the agent's code or dependencies ship to trigger.dev.

### Processing in slices

Start `seed-companies` from the trigger.dev dashboard and walk through the file
with `offset`. Each run returns `nextOffset`, so the next payload is always the
previous result.

| Payload | Companies |
| --- | --- |
| `{ "limit": 30, "offset": 0 }` | 1 to 30 |
| `{ "limit": 30, "offset": 30 }` | 31 to 60 |
| `{ "limit": 30, "offset": 60 }` | 61 to 90 |
| `{ "limit": 10, "offset": 90 }` | 91 to 100 |

Add `"dryRun": true` to list what a slice would queue without queueing it.
Every run carries an idempotency key built from `source_url`, so re-running a
slice never pays for the same research twice.

## 4. Database

A single Supabase Postgres table, `companies`.

| Column | Type | Source |
| --- | --- | --- |
| `id` | `uuid`, primary key | Generated |
| `company_name` | `text` | Scraper |
| `source_url` | `text`, unique | Scraper |
| `country_or_location` | `text` | Scraper, resolved by the agent when it names no country |
| `team_size` | `integer` | Scraper |
| `industry` | `text` | Scraper |
| `description` | `text` | Scraper |
| `batch` | `text` | Scraper |
| `is_b2b` | `boolean` | Agent |
| `is_b2c` | `boolean` | Agent |
| `funding_rounds` | `text[]` | Agent, one JSON-encoded round per element |
| `annual_revenue` | `numeric` | Agent |
| `is_annual_revenue_estimate` | `boolean`, default `false` | Agent |
| `founded_year` | `integer` | Scraper, confirmed or corrected by the agent |
| `created_at` | `timestamptz` | Generated |
| `updated_at` | `timestamptz` | Generated |

Rows are upserted on `source_url`, so processing a company again updates its
row instead of duplicating it.

## 5. Web console

The console in `web/` is a Next.js 16 app with two pages.

| Page | Shows |
| --- | --- |
| `/` Companies | A shader hero with the live company count, then every stored company with name search, region, industry, B2B/B2C filters and sorting. Selecting a company opens its full record, including funding history |
| `/industries` Industries | A donut chart of companies per industry with the breakdown list beside it. Selecting a slice or a row lists that industry's companies |

### The browser never touches the database

Pages fetch from the console's own Route Handlers, and only those query
Postgres.

| Route | Returns |
| --- | --- |
| `GET /api/companies` | Every stored company |
| `GET /api/companies?industry=Fintech` | Companies in one industry |
| `GET /api/industries` | Company count per industry, and the total |

The database module is marked `server-only`, so importing it from a client
component fails the build. Neither the connection string nor the `pg` driver
appears in any client bundle.

### Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui primitives on Radix |
| Effects | reactbits Threads (hero shader) and CountUp, aceternity expandable card pattern |
| Chart | Hand-built SVG donut with `d3-shape` |
| Data fetching | SWR against the console's own API |
| Database | `pg`, server-side only |

### Design notes

- One dark theme, with every text and surface pairing measured to pass WCAG AA.
- Each industry keeps one colour everywhere, and the chart palette was checked
  for colour-blind separation on the actual background.
- Estimated revenue is drawn differently from reported revenue (`~$20M` against
  `$93.1M`), because presenting an estimate as fact would mislead.
- The shader freezes to a still frame and animations stop when the operating
  system asks for reduced motion.
- Every loading state has a skeleton, and every list has an empty state.

## Running locally

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 24 |
| pnpm | 11 |
| Python | 3.12 |
| A Supabase project | With the `companies` table from the schema above |
| An OpenRouter API key | For the agent's model |

### Steps

```bash
# 1. Install dependencies
pnpm install
cd web && pnpm install && cd ..
pip install -r scraper/requirements.txt

# 2. Configure the environment (see the next section)
cp .env.example .env
cp web/.env.example web/.env.local

# 3. Scrape the candidates
pnpm scrape

# 4. Run the agent locally and chat with it in the terminal
pnpm dev

# 5. Run the console at http://localhost:3000
pnpm web
```

To run enrichment against your local files instead of the deployed task,
start a trigger.dev worker with `pnpm trigger:dev` and queue companies with
`pnpm seed --limit 3`. `pnpm seed --dry-run` shows what would be queued.

## Environment variables

Each component gets only the variables it needs.

| Variable | Agent | trigger.dev | Console | Purpose |
| --- | :---: | :---: | :---: | --- |
| `OPENROUTER_API_KEY` | Yes | | | The agent's model provider |
| `SUPABASE_URL` | Yes | | Yes | Postgres connection string |
| `ROUTE_AUTH_BASIC_USERNAME` | Yes | Yes | | Basic auth for the agent's API |
| `ROUTE_AUTH_BASIC_PASSWORD` | Yes | Yes | | Basic auth for the agent's API. Stored as a secret on trigger.dev |
| `EVE_AGENT_URL` | | Yes | | Where the pipeline sends sessions |
| `ENRICHMENT_CONCURRENCY` | | Yes | | How many companies are researched at once |
| `TRIGGER_PROJECT_REF` | | | | trigger.dev project, for local tooling |
| `TRIGGER_SECRET_KEY` | | | | trigger.dev key, only for `pnpm seed` |

trigger.dev never receives the model key or the database URL. Its tasks only
ask the agent to process a company, so they cannot reach either service
directly.

Use the Supabase Supavisor pooler connection string, not the direct
`db.<ref>.supabase.co` host, which is IPv6-only. The username takes the form
`postgres.<project-ref>`. Transaction mode (port 6543) suits the console's
serverless functions best.

## Deployment

| Component | Platform | Command |
| --- | --- | --- |
| eve agent | Vercel | `pnpm run deploy` (bare `pnpm deploy` is a built-in pnpm command) |
| Enrichment tasks | trigger.dev | `pnpm trigger:deploy` |
| Web console | Vercel | A separate project with its Root Directory set to `web` |

Set each component's variables from the table above in its own platform. The
scraped file is bundled into the trigger.dev deployment, so a fresh scrape needs
a fresh `pnpm trigger:deploy` before `seed-companies` can see the new rows.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm scrape` | Runs the scraper and writes `scraper/raw.jsonl` |
| `pnpm dev` | Starts the agent with eve's terminal UI |
| `pnpm build` | Builds the agent |
| `pnpm start` | Serves the built agent |
| `pnpm run deploy` | Deploys the agent to Vercel. Needs `run`, because `pnpm deploy` is a pnpm built-in |
| `pnpm typecheck` | Type-checks the agent, pipeline and scripts |
| `pnpm web` | Starts the console in development |
| `pnpm web:build` | Builds the console |
| `pnpm seed` | Queues companies from the local `raw.jsonl` |
| `pnpm trigger:dev` | Runs a local trigger.dev worker |
| `pnpm trigger:deploy` | Deploys the tasks to trigger.dev |

## Further reading

| Document | Covers |
| --- | --- |
| [`docs/SPEC.md`](docs/SPEC.md) | The full project specification |
| [`docs/what-how-trigger-is-working.md`](docs/what-how-trigger-is-working.md) | What is deployed on trigger.dev and how to run it |
| [`docs/how-to-use-trigger.md`](docs/how-to-use-trigger.md) | Why the pipeline is split between trigger.dev and eve |
| [`docs/invoke-eve-trigger.md`](docs/invoke-eve-trigger.md) | Why the pipeline calls the API instead of looping `eve invoke` |
| [`docs/dev-vs-start.md`](docs/dev-vs-start.md) | How `eve dev` and `eve start` differ, and why auth is required |
| [`docs/how-to-make-production-eve.md`](docs/how-to-make-production-eve.md) | How eve agents reach real users in production |
