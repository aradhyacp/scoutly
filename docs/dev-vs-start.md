# `eve dev` vs `eve start`

Findings from the eve docs plus a live probe of this project's built server.

## The short version

They are not two ways of doing the same thing.

| | `pnpm dev` (`eve dev`) | `pnpm start` (`eve start`) |
|---|---|---|
| What it runs | Dev server, compiled on the fly | The already-built `.output/` |
| Port | 2000 | 3000 (or `$PORT`) |
| What you get | A terminal chat UI attached to a local server | An HTTP server. No UI |
| Rebuilds on change | Yes | No — serves whatever `eve build` last produced |
| Schedules fire | No | Yes |
| `localDev()` auth | Passes (sets `EVE_DEV=1`) | Fails — it is a production process |

The TUI is not the agent. It is one client of the agent's HTTP API. `eve start`
runs the same agent without shipping a client, which is why it looks like it does
nothing.

## What is actually on :3000

Probed against this project's build:

```
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
200                                    # a static <title>eve</title> placeholder page

$ curl -s http://127.0.0.1:3000/eve/v1/health
{"ok":true,"status":"ready","workflowId":"workflow//eve//workflowEntry"}

$ curl -s -X POST http://127.0.0.1:3000/eve/v1/session \
    -H 'content-type: application/json' -d '{"message":"hi"}'
{"code":"unauthorized","error":"Authorization is required for this route.","ok":false}   # 401
```

So the "simple website" is a placeholder home page served by eve's default
`channels/home.ts`. It is not the product and it is not meant to be used. The
real surface is `/eve/v1`:

- `GET  /eve/v1/health` — public, no auth
- `GET  /eve/v1/info` — inspect the agent
- `POST /eve/v1/session` — create a session, optionally with its first message
- `POST /eve/v1/session/:id` — send a follow-up
- `GET  /eve/v1/session/:id/stream` — NDJSON event stream
- `POST /eve/v1/session/:id/{cancel,clear,compact,reset}`

## Why the 401 — this is the important part

> **Resolved.** `agent/channels/eve.ts` now configures `httpBasic()`, so a
> credentialed caller gets a session from `eve start`. The walk below is why it
> failed before, and why an *un*credentialed caller still gets 401.

With no `agent/channels/eve.ts`, eve uses its default route-auth policy:

```
[vercelOidc(), localDev(), placeholderAuth()]
```

Walked in order for every request to a session route:

1. `vercelOidc()` — no Vercel OIDC bearer token present, skip.
2. `localDev()` — authenticates **only** when the process is `eve dev` (`EVE_DEV=1`)
   or `vercel dev`. `eve start` sets neither, so skip. The docs are explicit that
   this is a property of the deployment, not the request: no header can flip it.
3. `placeholderAuth()` — returns the structured 401 above.

That is eve failing closed on purpose. From the docs: *"eve fails closed by
default: production traffic is rejected unless you configure an authenticator
that accepts it, and anonymous access requires an explicit `none()`."*

So `pnpm dev` works not because dev mode is friendlier, but because `localDev()`
authenticates you. The moment you run the same code as a production process, you
have no auth configured and everything bounces. See
[how-to-make-production-eve.md](./how-to-make-production-eve.md) for fixing that.

## Talking to `eve start` today

Two options while there is no auth configured.

**Attach the TUI to the running server** — `eve dev` with a URL connects the UI
instead of booting its own server:

```sh
pnpm exec eve dev http://localhost:3000
```

**One-shot invocation without the UI:**

```sh
pnpm exec eve invoke --url http://localhost:3000 "how many companies are stored?"
```

Against `eve dev` (:2000) both work with no credential, because `localDev()`
accepts them. Against `eve start` (:3000), pass the basic-auth credentials from
`.env`:

```sh
curl -u "$ROUTE_AUTH_BASIC_USERNAME:$ROUTE_AUTH_BASIC_PASSWORD" \
  -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' -d '{"message":"..."}'
```

## Which to use when

- **`pnpm dev`** — writing and testing tools and instructions. Hot rebuild, full
  trace of tool calls, and `localDev()` means no auth setup.
- **`pnpm build && pnpm start`** — verifying the thing you are about to deploy:
  that it compiles, boots, and that schedules fire. Not for chatting.
- **Neither, for the pipeline.** Enrichment is a backend job. It talks to the
  HTTP API from a script or a trigger.dev task — see
  [how-to-use-trigger.md](./how-to-use-trigger.md).

## For Scoutly specifically

Nothing about this project wants a person typing in a terminal. The agent needs:

1. A **programmatic caller** for enrichment — one session per company, structured
   result back, no human in the loop.
2. A **human surface** for the conversational side (the `custom_query_*` tools) —
   a web chat page, or Slack. The TUI is a developer tool, not that surface.

Both need route auth configured first.
