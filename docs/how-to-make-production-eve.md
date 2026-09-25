# How eve agents are meant to reach real users

The terminal UI is a development tool. Nobody ships it. This is what Vercel
intends instead, from their docs.

## The model: the agent is an HTTP service

Every eve app exposes one stable HTTP API at `/eve/v1`. The TUI, `useEveAgent`,
`curl`, the Client SDK and `eve invoke` are all just clients of it. From the docs:
*"Every running eve app exposes its own API. Each deployment supplies its own
host and authentication policy."*

So "how do users access the agent" is really two questions: **what client**, and
**what auth**.

```
                      ┌─ browser chat (useEveAgent)
                      ├─ Slack / Discord / iMessage (channels)
POST /eve/v1/session ─┼─ your backend (Client SDK)
                      ├─ schedules (no user at all)
                      └─ the TUI (developers only)
```

## The four production surfaces

### 1. A web UI — `useEveAgent`

The default answer for "users should be able to chat with it". A React/Vue/Svelte
hook that opens a durable session, streams the reply, and hands you render-ready
state:

```tsx
"use client";
import { useEveAgent } from "eve/react";

export function Chat() {
  const agent = useEveAgent();
  return (
    <>
      {agent.data.messages.map((m) => <Message key={m.id} {...m} />)}
      <button onClick={() => agent.send("which companies are B2B in Germany?")}>Ask</button>
    </>
  );
}
```

Mount the agent on your app's origin with `withEve` in `next.config.ts` (Nuxt and
SvelteKit have equivalents) and the hook talks to same-origin `/eve/v1/*` routes,
so your existing app cookies authenticate the request. This is the path for
Scoutly's console: the Next.js app the spec already calls for, with a chat panel
beside the table.

### 2. A messaging channel

A channel is an edge adapter that normalizes a platform's input into a user
message and maps a conversation (a Slack thread, say) to a durable session. Slack,
Discord and iMessage ship first-class; browse `eve registry search` for the rest.
For an internal tool this is often the best UX — nobody has to open a new app.

### 3. Backend-to-backend — the Client SDK

No human in the loop. `eve/client` from a script, a cron, a queue worker, or a
trigger.dev task. This is how Scoutly's enrichment runs; see
[how-to-use-trigger.md](./how-to-use-trigger.md).

### 4. Schedules — no user at all

`agent/schedules/*.ts` with a cron expression. On Vercel each becomes a Vercel
Cron Job, evaluated in UTC. Markdown form is fire-and-forget ("task mode"); the
handler form can deliver into a channel. Note task-mode sessions **cannot park**
to wait for a person or an OAuth sign-in.

A weekly re-scrape is a natural fit — and worth weighing against doing the same
thing in trigger.dev, which is the one real overlap between the two systems.

## Auth is the part you cannot skip

eve **fails closed**. With no `agent/channels/eve.ts` the default policy is
`[vercelOidc(), localDev(), placeholderAuth()]`, which rejects all production
traffic — this is exactly the 401 we get from `pnpm start` today.

`placeholderAuth()` exists to return a readable "auth isn't configured yet" 401
instead of an internal error. It is a scaffold marker: replace it before anyone
real sends a request.

Write `agent/channels/eve.ts` with an ordered walk. Each entry accepts (returns a
`SessionAuthContext`), skips (`null`), or rejects (throws):

```ts title="agent/channels/eve.ts"
import { eveChannel } from "eve/channels/eve";
import { localDev, httpBasic } from "eve/channels/auth";

export default eveChannel({
  auth: [
    httpBasic({
      username: "scoutly-pipeline",
      password: process.env.ROUTE_AUTH_BASIC_PASSWORD!,
    }),
    localDev(),
  ],
});
```

The helpers:

| Helper | Use when |
|---|---|
| `localDev()` | Local dev only. Authenticates solely under `eve dev` / `vercel dev`, so it is safe to leave in the walk |
| `vercelOidc()` | Vercel-hosted, Vercel-to-Vercel callers |
| `httpBasic(...)` | Operator or service access via shared credentials |
| `jwtHmac(...)` / `jwtEcdsa(...)` | You mint your own tokens |
| `oidc(...)` | Tokens from an arbitrary OIDC issuer |
| `none()` | Explicitly anonymous — public demos only, never for private data |

For a browser UI backed by your own login, write a custom `AuthFn` that reads
your session cookie and returns a `SessionAuthContext` with the user's id. Put
your own providers ahead of the catch-alls.

## Deploying

```sh
eve link --non-interactive --project scoutly
eve deploy --non-interactive --yes
```

Vercel runs the web service, Workflow (the durable session engine), Sandbox, and
Cron. A string model id routes through the Vercel AI Gateway and authenticates by
project OIDC, so no provider key is needed on that path — but we use OpenRouter
directly via `createOpenRouter`, so `OPENROUTER_API_KEY` has to be in the project
environment, along with `SUPABASE_URL` and any route-auth secret.

For Scoutly the likely shape is a Next.js console with `withEve`, so the console
and the agent deploy as one Vercel project and the browser talks to same-origin
routes.

## What this means for Scoutly, concretely

1. **Write `agent/channels/eve.ts`.** Nothing else can proceed. Basic auth for the
   pipeline caller plus `localDev()` is enough to start.
2. **Deploy.** Get a URL that isn't localhost.
3. **Point the pipeline at it** with the Client SDK.
4. **Add the console** with `withEve` and put `useEveAgent` beside the companies
   table, so the query tools have a human surface.

The TUI stays what it is: how *we* test the agent, not how anyone uses it.
