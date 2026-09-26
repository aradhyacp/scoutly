# What is deployed on trigger.dev, and how to run it

Written after deploying. Nothing has been *run* on trigger.dev yet — the
deployment exists and is configured, but no companies have been processed
through it.

---

## The two deployments

There are two separate things running in two separate places. This is the part
worth being clear about.

| | Where | What it is | What it does |
|---|---|---|---|
| **The eve agent** | **Vercel** — https://scoutly-jade.vercel.app | A durable HTTP service | Researches one company and writes it to Supabase |
| **The pipeline** | **trigger.dev** — `proj_fmeqzxvkvwhxzanmwfxv`, version `20260926.1` | Two background tasks | Queues companies and calls the agent, one per run |

**The eve agent is not deployed to trigger.dev and never should be.** trigger.dev
runs ephemeral task containers with no stable hostname and no persistent volume;
eve needs a long-lived server, two reachable route prefixes (`/eve/` and
`/.well-known/workflow/`), and durable workflow storage. The agent lives on
Vercel. trigger.dev only holds code that *calls* it over HTTP.

The trigger.dev bundle contains exactly:

```
trigger/process-company.ts    the worker task
trigger/seed-companies.ts     the fan-out task
trigger/agent-client.ts       ~120 lines of fetch against /eve/v1
scraper/raw.jsonl             the scraped input, shipped by additionalFiles
```

Nothing from `agent/`, `database/`, or `docs/` is in it. The task deliberately
uses plain `fetch` rather than the `eve/client` SDK so the eve package is not a
dependency of this deployment at all.

---

## What the pipeline does

```
seed-companies  (one run)
      │  reads raw.jsonl, slices it, batchTriggers the slice
      ▼
process-company  ×30   ← queue "enrichment", 3 at a time
      │
      │  POST https://scoutly-jade.vercel.app/eve/v1/session
      │  (basic auth, message = the company row, outputSchema = the result shape)
      ▼
eve agent on Vercel
      │  web_fetch ─► research the company
      │  enrich    ─► check the four rules, upsert if all pass
      ▼
Supabase                        the task never touches the database itself
      │
      ▼
structured result back to the run log
{ stored, status, company_name, source_url, reason }
```

One trigger.dev run is one company is one eve session. That is the unit of
retry, the unit of concurrency, and the unit of observability. A company that
fails a qualification rule comes back `stored: false, status: "rejected"` with
the reason, and the run still finishes **green** — a rejection is a correct
outcome, not an error.

---

## How many companies, and how long

`scraper/raw.jsonl` holds **100 companies**. The deployment is configured to
process them in slices, 30 at a time by default.

Measured against the deployed agent, one company takes **roughly 1 to 4 minutes**
of live web research (76s and 240s on two separate observed runs). At
`ENRICHMENT_CONCURRENCY=3`:

| Slice | Wall clock (rough) |
|---|---|
| 30 companies | 10 – 40 minutes |
| all 100 | 35 – 130 minutes |

The spread is wide because it depends entirely on how many pages the agent has
to fetch for a given company. Concurrency is set to 3 deliberately, to stay
inside OpenRouter's on-demand rate limits — that is the limit you will hit
first, before anything on trigger.dev's side.

---

## Running a slice

### From the dashboard (easiest)

https://cloud.trigger.dev/projects/v3/proj_fmeqzxvkvwhxzanmwfxv/test?environment=prod

Pick **seed-companies**, environment **prod**, and give it a payload:

```json
{ "limit": 30, "offset": 0 }
```

### The next 30

`offset` is how you walk through the file. Each seed run tells you where it
stopped, so you never have to count:

```json
{ "limit": 30, "offset": 0 }    →  companies 1–30    returns nextOffset: 30
{ "limit": 30, "offset": 30 }   →  companies 31–60   returns nextOffset: 60
{ "limit": 30, "offset": 60 }   →  companies 61–90   returns nextOffset: 90
{ "limit": 10, "offset": 90 }   →  companies 91–100  returns remaining: 0
```

The seed run's output carries `total`, `queued`, `nextOffset`, and `remaining`,
so the next payload is always just the previous `nextOffset`.

### Check before committing to a slice

```json
{ "limit": 30, "offset": 30, "dryRun": true }
```

Queues nothing and returns the company names it *would* queue.

### Safe to re-run

Every queued run carries `idempotencyKey: company:<source_url>`. Re-running the
same slice will not queue a company twice or pay for its research twice. The
database upserts on `source_url` as well, so even a genuine re-run updates the
existing row rather than duplicating it.

---

## Configuration

`trigger.config.ts`:

| Setting | Value | Why |
|---|---|---|
| `runtime` | `node-24` | |
| `maxDuration` | 900s | One company can take 4 minutes; 15 gives headroom without letting a wedged run hold a queue slot forever |
| `retries.default.maxAttempts` | 3 | Exponential backoff from 10s |
| `queue.concurrencyLimit` | `ENRICHMENT_CONCURRENCY` (3) | Model rate limits, not trigger.dev, are the constraint |
| `build.extensions` | `additionalFiles(["scraper/raw.jsonl"])` | Ships the input so the seed task can read it without anything running locally |

### Environment variables on trigger.dev

Only four were set, and only what the task genuinely needs:

| Variable | Why the task needs it |
|---|---|
| `EVE_AGENT_URL` | Where to POST sessions |
| `ROUTE_AUTH_BASIC_USERNAME` | Route auth on the agent |
| `ROUTE_AUTH_BASIC_PASSWORD` | Route auth, stored as a **secret** so it cannot be read back |
| `ENRICHMENT_CONCURRENCY` | Queue width |

**Deliberately not given to trigger.dev:**

- `OPENROUTER_API_KEY` — the task never calls a model. The agent does, on Vercel.
- `SUPABASE_URL` — the task never touches the database. The agent does.
- `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` — local tooling only.

The task's only capability is "ask the agent to process one company." It cannot
reach the database or the model provider even if it wanted to, which keeps the
blast radius of this deployment small.

---

## Watching a run

- **Runs list:** https://cloud.trigger.dev — Runs, filtered to `prod`
- Each `process-company` run shows its payload (the company), its logs
  (`Enriching` → `Stored`/`Rejected` with the reason), and its output.
- A failed run retries up to 3 times on its own; one bad company does not stop
  the other 29.

To verify the writes landed, count the rows:

```sql
select count(*) from companies;
select company_name, annual_revenue, is_annual_revenue_estimate
from companies order by updated_at desc limit 10;
```

Expect **fewer rows than companies queued** — that is the gate working. Plenty of
YC companies in this list are over the $200M revenue cap or outside US/Europe,
and those are rejected by design rather than stored with a failure flag.

---

## Redeploying

After changing anything under `trigger/`, or after re-running the scraper and
producing a new `raw.jsonl`:

```sh
pnpm dlx trigger.dev@latest deploy
```

The jsonl is baked into the deployment image, so **a new scrape needs a new
deploy** before the seed task will see the new rows. That is the one real
trade-off of shipping the file rather than passing rows in as payloads.

There is also `scripts/seed.ts` (`pnpm seed --limit 30`) which reads the local
file and queues from your machine. It works, but it needs `TRIGGER_SECRET_KEY`
locally and was the pre-deployment path; the deployed `seed-companies` task is
the one to use now, since it needs nothing running on your laptop.

---

## Status

- [x] eve agent deployed to Vercel, route auth working
- [x] trigger.dev tasks deployed to prod, version `20260926.1`
- [x] `raw.jsonl` (100 companies) shipped into the deployment
- [x] Four environment variables set, password stored as a secret
- [ ] **No slice has been run yet** — the first `seed-companies` trigger is still
      to come
