import pg from "pg";

const { Pool } = pg;

/**
 * Shared Postgres pool.
 *
 * Sized for serverless: on Vercel every function instance gets its own pool, so
 * the effective connection count is `max` x instances, not `max`. Keeping max
 * small is what stops a fan-out (many companies enriched at once, each waking
 * another instance) from exhausting Supabase's pooler client limit. The agent
 * runs one query at a time per turn, so it never needs a deep pool.
 *
 * Idle connections are dropped quickly for the same reason: a frozen instance
 * should not keep holding a slot it is not using.
 */
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL!,
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

// A pooled client can be dropped by Supavisor or the network between checkouts.
// Without a listener, `pg` escalates that to an uncaught exception and takes the
// process down; pg replaces the dead client on the next checkout.
pool.on("error", (error) => {
  console.error("[db] idle client error", error);
});

export default pool;
