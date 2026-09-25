# Can we loop `eve invoke` inside trigger.dev?

The idea: a trigger.dev task loops 100 times and shells out to
`eve invoke "process company X"` each time.

**Verdict: it works as a shell loop on a dev machine or in CI. It is the wrong
tool inside a trigger.dev task, and the Client SDK does the same job natively.**

## What `eve invoke` actually is

A CLI command that submits one turn without opening the TUI, printing JSON when
the turn completes or blocks:

```sh
eve invoke "Summarize station telemetry"
eve invoke --url https://scoutly.vercel.app "process company X"
eve invoke --json-schema            # print the result schema
```

| Option | Meaning |
|---|---|
| `[prompt]` | The turn's message |
| `-u, --url` | Invoke a server that is already running, instead of a local one |
| `-H, --header` | Request header for a URL target, repeatable |
| `--resume` | Read a previous resumable result from stdin and continue |
| `--scope` | Vercel team owning the URL target |

Exit codes: `0` done, `3` paused (blocking input or authorization), `1` failed.

So `eve invoke --url <deployed agent>` genuinely is a one-shot, scriptable,
headless call. The idea is sound. The problem is the packaging.

## Why not inside trigger.dev

**1. The binary isn't there.** A trigger.dev task runs your bundled TypeScript in
their container. `eve` is a CLI from your `devDependencies`. You would be adding
the eve package to a deployed image and shelling out to `node_modules/.bin/eve`
through a build extension — a lot of machinery to end up making an HTTP request.

**2. Subprocess instead of a function call.** `child_process` + JSON parsing +
exit-code branching, where the SDK gives you a typed object and a thrown error.

**3. You lose the structured result.** `eve invoke` has no `--output-schema`
flag. You get the printed result envelope, not a turn-scoped `outputSchema`
forcing the model into `{stored, status, reason}`. That schema is the thing that
makes the pipeline checkable rather than prose-parsing.

**4. No idempotency handle.** The SDK path passes `operationId` for create-once
semantics, so a trigger.dev retry re-attaches instead of re-researching.
`eve invoke` gives you no way to set it.

**5. Retry semantics fight each other.** `eve invoke` exits `3` when the turn
parks. Inside a task you would translate that into a trigger.dev retry, which
re-runs the whole command from scratch. The SDK's session handle just resumes.

## The equivalent, natively

```ts
const client = new Client({ host: process.env.EVE_AGENT_URL! });
const { response } = await client.sessions.create({
  message: prompt,
  outputSchema,                       // ← not available via eve invoke
  operationId: `company:${sourceUrl}`,// ← not available via eve invoke
});
const result = await response.result();
```

Same HTTP API the CLI calls, typed, in-process, with the two options that matter.

## And the loop itself

Even setting the CLI aside, **don't loop inside one task.** A 100-iteration loop
in a single run is one retry unit, one concurrency slot, one log, and one
`maxDuration` covering all 100 companies. Fan out instead — `batchTrigger` with
one run per company, which is what [how-to-use-trigger.md](./how-to-use-trigger.md)
describes. That is the entire reason to bring in trigger.dev.

## Where `eve invoke` *is* the right tool

Genuinely useful, just not here:

```sh
# Smoke-test a deployment from the terminal
eve invoke --url https://scoutly.vercel.app "how many companies are stored?"

# A local backfill over the scraped file, no infrastructure at all
while read -r line; do
  eve invoke --url http://localhost:2000 "Process this company: $line"
done < scraper/raw.jsonl

# In CI, after deploying, assert the agent answers
eve invoke --url "$DEPLOY_URL" "health check" || exit 1
```

That middle one is a perfectly reasonable way to run the pipeline once by hand
before any of the trigger.dev work exists — serial and slow, but it needs nothing
beyond the CLI you already have. Worth doing first to prove the agent works
end to end on real rows.

## Summary

| | `eve invoke` loop in trigger.dev | `batchTrigger` + Client SDK |
|---|---|---|
| Runs in a task container | Needs the CLI shipped in | Plain import |
| Structured result | No | Yes, via `outputSchema` |
| Idempotent on retry | No | Yes, via `operationId` |
| Per-company retry | No — one loop, one unit | Yes |
| Concurrency | Serial | Queue-controlled |
| Observability | One log for 100 companies | One run per company |

Use `eve invoke` from your shell. Use the Client SDK from trigger.dev.
