import "server-only";

import pg from "pg";

/**
 * The console's only connection to Postgres.
 *
 * `server-only` makes the build fail if a client component ever imports this
 * module, so the browser cannot reach the database even by accident — every
 * read goes through a Route Handler.
 *
 * Sized for serverless: each Vercel function instance holds its own pool, so
 * the real connection count is `max` times the number of warm instances. The
 * console only ever runs one query per request, so a small pool is plenty.
 */

declare global {
  // Survives hot reloads in development, where modules are re-evaluated on
  // every change and would otherwise leak a new pool each time.
  var __scoutlyPool: pg.Pool | undefined;
}

function createPool(): pg.Pool {
  const connectionString = process.env.SUPABASE_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }

  const pool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  // A pooled client can be dropped by Supavisor between requests. Without a
  // listener `pg` escalates that into an uncaught exception.
  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });

  return pool;
}

export function getPool(): pg.Pool {
  globalThis.__scoutlyPool ??= createPool();
  return globalThis.__scoutlyPool;
}
