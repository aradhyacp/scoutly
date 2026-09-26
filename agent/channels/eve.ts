import { eveChannel } from "eve/channels/eve";
import { type AuthFn, httpBasic, localDev, vercelOidc } from "eve/channels/auth";

/**
 * Route auth for the agent's HTTP API.
 *
 * eve fails closed: unless one of these entries accepts a request, every
 * /eve/v1/session route returns 401. The walk runs in order, the first entry
 * that accepts wins, and an entry that does not recognise the caller returns
 * null so the walk continues.
 */

const basicPassword = process.env.ROUTE_AUTH_BASIC_PASSWORD;

/**
 * Service access for the enrichment pipeline and for curl against a built
 * server. This is the only entry that authenticates under `eve start`, so it
 * is what makes the API usable outside `eve dev`.
 *
 * Added only when a password is actually configured. Registering it with an
 * empty password would accept an empty password, which is worse than having no
 * entry at all — without it the route simply stays closed.
 */
const serviceAuth: AuthFn<Request>[] = basicPassword
  ? [
      httpBasic({
        username: process.env.ROUTE_AUTH_BASIC_USERNAME ?? "scoutly",
        password: basicPassword,
      }),
    ]
  : [];

export default eveChannel({
  auth: [
    ...serviceAuth,
    // Vercel-to-Vercel callers once this is deployed. Authenticates nothing
    // off-Vercel, so it is inert locally.
    vercelOidc(),
    // Lets `pnpm dev` and its TUI connect with no credential. Keys off the
    // process being an `eve dev` server rather than anything in the request,
    // so it can never open a production deployment.
    localDev(),
  ],
});
