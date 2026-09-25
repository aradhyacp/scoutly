# Putting the eve agent behind trigger.dev

Findings on how a headless, no-user-input enrichment pipeline maps onto
trigger.dev, and what each system is actually responsible for.

## The division of labour

The confusion worth clearing up first: **trigger.dev and eve are not
alternatives.** They solve different halves of this problem.

| | Owns |
|---|---|
| **eve** | One company. Research it, decide, write it. Durable *within* a turn — tool steps are journaled and replayed |
| **trigger.dev** | The other 99 companies. Queueing, concurrency, per-company retries, scheduling, observability across the whole run |

eve has no batch runner and no queue. trigger.dev has no idea how to talk to a
model. So: **trigger.dev calls eve over HTTP, once per company.**

```
raw.jsonl ──► seed task ──► batchTrigger 100 runs
                                  │
                          ┌───────┴───────┐  (concurrency-limited queue)
                          ▼               ▼
                   processCompany   processCompany   …
                          │
                    POST /eve/v1/session   ← the deployed eve agent
                          │
                    web_fetch → enrich → Supabase
```

Each trigger.dev run is one company and one eve session. That is the unit of
retry, the unit of concurrency, and the unit of observability.

## Why one session per company, not one session for all 100

Tempting to open one session and feed it 100 companies. Don't:

- **Context.** 100 companies × several fetched pages will blow past the window.
  Compaction would start throwing away earlier research mid-run.
- **Blast radius.** One failure kills the whole run. Separate sessions mean one
  bad company fails alone and retries alone.
- **Cross-contamination.** Company 60's research sitting in context while the
  agent reasons about company 61 is a correctness risk, not just a cost one.
- **Concurrency.** Separate sessions run in parallel. One session is serial.

Sessions are cheap — a `POST /eve/v1/session` with the message included creates
and starts in one request.

## The task

Two tasks: a seed task that reads the file and fans out, and a worker task that
handles exactly one company.

```ts title="trigger/process-company.ts"
import { task, queue } from "@trigger.dev/sdk";
import { Client } from "eve/client";
import { z } from "zod";

// Concurrency lives here, not in eve. Tune it against your model rate limits
// and Supabase connection ceiling.
export const enrichmentQueue = queue({
  name: "enrichment",
  concurrencyLimit: 5,
});

const resultSchema = z.object({
  stored: z.boolean(),
  status: z.enum(["inserted", "updated", "rejected"]),
  reason: z.string(),
});

export const processCompany = task({
  id: "process-company",
  queue: enrichmentQueue,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 2_000 },
  maxDuration: 600, // research can be slow; give it room
  run: async (company: Record<string, unknown>) => {
    const client = new Client({
      host: process.env.EVE_AGENT_URL!,
      auth: { bearer: async () => process.env.EVE_AGENT_TOKEN! },
    });

    const { response } = await client.sessions.create({
      message: [
        "Process this scraped company: research it, then call enrich exactly once.",
        "",
        JSON.stringify(company),
      ].join("\n"),
      outputSchema: resultSchema,
      // Create-once semantics: a trigger.dev retry that re-sends the same
      // operationId returns the existing session instead of re-running research.
      operationId: `company:${company.source_url}`,
    });

    const result = await response.result();
    if (!result.data) throw new Error("agent returned no structured result");

    return result.data;
  },
});
```

```ts title="trigger/seed.ts"
import { task, tasks } from "@trigger.dev/sdk";
import { readFile } from "node:fs/promises";
import type { processCompany } from "./process-company";

export const seedPipeline = task({
  id: "seed-pipeline",
  run: async () => {
    const raw = await readFile("scraper/raw.jsonl", "utf8");
    const companies = raw.trim().split("\n").map((line) => JSON.parse(line));

    const batch = await tasks.batchTrigger<typeof processCompany>(
      "process-company",
      companies.map((payload) => ({
        payload,
        options: { idempotencyKey: `company:${payload.source_url}` },
      })),
    );

    return { queued: companies.length, batchId: batch.batchId };
  },
});
```

Notes on that code:

- **`outputSchema`** is what makes this a pipeline rather than a chat. eve forces
  the model to satisfy the schema before the turn settles and emits it as
  `result.completed`; `result.data` is typed. Without it you get prose and have to
  parse English to find out whether the row was written.
- **`idempotencyKey`** on the trigger side stops a re-run of the seed task from
  queueing the same company twice. **`operationId`** on the eve side stops a
  trigger.dev retry from redoing the research. `source_url` is the natural key in
  both places, same as in the database.
- **`operationId` caveat:** the docs document it on the HTTP create route, and
  note that **anonymous callers cannot use it** — the task must be authenticated
  for it to apply. I did not confirm it is surfaced by `client.sessions.create()`
  specifically; if it isn't, send the create request with `fetch` or drop it and
  lean on `idempotencyKey` alone.
- **Queue concurrency** must be declared in code before deploy in v4. 5 is a
  starting guess — it is bounded by model rate limits and by how many Postgres
  connections your Supabase plan allows, since every concurrent run holds one.
- **Batch limits:** up to 1,000 runs per batch and 10MB per payload, so ~100
  companies with a long `description` each is comfortably inside both.

## Where `raw.jsonl` lives

The seed task above reads the repo file, which works only if the file is bundled
into the deploy. Two cleaner options:

1. **Pass the rows in.** Trigger the seed task with the parsed array as its
   payload — fine at 100 rows, and it keeps the file on the machine that scraped it.
2. **Put the scrape in the pipeline.** A `scheduledTask` that runs the scraper
   (or an HTTP call to it) and then fans out. This is where trigger.dev earns its
   keep: `schedules.task` with a cron gives you a weekly refresh of the whole
   directory for free.

## What you get that a plain `for` loop doesn't

A bare script over 100 rows would work. What trigger.dev adds:

- **Per-company retries with backoff**, without the script tracking which ones
  failed.
- **Bounded concurrency** with a real queue rather than a hand-rolled semaphore.
- **Resumability.** Kill it at company 50 and the remaining runs are still queued.
- **A run log per company** — payload, result, error, duration, retries — instead
  of grepping stdout.
- **Scheduling**, for re-running the directory on a cadence.

## What has to exist first

1. **The agent deployed somewhere with a URL.** `eve deploy` to Vercel. A
   trigger.dev task cannot reach `localhost`.
2. **Route auth configured.** Right now every `POST /eve/v1/session` returns 401 —
   see [dev-vs-start.md](./dev-vs-start.md). The task needs a credential eve
   accepts; `httpBasic()` or `jwtHmac()` is the least ceremony for a
   service-to-service caller.
3. **`EVE_AGENT_URL` and `EVE_AGENT_TOKEN`** in the trigger.dev environment.

## The honest caveat

This is the design the two frameworks' documented surfaces support; it is not
something running in this repo yet. Nothing here has been executed end to end —
no trigger.dev project is set up and the agent is not deployed. Treat the code as
the shape to build, not as tested code.
